import React, { useState, useEffect } from 'react';
import { logger } from '../../../utils/logger'; // 導入 logger
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Tabs,
  Tab,
  CircularProgress,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Terminal as TerminalIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import Editor from '@monaco-editor/react';
import { useAppTranslation } from '../../../hooks/useAppTranslation';
import { podDeploymentService } from '../../../services/podDeploymentService';
import YAML from 'yaml';
import CommandExecutor from './CommandExecutor';

const YAML_TYPES = {
  QUOTA: 'quota',
  STORAGE_CLASS: 'storageClass',
  PERSISTENT_VOLUME: 'persistentVolume',
  CONFIGMAP: 'configMap',
  SECRET: 'secret',
  FINAL: 'final'
};

// Define the order of YAML files
const YAML_ORDER = [
  YAML_TYPES.QUOTA,
  YAML_TYPES.STORAGE_CLASS,
  YAML_TYPES.PERSISTENT_VOLUME,
  YAML_TYPES.CONFIGMAP,
  YAML_TYPES.SECRET,
  YAML_TYPES.FINAL
];

const PLACEHOLDER_CATEGORIES = {
  basic: ['name', 'namespace', 'version', 'type'],
  image: ['repository', 'tag', 'pullPolicy'],
  resources: ['cpu_request', 'cpu_limit', 'memory_request', 'memory_limit'],
  replicas: ['replica_count'],
  service: ['service_port', 'target_port', 'node_port'],
  affinity: ['node_selector', 'pod_affinity', 'pod_anti_affinity']
};

