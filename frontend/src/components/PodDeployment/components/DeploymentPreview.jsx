import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Alert,
  Button,
  Tabs,
  Tab,
  Divider,
  List,
  ListItem,
  ListItemText,
  IconButton
} from '@mui/material';
import Editor from '@monaco-editor/react';
import { useAppTranslation } from '../../../hooks/useAppTranslation';
import { useSnackbar } from 'notistack';
import yaml from 'js-yaml';
import {
  Code as CodeIcon,
  Visibility as VisibilityIcon,
  Save as SaveIcon 
} from '@mui/icons-material';

const PLACEHOLDER_CATEGORIES = {
  basic: ['name', 'namespace', 'version'],
  image: ['repository', 'repository_port', 'tag'],
  service: ['service_port', 'target_service_port', 'node_port', 'web_port'],
  resources: ['cpu_limit', 'memory_limit', 'cpu_request', 'memory_request'],
  deployment: ['replica_count'],
  node: ['node_selector', 'site_node'],
  misc: ['company_name']
};

const CONFIG_SECTIONS = {
  basic: {
    title: 'Basic Configuration',
    fields: ['name', 'namespace', 'version']
  },
  resources: {
    title: 'Resource Configuration',
    fields: ['cpu', 'memory', 'storage']
  },
  affinity: {
    title: 'Affinity Rules',
    fields: ['nodeAffinity', 'podAffinity', 'podAntiAffinity']
  },
  volumes: {
    title: 'Volume Configuration',
    fields: ['persistentVolumes', 'configMapVolumes', 'secretVolumes']
  },
  configMaps: {
    title: 'ConfigMaps',
    fields: ['data', 'binaryData']
  },
  secrets: {
    title: 'Secrets',
    fields: ['data']
  }
};

