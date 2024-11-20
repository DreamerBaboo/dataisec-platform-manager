import React, { useState, useEffect } from 'react';
import { logger } from '../../utils/logger.ts';  // 導入 logger
import {
  Box,
  Paper,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Tabs,
  Tab,
  Alert,
  InputAdornment,
  Autocomplete
} from '@mui/material';
import { useAppTranslation } from '../../hooks/useAppTranslation';
import {
  Upload as UploadIcon,
  Download as DownloadIcon,
  Save as SaveIcon,
  Edit as EditIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import yaml from 'js-yaml';
import Editor from '@monaco-editor/react';

// 導入子組件
import ResourceConfig from './components/ResourceConfig';
import AffinityConfig from './components/AffinityConfig';
import VolumeConfig from './components/VolumeConfig';
import ConfigMapEditor from './components/ConfigMapEditor';
import SecretEditor from './components/SecretEditor';
import YamlEditor from './components/YamlEditor';

const editorStyles = `
  .highlighted-line {
    background-color: rgba(97, 175, 239, 0.2);
    transition: background-color 0.3s;
  }
  .highlighted-glyph {
    background-color: #61afef;
    width: 4px !important;
    margin-left: 3px;
  }
`;

const DeploymentForm = ({ deployment, onChange, onPreview }) => {
  const { t } = useAppTranslation();
  const [activeTab, setActiveTab] = useState(0);
  const [config, setConfig] = useState({
    name: '',
    namespace: 'default',
    type: 'deployment',
    replicas: 1,
    image: {
      repository: '',
      tag: 'latest',
      pullPolicy: 'IfNotPresent'
    },
    resources: {
      requests: {
        cpu: '100m',
        memory: '128Mi'
      },
      limits: {
        cpu: '200m',
        memory: '256Mi'
      }
    },
    affinity: {
      nodeAffinity: '',
      podAffinity: '',
      podAntiAffinity: ''
    },
    volumes: [],
    configMaps: [],
    secrets: [],
    yamlTemplate: {
      content: '',
      placeholders: {},
      defaultValues: {},
      originalContent: ''
    }
  });

  const [editorContent, setEditorContent] = useState('');
  const [yamlError, setYamlError] = useState(null);

  const [placeholderFilter, setPlaceholderFilter] = useState('');

  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const [editorOpen, setEditorOpen] = useState(false);

  useEffect(() => {
    if (deployment) {
      setConfig(prev => ({
        ...prev,
        ...deployment,
        image: {
          ...prev.image,
          ...(deployment.image || {})
        }
      }));
    }
  }, [deployment]);

  useEffect(() => {
    onChange?.(config);
  }, [config, onChange]);

  useEffect(() => {
    // Add styles to document
    const styleElement = document.createElement('style');
    styleElement.textContent = editorStyles;
    document.head.appendChild(styleElement);

    return () => {
      // Clean up styles when component unmounts
      document.head.removeChild(styleElement);
    };
  }, []);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleBasicConfigChange = (field) => (event) => {
    setConfig(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const handleImageConfigChange = (field) => (event) => {
    setConfig(prev => ({
      ...prev,
      image: {
        ...prev.image,
        [field]: event.target.value
      }
    }));
  };

  const handleResourceChange = (resources) => {
    setConfig(prev => ({
      ...prev,
      resources
    }));
  };

  const handleAffinityChange = (affinity) => {
    setConfig(prev => ({
      ...prev,
      affinity
    }));
  };

  const handleVolumeChange = (volumes) => {
    setConfig(prev => ({
      ...prev,
      volumes
    }));
  };

  const handleConfigMapChange = (configMaps) => {
    setConfig(prev => ({
      ...prev,
      configMaps
    }));
  };

  const handleSecretChange = (secrets) => {
    setConfig(prev => ({
      ...prev,
      secrets
    }));
  };

  // Add placeholder categories
  const PLACEHOLDER_CATEGORIES = {
    image: ['repository', 'repository_port', 'tag'],
    service: ['service_port', 'target_service_port', 'node_port', 'web_port'],
    resources: ['cpu_limit', 'memory_limit', 'cpu_request', 'memory_request'],
    deployment: ['replica_count'],
    node: ['node_selector', 'site_node'],
    misc: ['company_name']
  };

  // Helper function to determine category
  const getPlaceholderCategory = (placeholder) => {
    for (const [category, items] of Object.entries(PLACEHOLDER_CATEGORIES)) {
      if (items.some(item => placeholder.toLowerCase().includes(item))) {
        return category;
      }
    }
    return 'misc';
  };

  // Modify handleYamlTemplateUpload to handle composite placeholders and their default values
  const handleYamlTemplateUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const content = await file.text();
      setYamlError(null);

      try {
        // Extract placeholders and their default values
        const placeholders = {};
        const defaultValues = {};
        const compositePlaceholders = new Map();
        
        // Process line by line
        content.split('\n').forEach(line => {
          // Look for composite placeholders (e.g., ${repository}:${repository_port})
          const compositeMatch = line.match(/\${([^}]+)}:\${([^}]+)}/);
          if (compositeMatch) {
            const [placeholder1, placeholder2] = [compositeMatch[1], compositeMatch[2]].map(p => p.toLowerCase());
            compositePlaceholders.set(placeholder1, placeholder2);

            // Look for multiple default value sets
            const defaultsMatches = line.match(/#\[(.*?)\]/g);
            if (defaultsMatches && defaultsMatches.length >= 2) {
              defaultValues[placeholder1] = defaultsMatches[0].slice(2, -1).split(',').map(v => v.trim());
              defaultValues[placeholder2] = defaultsMatches[1].slice(2, -1).split(',').map(v => v.trim());
            }
            
            placeholders[placeholder1] = '';
            placeholders[placeholder2] = '';
          } else {
            // Look for single placeholders
            const placeholderMatch = /\${([^}]+)}/.exec(line);
            if (placeholderMatch) {
              const placeholder = placeholderMatch[1].toLowerCase();
              placeholders[placeholder] = '';

              // Look for default values
              const defaultsMatch = /#\[(.*?)\]/.exec(line);
              if (defaultsMatch) {
                defaultValues[placeholder] = defaultsMatch[1]
                  .split(',')
                  .map(v => v.trim())
                  .filter(v => v);
              }
            }
          }
        });

        logger.info('Identified placeholders:', placeholders);
        logger.info('Default values:', defaultValues);
        logger.info('Composite placeholders:', compositePlaceholders);

        // Update config
        setConfig(prev => ({
          ...prev,
          yamlTemplate: {
            content: content,
            placeholders: placeholders,
            defaultValues: defaultValues,
            compositePlaceholders: compositePlaceholders,
            originalContent: content
          }
        }));

        setEditorContent(content);

      } catch (yamlError) {
        console.error('YAML parsing error:', yamlError);
        setYamlError(
          t('podDeployment:podDeployment.yamlTemplate.parseError') + 
          `:\n${yamlError.message}`
        );
      }
    } catch (error) {
      console.error('File reading error:', error);
      setYamlError(t('podDeployment:podDeployment.yamlTemplate.uploadError'));
    }
  };

  const generateFinalYaml = () => {
    if (!config.yamlTemplate.content) return '';

    let finalContent = config.yamlTemplate.originalContent;
    
    // Replace all placeholders
    Object.entries(config.yamlTemplate.placeholders).forEach(([key, value]) => {
      const variations = [
        `\${${key}}`,                    // ${key}
        `\${${key.toUpperCase()}}`,      // ${KEY}
        `\${${key.toLowerCase()}}`,      // ${key}
        `{${key}}`,                      // Legacy {key}
        `{${key.toUpperCase()}}`,        // Legacy {KEY}
        `{${key.toLowerCase()}}`,        // Legacy {key}
      ];

      variations.forEach(pattern => {
        const regex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        finalContent = finalContent.replace(regex, value || '');
      });
    });

    return finalContent;
  };

  const handlePlaceholderChange = (placeholder, value) => {
    const newPlaceholders = {
      ...config.yamlTemplate.placeholders,
      [placeholder]: value
    };
    
    // Add to history
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newPlaceholders);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    
    setConfig(prev => ({
      ...prev,
      yamlTemplate: {
        ...prev.yamlTemplate,
        placeholders: newPlaceholders
      }
    }));
  };

  // Modify renderPlaceholderField to handle editable selects
  const renderPlaceholderField = (placeholder) => {
    const hasDefaultValues = config.yamlTemplate.defaultValues?.[placeholder];
    const isCompositeSecond = Array.from(config.yamlTemplate.compositePlaceholders?.values() || [])
      .includes(placeholder);

    if (hasDefaultValues) {
      return (
        <Autocomplete
          freeSolo
          value={config.yamlTemplate.placeholders[placeholder] || ''}
          onChange={(event, newValue) => {
            handlePlaceholderChange(placeholder, newValue);
          }}
          onInputChange={(event, newInputValue) => {
            handlePlaceholderChange(placeholder, newInputValue);
          }}
          options={config.yamlTemplate.defaultValues[placeholder]}
          renderInput={(params) => (
            <TextField
              {...params}
              fullWidth
              label={placeholder}
              variant="outlined"
            />
          )}
          ListboxProps={{
            style: { maxHeight: '200px' }
          }}
        />
      );
    }

    // Regular text field for placeholders without default values
    return (
      <TextField
        fullWidth
        label={placeholder}
        value={config.yamlTemplate.placeholders[placeholder] || ''}
        onChange={(e) => handlePlaceholderChange(placeholder, e.target.value)}
      />
    );
  };

  const renderYamlTemplateTab = () => (
    <Box sx={{ height: 'calc(70vh - 100px)', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
        <input
          type="file"
          accept=".yaml,.yml"
          style={{ display: 'none' }}
          id="yaml-template-upload"
          onChange={handleYamlTemplateUpload}
        />
        <label htmlFor="yaml-template-upload">
          <Button
            variant="outlined"
            component="span"
            startIcon={<UploadIcon />}
          >
            {t('podDeployment:podDeployment.yamlTemplate.upload')}
          </Button>
        </label>
        {config.yamlTemplate.content && (
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={() => setEditorOpen(true)}
          >
            {t('podDeployment:podDeployment.yamlTemplate.editTemplate')}
          </Button>
        )}
      </Box>

      {yamlError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setYamlError(null)}>
          <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
            {yamlError}
          </Typography>
        </Alert>
      )}

      {config.yamlTemplate.content && (
        <Grid container spacing={2} sx={{ flexGrow: 1, minHeight: 0 }}>
          <Grid item xs={12} md={6} sx={{ display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" gutterBottom>
              {t('podDeployment:podDeployment.yamlTemplate.placeholders')}
            </Typography>
            <Box sx={{ mb: 2 }}>
              <TextField
                fullWidth
                size="small"
                placeholder={t('podDeployment:podDeployment.yamlTemplate.searchPlaceholders')}
                value={placeholderFilter}
                onChange={(e) => setPlaceholderFilter(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  )
                }}
              />
            </Box>
            <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
              {renderPlaceholders()}
            </Box>
          </Grid>

          <Grid item xs={12} md={6} sx={{ display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" gutterBottom>
              {t('podDeployment:podDeployment.yamlTemplate.preview')}
            </Typography>
            <Paper sx={{ flexGrow: 1, overflow: 'hidden' }}>
              <Editor
                height="100%"
                defaultLanguage="yaml"
                value={generateFinalYaml()}
                options={{
                  readOnly: true,
                  minimap: { enabled: true },
                  scrollBeyondLastLine: false,
                  fontSize: 14,
                  lineNumbers: 'on',
                  wordWrap: 'on',
                  theme: 'vs-light'
                }}
              />
            </Paper>
          </Grid>
        </Grid>
      )}

      <YamlEditor
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        content={config.yamlTemplate.content}
        onSave={handleSaveTemplate}
        error={yamlError}
      />
    </Box>
  );

  const placeholderCategories = {
    image: ['REPOSITORY', 'REPOSITORY_PORT', 'TAG'],
    resources: ['CPU_LIMIT', 'MEMORY_LIMIT', 'CPU_REQUEST', 'MEMORY_REQUEST'],
    network: ['WEB_PORT', 'SITE_NODE'],
    misc: ['COMPANY_NAME']
  };

  const handleSaveTemplate = async (newContent) => {
    try {
      // Here you would typically make an API call to save the template
      // For now, we'll just update the local state
      setConfig(prev => ({
        ...prev,
        yamlTemplate: {
          ...prev.yamlTemplate,
          content: newContent,
          originalContent: newContent
        }
      }));
    } catch (error) {
      console.error('Failed to save template:', error);
      throw error;
    }
  };

  // Update the placeholder section in renderYamlTemplateTab
  const renderPlaceholders = () => (
    <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
      {Object.entries(PLACEHOLDER_CATEGORIES).map(([category, _]) => {
        const categoryPlaceholders = Object.keys(config.yamlTemplate.placeholders)
          .filter(key => 
            key.toLowerCase().includes(placeholderFilter.toLowerCase()) &&
            getPlaceholderCategory(key) === category
          );

        if (categoryPlaceholders.length === 0) return null;

        return (
          <Box key={category} sx={{ mb: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 1, textTransform: 'capitalize' }}>
              {category}
            </Typography>
            <Grid container spacing={2}>
              {categoryPlaceholders.map((placeholder) => (
                <Grid item xs={12} sm={6} key={placeholder}>
                  {renderPlaceholderField(placeholder)}
                </Grid>
              ))}
            </Grid>
          </Box>
        );
      })}
    </Box>
  );

  return (
    <Box>
      <Paper sx={{ mb: 2 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label={t('podDeployment:podDeployment.tabs.basic')} />
          <Tab label={t('podDeployment:podDeployment.tabs.resources')} />
          <Tab label={t('podDeployment:podDeployment.tabs.affinity')} />
          <Tab label={t('podDeployment:podDeployment.tabs.volumes')} />
          <Tab label={t('podDeployment:podDeployment.tabs.configMaps')} />
          <Tab label={t('podDeployment:podDeployment.tabs.secrets')} />
          <Tab label={t('podDeployment:podDeployment.tabs.yamlTemplate')} />
        </Tabs>
      </Paper>

      <Box sx={{ mt: 2 }}>
        {activeTab === 0 && (
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={t('podDeployment:podDeployment.basic.name')}
                value={config.name}
                onChange={handleBasicConfigChange('name')}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={t('podDeployment:podDeployment.basic.namespace')}
                value={config.namespace}
                onChange={handleBasicConfigChange('namespace')}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>{t('podDeployment:podDeployment.basic.type')}</InputLabel>
                <Select
                  value={config.type}
                  onChange={handleBasicConfigChange('type')}
                  label={t('podDeployment:podDeployment.basic.type')}
                >
                  <MenuItem value="deployment">Deployment</MenuItem>
                  <MenuItem value="statefulset">StatefulSet</MenuItem>
                  <MenuItem value="daemonset">DaemonSet</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            {config.type !== 'daemonset' && (
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label={t('podDeployment:podDeployment.basic.replicas')}
                  value={config.replicas}
                  onChange={handleBasicConfigChange('replicas')}
                  inputProps={{ min: 1 }}
                />
              </Grid>
            )}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={t('podDeployment:podDeployment.basic.repository')}
                value={config?.image?.repository || ''}
                onChange={handleImageConfigChange('repository')}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={t('podDeployment:podDeployment.basic.tag')}
                value={config.image.tag}
                onChange={handleImageConfigChange('tag')}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>{t('podDeployment:podDeployment.basic.pullPolicy')}</InputLabel>
                <Select
                  value={config.image.pullPolicy}
                  onChange={handleImageConfigChange('pullPolicy')}
                  label={t('podDeployment:podDeployment.basic.pullPolicy')}
                >
                  <MenuItem value="Always">Always</MenuItem>
                  <MenuItem value="IfNotPresent">IfNotPresent</MenuItem>
                  <MenuItem value="Never">Never</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        )}

        {activeTab === 1 && (
          <ResourceConfig
            resources={config.resources}
            onChange={handleResourceChange}
          />
        )}

        {activeTab === 2 && (
          <AffinityConfig
            affinity={config.affinity}
            onChange={handleAffinityChange}
          />
        )}

        {activeTab === 3 && (
          <VolumeConfig
            volumes={config.volumes}
            onChange={handleVolumeChange}
          />
        )}

        {activeTab === 4 && (
          <ConfigMapEditor
            configMaps={config.configMaps}
            onChange={handleConfigMapChange}
          />
        )}

        {activeTab === 5 && (
          <SecretEditor
            secrets={config.secrets}
            onChange={handleSecretChange}
          />
        )}

        {activeTab === 6 && renderYamlTemplateTab()}
      </Box>

      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          onClick={() => onPreview?.({
            ...config,
            generatedYaml: generateFinalYaml()
          })}
          disabled={!config.name || !config.image.repository}
        >
          {t('podDeployment:podDeployment.actions.preview')}
        </Button>
      </Box>
    </Box>
  );
};

export default DeploymentForm; 