const DeploymentPreview = ({ config, onDeploy, onBack }) => {
  const { t } = useAppTranslation();
  const [activeTab, setActiveTab] = useState('summary');
  const [yamlContents, setYamlContents] = useState({});
  const [showYamlPreviews, setShowYamlPreviews] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [openExecutor, setOpenExecutor] = useState(false);

  // Basic Configuration Section
  const renderBasicConfig = () => (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        {t('podDeployment:podDeployment.preview.basicConfig')}
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <Typography variant="subtitle2" color="textSecondary">
            {t('podDeployment:podDeployment.basic.name')}
          </Typography>
          <Typography>{config.name}</Typography>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Typography variant="subtitle2" color="textSecondary">
            {t('podDeployment:podDeployment.basic.namespace')}
          </Typography>
          <Typography>{config.namespace}</Typography>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Typography variant="subtitle2" color="textSecondary">
            {t('podDeployment:podDeployment.basic.version')}
          </Typography>
          <Typography>{config.version}</Typography>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Typography variant="subtitle2" color="textSecondary">
            {t('podDeployment:podDeployment.basic.type')}
          </Typography>
          <Typography>{config.type}</Typography>
        </Grid>
      </Grid>
    </Paper>
  );

  // Placeholder Categories Section
  const renderPlaceholderCategories = () => (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        {t('podDeployment:podDeployment.preview.placeholders')}
      </Typography>
      <Grid container spacing={3}>
        {Object.entries(PLACEHOLDER_CATEGORIES).map(([category, fields]) => (
          <Grid item xs={12} key={category}>
            <Typography variant="subtitle1" gutterBottom>
              {t(`podDeployment:podDeployment.preview.categories.${category}`)}
            </Typography>
            <Grid container spacing={2}>
              {fields.map(field => {
                const value = config.yamlTemplate?.placeholders?.[field];
                if (!value) return null;
                return (
                  <Grid item xs={12} sm={6} key={field}>
                    <Typography variant="subtitle2" color="textSecondary">
                      {t(`podDeployment:podDeployment.preview.fields.${field}`)}
                    </Typography>
                    <Typography>{value}</Typography>
                  </Grid>
                );
              })}
            </Grid>
            <Divider sx={{ my: 2 }} />
          </Grid>
        ))}
      </Grid>
    </Paper>
  );

  // Load YAML files when component mounts
  useEffect(() => {
    const loadYamlFiles = async () => {
      if (!config?.name || !config?.version) return;
      setIsLoading(true);

      try {
        const yamlFiles = {
          [YAML_TYPES.QUOTA]: `${config.name}-${config.version}-quota.yaml`,
          [YAML_TYPES.STORAGE_CLASS]: `${config.name}-${config.version}-storageClass.yaml`,
          [YAML_TYPES.PERSISTENT_VOLUME]: `${config.name}-${config.version}-persistentVolumes.yaml`,
          [YAML_TYPES.CONFIGMAP]: `${config.name}-${config.version}-configmap.yaml`,
          [YAML_TYPES.SECRET]: `${config.name}-${config.version}-secret.yaml`
        };
        logger.info('yamlFiles: ', yamlFiles);

        const contents = {};
        for (const [type, filename] of Object.entries(yamlFiles)) {
          try {
            const response = await podDeploymentService.getDeployScript(
              config.name,
              config.version,
              filename
            );
            
            logger.info ('content : ', response?.content);
            if (response?.content) {
              contents[type] = response.content;
              logger.info(`✅ Loaded ${type} YAML successfully`);
            }
          } catch (error) {
            if (error.response?.status === 404) {
              logger.info(`ℹ️ No ${type} YAML file found`);
              continue;
            } else {
              console.error(`❌ Failed to load ${type} YAML:`, error);
            }
          }
        }
        setYamlContents(contents);
      } catch (error) {
        console.error('Failed to load YAML files:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadYamlFiles();
  }, [config?.name, config?.version]);

  // Function to generate final YAML with replaced values
  const generateFinalYaml = () => {
    if (!config?.yamlTemplate?.content) {
      logger.info('❌ No template content found');
      return '';
    }

    try {
      let finalContent = config.yamlTemplate.content;
      const placeholders = config.yamlTemplate.placeholders || {};

      // Replace all placeholders in the template
      Object.entries(placeholders).forEach(([key, value]) => {
        if (value) {
          // Create a regex that matches ${key} with optional whitespace
          const regex = new RegExp(`\\$\\{${key}\\}`, 'gi');
          logger.info('regex == value', regex, value);
          finalContent = finalContent.replace(regex, value);
        }
      });
      //logger.info('final Content:', finalContent);
      // Add namespace if not present in template
      if (!finalContent.includes('namespace:') && config.namespace) {
        finalContent = finalContent.replace(
          /metadata:\s*\n/,
          `metadata:\n  namespace: ${config.namespace}\n`
        );
      }

      logger.info('✅ Final YAML generated successfully with placeholders replaced');
      return finalContent;
    } catch (error) {
      console.error('❌ Failed to generate final YAML:', error);
      return '';
    }
  };

  // Add effect to save final YAML when entering preview
  useEffect(() => {
    const saveFinalYaml = async () => {
      if (!config?.name || !config?.version || !config?.yamlTemplate?.content) return;
      
      try {
        // Generate final YAML content with replaced placeholders
        const finalYaml = generateFinalYaml();
        if (!finalYaml) {
          logger.info('⚠️ No final YAML content to save');
          return;
        }
        
        // Validate YAML format
        try {
          YAML.parse(finalYaml);
        } catch (yamlError) {
          console.error('❌ Invalid YAML format:', yamlError);
          return;
        }
        
        if (config.deploymentMode === 'helm') {
          // Save final YAML to deploy-scripts
          logger.info ('THIS IS HELM');
          await podDeploymentService.saveHelmDeployScript(
            config.name,
            config.version,
            `${config.name}-${config.version}-final.yaml`,
            finalYaml
          )
        } 
        else{
          logger.info ('THIS IS KUBERNETES');
          await podDeploymentService.saveDeployScript(
          config.name,
          config.version,
          `${config.name}-${config.version}-final.yaml`,
          finalYaml
          )
        }
        
        logger.info('✅ Final YAML saved successfully');
        
        // Load the final YAML into the preview
        setYamlContents(prev => ({
          ...prev,
          [YAML_TYPES.FINAL]: finalYaml
        }));
      } catch (error) {
        console.error('❌ Failed to save final YAML:', error);
      }
    };

    saveFinalYaml();
  }, [config?.name, config?.version, config?.yamlTemplate?.content, config?.yamlTemplate?.placeholders]);

  const toggleYamlPreview = (type) => {
    setShowYamlPreviews(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  const renderYamlPreview = (type) => {
    const content = yamlContents[type];
    if (!content) return null;

    const titleMap = {
      [YAML_TYPES.QUOTA]: t('podDeployment:podDeployment.preview.quotaTitle'),
      [YAML_TYPES.STORAGE_CLASS]: t('podDeployment:podDeployment.preview.storageClassTitle'),
      [YAML_TYPES.PERSISTENT_VOLUME]: t('podDeployment:podDeployment.preview.persistentVolumeTitle'),
      [YAML_TYPES.CONFIGMAP]: t('podDeployment:podDeployment.preview.configMapTitle'),
      [YAML_TYPES.SECRET]: t('podDeployment:podDeployment.preview.secretTitle'),
      [YAML_TYPES.FINAL]: t('podDeployment:podDeployment.preview.finalYamlTitle')
    };

    // Special styling for final YAML
    const isFinalYaml = type === YAML_TYPES.FINAL;
    
    return (
      <Box sx={{ mb: 3 }}>
        <Paper sx={{ 
          p: 2,
          ...(isFinalYaml && { 
            border: '2px solid',
            borderColor: 'primary.main'
          })
        }}>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            mb: showYamlPreviews[type] ? 2 : 0 
          }}>
            <Typography 
              variant="subtitle1" 
              sx={{ 
                fontWeight: isFinalYaml ? 'bold' : 'medium',
                color: isFinalYaml ? 'primary.main' : 'text.primary'
              }}
            >
              {titleMap[type]}
            </Typography>
            <Button
              variant="outlined"
              startIcon={showYamlPreviews[type] ? <VisibilityOffIcon /> : <VisibilityIcon />}
              onClick={() => toggleYamlPreview(type)}
              size="small"
              color={isFinalYaml ? 'primary' : 'default'}
            >
              {showYamlPreviews[type] 
                ? t('podDeployment:podDeployment.preview.hideYaml')
                : t('podDeployment:podDeployment.preview.showYaml')
              }
            </Button>
          </Box>
          {showYamlPreviews[type] && (
            <Box sx={{ mt: 2 }}>
              <Editor
                height={isFinalYaml ? "400px" : "300px"}
                defaultLanguage="yaml"
                value={content}
                options={{ 
                  readOnly: true,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                  wrappingIndent: 'indent',
                  fontSize: 14
                }}
              />
            </Box>
          )}
        </Paper>
      </Box>
    );
  };

  const handleOpenExecutor = () => {
    setOpenExecutor(true);
  };

  const handleCloseExecutor = () => {
    setOpenExecutor(false);
  };

  return (
    <Box>
      <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
        <Tab label={t('podDeployment:podDeployment.preview.summaryTab')} value="summary" />
        <Tab label={t('podDeployment:podDeployment.preview.yamlTab')} value="yaml" />
      </Tabs>

      {activeTab === 'summary' && (
        <Box sx={{ mt: 3 }}>
          {renderBasicConfig()}
          {renderPlaceholderCategories()}
        </Box>
      )}

      {activeTab === 'yaml' && (
        <Box sx={{ mt: 3 }}>
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {/* Namespace Quota */}
              {renderYamlPreview(
                YAML_TYPES.QUOTA,
                t('podDeployment:podDeployment.preview.quotaTitle')
              )}

              {/* Storage Class */}
              {renderYamlPreview(
                YAML_TYPES.STORAGE_CLASS,
                t('podDeployment:podDeployment.preview.storageClassTitle')
              )}

              {/* Persistent Volume */}
              {renderYamlPreview(
                YAML_TYPES.PERSISTENT_VOLUME,
                t('podDeployment:podDeployment.preview.persistentVolumeTitle')
              )}

              {/* ConfigMap */}
              {renderYamlPreview(
                YAML_TYPES.CONFIGMAP,
                t('podDeployment:podDeployment.preview.configMapTitle')
              )}

              {/* Secret */}
              {renderYamlPreview(
                YAML_TYPES.SECRET,
                t('podDeployment:podDeployment.preview.secretTitle')
              )}

              {/* Final YAML with replaced values */}
              <Box sx={{ mt: 4, mb: 2 }}>
                <Paper sx={{ 
                  p: 2,
                  border: '2px solid',
                  borderColor: 'primary.main'
                }}>
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    mb: 2 
                  }}>
                    <Typography 
                      variant="h6" 
                      sx={{ 
                        fontWeight: 'bold',
                        color: 'primary.main'
                      }}
                    >
                      {t('podDeployment:podDeployment.preview.finalYamlTitle')}
                    </Typography>
                    <Button
                      variant="outlined"
                      color="primary"
                      startIcon={showYamlPreviews[YAML_TYPES.FINAL] ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      onClick={() => toggleYamlPreview(YAML_TYPES.FINAL)}
                    >
                      {showYamlPreviews[YAML_TYPES.FINAL] 
                        ? t('podDeployment:podDeployment.preview.hideYaml')
                        : t('podDeployment:podDeployment.preview.showYaml')
                      }
                    </Button>
                  </Box>
                  {showYamlPreviews[YAML_TYPES.FINAL] && (
                    <Box sx={{ mt: 2 }}>
                      <Editor
                        height="400px"
                        defaultLanguage="yaml"
                        value={yamlContents[YAML_TYPES.FINAL] || generateFinalYaml()}
                        options={{ 
                          readOnly: true,
                          minimap: { enabled: false },
                          scrollBeyondLastLine: false,
                          wordWrap: 'on',
                          wrappingIndent: 'indent',
                          fontSize: 14
                        }}
                      />
                    </Box>
                  )}
                </Paper>
              </Box>
            </>
          )}
        </Box>
      )}

      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
        <Button onClick={onBack}>
          {t('common:common.back')}
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleOpenExecutor}
        >
          {t('common:common.deploy')}
        </Button>
      </Box>

      {/* 命令執行器彈窗 */}
      <CommandExecutor 
        name={config.name}
        version={config.version}
        namespace={config.yamlTemplate?.placeholders?.namespace || 'default'}
        open={openExecutor}
        onClose={handleCloseExecutor}
      />
    </Box>
  );
};

export default DeploymentPreview;