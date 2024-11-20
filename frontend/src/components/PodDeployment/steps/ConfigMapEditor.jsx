
import { logger } from '../../../utils/logger.ts'; // 導入 logger
import {
  Box,
  Typography,
  Grid,
  TextField,
  Paper,
  Button,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  HelpOutline as HelpOutlineIcon
} from '@mui/icons-material';
import { useAppTranslation } from '../../../hooks/useAppTranslation';
import { podDeploymentService } from '../../../services/podDeploymentService';
import YAML from 'yaml';
import { MonacoEditor } from '../../common/MonacoEditor';

const CONFIGMAP_TYPES = {
  KEY_VALUE: 'keyValue',
  YAML_FILE: 'yamlFile',
  CERTIFICATE: 'certificate'
};

const CONFIGMAP_TYPE_INFO = {
  [CONFIGMAP_TYPES.KEY_VALUE]: {
    description: 'podDeployment:configMap.typeInfo.keyValue',
    multipleEntries: true,
    examples: {
      key: 'e.g., database.host',
      value: 'e.g., localhost'
    }
  },
  [CONFIGMAP_TYPES.YAML_FILE]: {
    description: 'podDeployment:configMap.typeInfo.yamlFile',
    multipleEntries: false,
    examples: {
      content: '# Enter your YAML content here\nkey: value'
    }
  },
  [CONFIGMAP_TYPES.CERTIFICATE]: {
    description: 'podDeployment:configMap.typeInfo.certificate',
    multipleEntries: true,
    examples: {
      key: 'e.g., tls.crt',
      value: '-----BEGIN CERTIFICATE-----\n...'
    }
  }
};

const validateCertificate = (cert) => {
  const certRegex = /^-----BEGIN CERTIFICATE-----\n[\s\S]*\n-----END CERTIFICATE-----$/;
  return certRegex.test(cert);
};