const DeploymentPreview = ({ config, onDeploy, onBack }) => {
  const { t } = useAppTranslation();
  const { enqueueSnackbar } = useSnackbar();
  const [showYaml, setShowYaml] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('summary');
  const [selectedYamlFile, setSelectedYamlFile] = useState(null);

  const getPlaceholderCategory = (placeholder) => {
    for (const [category, items] of Object.entries(PLACEHOLDER_CATEGORIES)) {
      if (items.some(item => placeholder.toLowerCase().includes(item))) {
        return category;
      }
    }
    return 'misc';
  };

  const generateYamlPreview = () => {
    if (!config.yamlTemplate?.content) return '';

    let preview = config.yamlTemplate.content;
    Object.entries(config.yamlTemplate.placeholders || {}).forEach(([key, value]) => {
      const regex = new RegExp(`\\$\\{${key}\\}`, 'gi');
      preview = preview.replace(regex, value || '');
    });
    return preview;
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setSaveError(null);

      const yamlContent = generateYamlPreview();
      
      // Validate YAML format
      try {
        yaml.load(yamlContent);
      } catch (yamlError) {
        throw new Error(`Invalid YAML format: ${yamlError.message}`);
      }

      const fileName = `${config.name}-${config.version}-final.yaml`;

      const response = await fetch(`/api/deployment-templates/${config.name}/save-final`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          content: yamlContent,
          fileName: fileName
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save configuration');
      }

      enqueueSnackbar(t('podDeployment:podDeployment.preview.saveSuccess'), {
        variant: 'success'
      });

    } catch (error) {
      console.error('Failed to save configuration:', error);
      setSaveError(error.message);
      enqueueSnackbar(t('podDeployment:podDeployment.preview.saveError'), {
        variant: 'error'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const renderPlaceholdersByCategory = () => {
    const categorizedPlaceholders = {};
    
    Object.entries(config.yamlTemplate?.placeholders || {}).forEach(([key, value]) => {
      const category = getPlaceholderCategory(key);
      if (!categorizedPlaceholders[category]) {
        categorizedPlaceholders[category] = [];
      }
      categorizedPlaceholders[category].push({ key, value });
    });

    return (
      <Grid container spacing={3}>
        {Object.entries(categorizedPlaceholders).map(([category, placeholders]) => (
          <Grid item xs={12} md={6} key={category}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                {t(`podDeployment:podDeployment.preview.categories.${category}`)}
              </Typography>
              {placeholders.map(({ key, value }) => (
                <Box key={key} sx={{ mt: 2 }}>
                  <Typography variant="subtitle2">{key}</Typography>
                  <Typography>{value || '-'}</Typography>
                </Box>
              ))}
            </Paper>
          </Grid>
        ))}
      </Grid>
    );
  };

  const generateConfigFiles = () => {
    const files = {};

    // 只有在有必要的配置時才生成相應的文件
    const deploymentYaml = generateDeploymentYaml();
    if (deploymentYaml) {
      files['deployment.yaml'] = deploymentYaml;
    }

    if (config.service) {
      files['service.yaml'] = generateServiceYaml();
    }

    if (config.configMaps?.length > 0) {
      files['configmap.yaml'] = generateConfigMapYaml();
    }

    if (config.secrets?.length > 0) {
      files['secret.yaml'] = generateSecretYaml();
    }

    if (config.volumes?.length > 0) {
      files['volumes.yaml'] = generateVolumeYaml();
    }

    return files;
  };

  const generateDeploymentYaml = () => {
    // 檢查必要的配置是否存在
    if (!config || !config.name) {
      console.warn('Missing required configuration');
      return '';
    }

    // 基本部署配置
    const deployment = {
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      metadata: {
        name: config.name,
        namespace: config.namespace || 'default'
      },
      spec: {
        replicas: config.replicas || 1,
        selector: {
          matchLabels: {
            app: config.name
          }
        },
        template: {
          metadata: {
            labels: {
              app: config.name
            }
          },
          spec: {
            containers: [{
              name: config.name,
              // 安全地訪問 image 配置
              image: config.image ? `${config.image.repository || ''}:${config.image.tag || 'latest'}` : '',
              resources: config.resources || {}
            }]
          }
        }
      }
    };

    // 有條件地添加其他配置
    if (config.affinity) {
      deployment.spec.template.spec.affinity = config.affinity;
    }

    if (config.volumes?.length > 0) {
      deployment.spec.template.spec.volumes = config.volumes;
    }

    if (config.configMaps?.length > 0) {
      if (!deployment.spec.template.spec.volumes) {
        deployment.spec.template.spec.volumes = [];
      }
      config.configMaps.forEach(cm => {
        deployment.spec.template.spec.volumes.push({
          name: `${cm.name}-volume`,
          configMap: {
            name: cm.name
          }
        });
      });
    }

    try {
      return yaml.dump(deployment);
    } catch (error) {
      console.error('Failed to generate deployment YAML:', error);
      return '';
    }
  };

  return (
    <Box>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          <Tab label="Summary" value="summary" />
          <Tab label="YAML Files" value="yaml" />
        </Tabs>
      </Box>

      {activeTab === 'summary' && (
        <>
          {renderPlaceholdersByCategory()}
          
          <Box sx={{ mt: 4 }}>
            <Typography variant="h6" gutterBottom>
              Configuration Summary
            </Typography>
            <Grid container spacing={3}>
              {Object.entries(CONFIG_SECTIONS).map(([section, { title, fields }]) => (
                <Grid item xs={12} md={6} key={section}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      {title}
                    </Typography>
                    <List dense>
                      {fields.map(field => {
                        const value = config[section]?.[field];
                        return value ? (
                          <ListItem key={field}>
                            <ListItemText
                              primary={field}
                              secondary={
                                typeof value === 'object' 
                                  ? JSON.stringify(value, null, 2)
                                  : value
                              }
                            />
                          </ListItem>
                        ) : null;
                      })}
                    </List>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Box>
        </>
      )}

      {activeTab === 'yaml' && (
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Configuration Files
              </Typography>
              <List>
                {Object.keys(generateConfigFiles()).map(filename => (
                  <ListItem
                    key={filename}
                    button
                    selected={selectedYamlFile === filename}
                    onClick={() => setSelectedYamlFile(filename)}
                  >
                    <ListItemText primary={filename} />
                    <IconButton size="small">
                      <VisibilityIcon />
                    </IconButton>
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Grid>
          <Grid item xs={12} md={8}>
            {selectedYamlFile && (
              <Paper sx={{ p: 2 }}>
                <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="subtitle1">
                    {selectedYamlFile}
                  </Typography>
                  <Button
                    startIcon={<SaveIcon />}
                    onClick={() => handleSave(selectedYamlFile)}
                    disabled={isSaving}
                  >
                    Save
                  </Button>
                </Box>
                <Editor
                  height="600px"
                  defaultLanguage="yaml"
                  value={generateConfigFiles()[selectedYamlFile]}
                  options={{ readOnly: true }}
                />
              </Paper>
            )}
          </Grid>
        </Grid>
      )}

      <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
        <Button
          variant="outlined"
          onClick={() => setShowYaml(!showYaml)}
        >
          {showYaml ? t('podDeployment:podDeployment.preview.hideYaml') : t('podDeployment:podDeployment.preview.showYaml')}
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? t('common:common.saving') : t('common:common.save')}
        </Button>
      </Box>

      {showYaml && (
        <Box sx={{ mt: 2 }}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
              <Button
                size="small"
                onClick={() => setShowYaml(false)}
              >
                {t('common:common.close')}
              </Button>
            </Box>
            <Editor
              height="400px"
              defaultLanguage="yaml"
              value={generateYamlPreview()}
              options={{ readOnly: true }}
            />
          </Paper>
        </Box>
      )}

      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
        <Button onClick={onBack}>
          {t('common:common.back')}
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={() => onDeploy(config)}
        >
          {t('common:common.deploy')}
        </Button>
      </Box>
    </Box>
  );
};

export default DeploymentPreview;