const ConfigMapEditor = ({ config, onChange, errors = {} }) => {
  const { t } = useAppTranslation();
  const [configMaps, setConfigMaps] = useState([]);
  const [showYaml, setShowYaml] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState('');
  const [editIndex, setEditIndex] = useState(null);
  const [localErrors, setLocalErrors] = useState({});
  const [newConfigMap, setNewConfigMap] = useState({
    name: '',
    type: '',
    data: {}
  });

  // Load existing configuration when component mounts or config changes
  useEffect(() => {
    const loadConfigMaps = async () => {
      if (!config?.name || !config?.version) return;

      try {
        const response = await podDeploymentService.getConfigMapConfig(
          config.name,
          config.version
        );
        
        if (response.configMaps) {
          setConfigMaps(response.configMaps);
          // Don't call onChange here to avoid the loop
        }
      } catch (error) {
        if (error.response?.status !== 404) {
          console.error('Failed to load ConfigMaps:', error);
        }
      }
    };

    // Load from parent config first if available
    if (config?.configMaps) {
      setConfigMaps(config.configMaps);
    } else {
      // Only load from backend if no configMaps in parent config
      loadConfigMaps();
    }
  }, [config?.name, config?.version]); // Remove config.configMaps from dependencies

  // Save configuration only when configMaps state changes
  const saveConfig = async (updatedConfigMaps) => {
    if (!config?.name || !config?.version) return;

    try {
      // Save to config.json first
      await podDeploymentService.saveDeploymentConfig(
        config.name,
        config.version,
        {
          ...config,
          configMaps: updatedConfigMaps
        }
      );

      // Generate and save YAML if there are valid ConfigMaps
      if (updatedConfigMaps.length > 0) {
        const configMapYaml = generateConfigMapYaml(updatedConfigMaps);
        await podDeploymentService.saveDeployScript(
          config.name,
          config.version,
          `${config.name}-${config.version}-configmap.yaml`,
          configMapYaml
        );
      }

      // Update parent config
      onChange({
        ...config,
        configMaps: updatedConfigMaps
      });

    } catch (error) {
      console.error('Failed to save ConfigMaps:', error);
      setLocalErrors({
        submit: t('podDeployment:podDeployment.configMap.errors.saveFailed')
      });
    }
  };

  // Add cleanup function
  const cleanupConfigMapYaml = async () => {
    if (!config?.name || !config?.version) return;

    try {
      await podDeploymentService.deleteDeployScript(
        config.name,
        config.version,
        `${config.name}-${config.version}-configmap.yaml`
      );
      logger.info('✅ ConfigMap YAML deleted successfully');
    } catch (error) {
      // Ignore 404 errors (file doesn't exist)
      if (error.response?.status !== 404) {
        console.error('Failed to cleanup ConfigMap YAML:', error);
      }
    }
  };

  // Handle ConfigMap deletion
  const handleDeleteConfigMap = async (index) => {
    try {
      const updatedConfigMaps = configMaps.filter((_, i) => i !== index);
      setConfigMaps(updatedConfigMaps);

      // Save updated ConfigMaps to config.json first
      await podDeploymentService.saveDeploymentConfig(
        config.name,
        config.version,
        {
          ...config,
          configMaps: updatedConfigMaps
        }
      );

      // Update parent config
      onChange({
        ...config,
        configMaps: updatedConfigMaps
      });

      // If there are still ConfigMaps, update the YAML file
      if (updatedConfigMaps.length > 0) {
        const configMapYaml = generateConfigMapYaml(updatedConfigMaps);
        await podDeploymentService.saveDeployScript(
          config.name,
          config.version,
          `${config.name}-${config.version}-configmap.yaml`,
          configMapYaml
        );
      } else {
        // Only delete YAML file if no ConfigMaps left after deletion
        await cleanupConfigMapYaml();
      }
    } catch (error) {
      console.error('Failed to delete ConfigMap:', error);
      setLocalErrors({
        submit: t('podDeployment:podDeployment.configMap.errors.deleteFailed')
      });
    }
  };

  const handleCreateConfigMap = () => {
    setSelectedType('');
    setNewConfigMap({
      name: '',
      type: '',
      data: {}
    });
    setCreateDialogOpen(true);
  };

  const handleTypeSelect = (type) => {
    const configMapName = `${config.name}-${type.toLowerCase()}-cm`;
    setSelectedType(type);
    setNewConfigMap({
      name: configMapName,
      type,
      data: {
        entries: type !== CONFIGMAP_TYPES.YAML_FILE ? [{ key: '', value: '' }] : [],
        content: type === CONFIGMAP_TYPES.YAML_FILE ? '' : undefined,
        fileName: type === CONFIGMAP_TYPES.YAML_FILE ? 'config.yaml' : undefined
      }
    });
  };

  const renderTypeSpecificFields = () => {
    switch (selectedType) {
      case CONFIGMAP_TYPES.KEY_VALUE:
        return (
          <Box sx={{ mt: 2 }}>
            {newConfigMap.data.entries?.map((entry, index) => (
              <Grid container spacing={2} key={index} sx={{ mb: 2 }}>
                <Grid item xs={5}>
                  <TextField
                    fullWidth
                    label={t('podDeployment:podDeployment.configMap.fields.key')}
                    value={entry.key || ''}
                    onChange={(e) => handleEntryChange(index, 'key', e.target.value)}
                    error={!!localErrors[`entry-${index}-key`]}
                    helperText={localErrors[`entry-${index}-key`] || CONFIGMAP_TYPE_INFO[CONFIGMAP_TYPES.KEY_VALUE].examples.key}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label={t('podDeployment:podDeployment.configMap.fields.value')}
                    value={entry.value || ''}
                    onChange={(e) => handleEntryChange(index, 'value', e.target.value)}
                    error={!!localErrors[`entry-${index}-value`]}
                    helperText={localErrors[`entry-${index}-value`] || CONFIGMAP_TYPE_INFO[CONFIGMAP_TYPES.KEY_VALUE].examples.value}
                  />
                </Grid>
                <Grid item xs={1} sx={{ display: 'flex', alignItems: 'center' }}>
                  <IconButton color="error" onClick={() => handleRemoveEntry(index)}>
                    <DeleteIcon />
                  </IconButton>
                </Grid>
              </Grid>
            ))}
            <Button
              startIcon={<AddIcon />}
              onClick={handleAddEntry}
              variant="outlined"
              size="small"
            >
              {t('podDeployment:podDeployment.configMap.addEntry')}
            </Button>
          </Box>
        );

      case CONFIGMAP_TYPES.YAML_FILE:
        return (
          <Box sx={{ mt: 2, width: '100%' }}>
            {/* File Name Field */}
            <TextField
              fullWidth
              label={t('podDeployment:podDeployment.configMap.fields.fileName')}
              value={newConfigMap.data.fileName || 'config.yaml'}
              onChange={(e) => handleContentChange('fileName', e.target.value)}
              sx={{ mb: 2 }}
            />
            {/* YAML Content Editor */}
            <Box sx={{ width: '100%' }}>
              <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 1 }}>
                {t('podDeployment:podDeployment.configMap.fields.yamlContent')}
              </Typography>
              <Paper 
                variant="outlined" 
                sx={{ 
                  width: '100%',
                  mb: 2,
                  '& .monaco-editor': {
                    backgroundColor: '#ffffff'
                  },
                  '& .monaco-editor .monaco-scrollable-element': {
                    width: '100% !important'
                  }
                }}
              >
                <MonacoEditor
                  value={newConfigMap.data.content || ''}
                  onChange={(value) => handleContentChange('content', value)}
                  language="yaml"
                  height="400px"
                  width="100%"
                  options={{
                    minimap: { enabled: true },
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    fontSize: 14,
                    wordWrap: 'on',
                    wrappingIndent: 'indent',
                    formatOnPaste: true,
                    formatOnType: true,
                    renderWhitespace: 'boundary',
                    rulers: [80],
                    theme: 'vs',
                    suggest: {
                      snippetsPreventQuickSuggestions: false
                    }
                  }}
                />
              </Paper>
              {localErrors.content && (
                <Typography color="error" variant="caption">
                  {localErrors.content}
                </Typography>
              )}
            </Box>
          </Box>
        );

      case CONFIGMAP_TYPES.CERTIFICATE:
        return (
          <Box sx={{ mt: 2 }}>
            {newConfigMap.data.entries?.map((entry, index) => (
              <Paper variant="outlined" sx={{ p: 2, mb: 2, width: '100%' }} key={index}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label={t('podDeployment:podDeployment.configMap.fields.key')}
                      value={entry.key || ''}
                      onChange={(e) => handleEntryChange(index, 'key', e.target.value)}
                      error={!!localErrors[`entry-${index}-key`]}
                      helperText={localErrors[`entry-${index}-key`] || CONFIGMAP_TYPE_INFO[CONFIGMAP_TYPES.CERTIFICATE].examples.key}
                      sx={{ mb: 2 }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 1 }}>
                      {t('podDeployment:podDeployment.configMap.fields.certificateContent')}
                    </Typography>
                    <MonacoEditor
                      value={entry.value || ''}
                      onChange={(value) => handleEntryChange(index, 'value', value)}
                      language="plaintext"
                      height="300px"
                      options={{
                        minimap: { enabled: false },
                        lineNumbers: 'on',
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        fontSize: 14,
                        wordWrap: 'on',
                        wrappingIndent: 'indent',
                        renderWhitespace: 'boundary',
                        readOnly: false,
                        fontFamily: "'Courier New', monospace",
                        theme: 'vs' // Use light theme
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <IconButton
                      color="error"
                      onClick={() => handleRemoveEntry(index)}
                      size="small"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Grid>
                </Grid>
              </Paper>
            ))}
            <Button
              startIcon={<AddIcon />}
              onClick={handleAddEntry}
              variant="outlined"
              size="small"
            >
              {t('podDeployment:podDeployment.configMap.addEntry')}
            </Button>
          </Box>
        );

      default:
        return null;
    }
  };

  const handleEntryChange = (index, field, value) => {
    const updatedConfigMap = { ...newConfigMap };
    if (!updatedConfigMap.data.entries) {
      updatedConfigMap.data.entries = [];
    }
    updatedConfigMap.data.entries[index] = {
      ...updatedConfigMap.data.entries[index],
      [field]: value
    };
    setNewConfigMap(updatedConfigMap);
  };

  const handleContentChange = (field, value) => {
    setNewConfigMap(prev => ({
      ...prev,
      data: {
        ...prev.data,
        [field]: value
      }
    }));
  };

  const handleAddEntry = () => {
    setNewConfigMap(prev => ({
      ...prev,
      data: {
        ...prev.data,
        entries: [...(prev.data.entries || []), { key: '', value: '' }]
      }
    }));
  };

  const handleRemoveEntry = (index) => {
    setNewConfigMap(prev => ({
      ...prev,
      data: {
        ...prev.data,
        entries: prev.data.entries.filter((_, i) => i !== index)
      }
    }));
  };

  const validateConfigMap = () => {
    const errors = {};

    switch (selectedType) {
      case CONFIGMAP_TYPES.KEY_VALUE:
      case CONFIGMAP_TYPES.CERTIFICATE:
        newConfigMap.data.entries?.forEach((entry, index) => {
          if (!entry.key) {
            errors[`entry-${index}-key`] = t('podDeployment:podDeployment.configMap.validation.keyRequired');
          }
          if (!entry.value) {
            errors[`entry-${index}-value`] = t('podDeployment:podDeployment.configMap.validation.valueRequired');
          }
          if (selectedType === CONFIGMAP_TYPES.CERTIFICATE && !validateCertificate(entry.value)) {
            errors[`entry-${index}-value`] = t('podDeployment:podDeployment.configMap.validation.invalidCertificate');
          }
        });
        break;

      case CONFIGMAP_TYPES.YAML_FILE:
        try {
          YAML.parse(newConfigMap.data.content || '');
        } catch (error) {
          errors.content = t('podDeployment:podDeployment.configMap.validation.invalidYaml');
        }
        break;
    }

    setLocalErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveConfigMap = async () => {
    if (!validateConfigMap()) return;

    try {
      const updatedConfigMaps = [...configMaps];
      if (editIndex !== null) {
        updatedConfigMaps[editIndex] = newConfigMap;
      } else {
        if (updatedConfigMaps.some(cm => cm.name === newConfigMap.name)) {
          setLocalErrors({
            submit: t('podDeployment:podDeployment.configMap.errors.duplicateName')
          });
          return;
        }
        updatedConfigMaps.push(newConfigMap);
      }

      setConfigMaps(updatedConfigMaps);
      await saveConfig(updatedConfigMaps);
      setCreateDialogOpen(false);
      setEditIndex(null);
      setNewConfigMap({
        type: '',
        name: '',
        data: {}
      });
    } catch (error) {
      console.error('Failed to save ConfigMap:', error);
      setLocalErrors({
        submit: t('podDeployment:podDeployment.configMap.errors.saveFailed')
      });
    }
  };

  const generateConfigMapYaml = (configMaps) => {
    if (!configMaps.length) return '';

    return configMaps.map(cm => {
      const yaml = {
        apiVersion: 'v1',
        kind: 'ConfigMap',
        metadata: {
          name: cm.name,
          namespace: config.namespace || 'default'
        },
        data: {}
      };

      if (cm.type === CONFIGMAP_TYPES.KEY_VALUE) {
        cm.data.entries?.forEach(entry => {
          if (entry.key) {
            yaml.data[entry.key] = entry.value || '';
          }
        });
        return YAML.stringify(yaml);
      } else if (cm.type === CONFIGMAP_TYPES.YAML_FILE) {
        const fileName = cm.data.fileName || 'config.yaml';
        const content = (cm.data.content || '').trimEnd();
        const yamlString = YAML.stringify(yaml);
        return yamlString.replace(
          'data: {}',
          `data:\n  ${fileName}: |-\n${content.split('\n').map(line => `    ${line}`).join('\n')}`
        );
      } else if (cm.type === CONFIGMAP_TYPES.CERTIFICATE) {
        const yamlString = YAML.stringify(yaml);
        const entries = cm.data.entries?.map(entry => {
          if (entry.key && entry.value) {
            const value = entry.value.trimEnd();
            return `  ${entry.key}: |-\n${value.split('\n').map(line => `    ${line}`).join('\n')}`;
          }
          return null;
        }).filter(Boolean);

        if (entries?.length) {
          return yamlString.replace(
            'data: {}',
            `data:\n${entries.join('\n')}`
          );
        }
      }

      return YAML.stringify(yaml);
    }).filter(Boolean).join('\n---\n');
  };

  // Add ConfigMap display component
  const ConfigMapDisplay = ({ configMap, onEdit, onDelete }) => {
    const { t } = useAppTranslation();

    // Add null check for configMap type
    if (!configMap || !configMap.type || !CONFIGMAP_TYPE_INFO[configMap.type]) {
      return null;
    }

    const renderContent = () => {
      switch (configMap.type) {
        case CONFIGMAP_TYPES.KEY_VALUE:
          return (
            <Box>
              {configMap.data.entries?.map((entry, index) => (
                <Grid container spacing={2} key={index} sx={{ mb: 2 }}>
                  <Grid item xs={5}>
                    <TextField
                      fullWidth
                      label={t('podDeployment:podDeployment.configMap.fields.key')}
                      value={entry.key}
                      disabled
                    />
                  </Grid>
                  <Grid item xs={7}>
                    <TextField
                      fullWidth
                      label={t('podDeployment:podDeployment.configMap.fields.value')}
                      value={entry.value}
                      disabled
                      multiline
                      rows={2}
                    />
                  </Grid>
                </Grid>
              ))}
            </Box>
          );

        case CONFIGMAP_TYPES.YAML_FILE:
          return (
            <Box sx={{ mt: 2 }}>
              <MonacoEditor
                value={configMap.data.content || ''}
                language="yaml"
                height="200px"
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true
                }}
              />
            </Box>
          );

        case CONFIGMAP_TYPES.CERTIFICATE:
          return (
            <Box>
              {configMap.data.entries?.map((entry, index) => (
                <Grid container spacing={2} key={index} sx={{ mb: 2 }}>
                  <Grid item xs={5}>
                    <TextField
                      fullWidth
                      label={t('podDeployment:podDeployment.configMap.fields.key')}
                      value={entry.key}
                      disabled
                    />
                  </Grid>
                  <Grid item xs={7}>
                    <TextField
                      fullWidth
                      label={t('podDeployment:podDeployment.configMap.fields.value')}
                      value={entry.value}
                      disabled
                      multiline
                      rows={4}
                    />
                  </Grid>
                </Grid>
              ))}
            </Box>
          );

        default:
          return null;
      }
    };

    return (
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="subtitle1">
              {configMap.name} ({t(`podDeployment:configMap.types.${configMap.type}`)})
            </Typography>
            {CONFIGMAP_TYPE_INFO[configMap.type] && (
              <Tooltip title={t(CONFIGMAP_TYPE_INFO[configMap.type].description)}>
                <IconButton size="small">
                  <HelpOutlineIcon />
                </IconButton>
              </Tooltip>
            )}
          </Box>
          <Box>
            <IconButton onClick={() => onEdit(configMap)}>
              <EditIcon />
            </IconButton>
            <IconButton color="error" onClick={() => onDelete(configMap)}>
              <DeleteIcon />
            </IconButton>
          </Box>
        </Box>
        {renderContent()}
      </Paper>
    );
  };

  return (
    <Box>
      {/* Header with Create and Preview buttons */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">
          {t('podDeployment:podDeployment.configMap.title')}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={showYaml ? <VisibilityOffIcon /> : <VisibilityIcon />}
            onClick={() => setShowYaml(!showYaml)}
          >
            {showYaml 
              ? t('podDeployment:podDeployment.configMap.hidePreview')
              : t('podDeployment:podDeployment.configMap.showPreview')
            }
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateConfigMap}
          >
            {t('podDeployment:podDeployment.configMap.add')}
          </Button>
        </Box>
      </Box>

      {/* YAML Preview */}
      {showYaml && configMaps.length > 0 && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            {t('podDeployment:podDeployment.configMap.preview')}
          </Typography>
          <pre style={{ 
            margin: 0, 
            whiteSpace: 'pre-wrap',
            backgroundColor: '#f5f5f5',
            padding: '16px',
            borderRadius: '4px',
            fontSize: '14px'
          }}>
            {generateConfigMapYaml(configMaps)}
          </pre>
        </Paper>
      )}

      {/* ConfigMap List */}
      {configMaps.map((configMap, index) => (
        <ConfigMapDisplay
          key={index}
          configMap={configMap}
          onEdit={(cm) => {
            setEditIndex(index);
            setSelectedType(cm.type);
            setNewConfigMap(cm);
            setCreateDialogOpen(true);
          }}
          onDelete={() => handleDeleteConfigMap(index)}
        />
      ))}

      {/* Create/Edit Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          {editIndex !== null 
            ? t('podDeployment:podDeployment.configMap.edit')
            : t('podDeployment:podDeployment.configMap.create')
          }
        </DialogTitle>
        <DialogContent sx={{ width: '100%', p: 3 }}>
          <Grid container spacing={2}>
            {/* ConfigMap Type Selection */}
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>
                  {t('podDeployment:podDeployment.configMap.type')}
                </InputLabel>
                <Select
                  value={selectedType}
                  onChange={(e) => handleTypeSelect(e.target.value)}
                  label={t('podDeployment:podDeployment.configMap.type')}
                >
                  {Object.entries(CONFIGMAP_TYPES).map(([key, value]) => (
                    <MenuItem key={key} value={value}>
                      {t(`podDeployment:configMap.types.${value}`)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* ConfigMap Name */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('podDeployment:podDeployment.configMap.fields.name')}
                value={newConfigMap.name}
                onChange={(e) => setNewConfigMap(prev => ({
                  ...prev,
                  name: e.target.value
                }))}
                helperText={t('podDeployment:podDeployment.configMap.nameHelp')}
              />
            </Grid>

            {/* Type-specific fields */}
            <Grid item xs={12} sx={{ width: '100%' }}>
              {renderTypeSpecificFields()}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>
            {t('common:common.cancel')}
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveConfigMap}
          >
            {t('common:common.save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ConfigMapEditor; 