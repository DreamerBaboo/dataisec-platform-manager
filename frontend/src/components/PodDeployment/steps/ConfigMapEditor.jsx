import React from 'react';
import {
  Box,
  Grid,
  Typography,
  TextField,
  Alert,
  Button,
  IconButton,
  Card,
  CardContent,
  CardActions,
  CardHeader,
  Collapse
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon
} from '@mui/icons-material';
import { useAppTranslation } from '../../../hooks/useAppTranslation';

const ConfigMapEditor = ({ config, onChange, errors }) => {
  const { t } = useAppTranslation();
  const [expandedMap, setExpandedMap] = React.useState({});

  const handleConfigMapChange = (index, field, value) => {
    const newConfigMaps = [...(config.yamlTemplate?.configMaps || [])];
    if (!newConfigMaps[index]) {
      newConfigMaps[index] = { data: {} };
    }
    
    if (field === 'data') {
      try {
        // Parse data as key-value pairs
        const parsedData = typeof value === 'string' ? 
          value.split('\n').reduce((acc, line) => {
            const [key, ...values] = line.split(':');
            if (key && key.trim()) {
              acc[key.trim()] = values.join(':').trim();
            }
            return acc;
          }, {}) : value;
        newConfigMaps[index].data = parsedData;
      } catch (error) {
        newConfigMaps[index].data = value;
      }
    } else {
      newConfigMaps[index][field] = value;
    }

    onChange({
      ...config,
      yamlTemplate: {
        ...config.yamlTemplate,
        configMaps: newConfigMaps
      }
    });
  };

  const handleAddConfigMap = () => {
    const newConfigMaps = [...(config.yamlTemplate?.configMaps || []), {
      name: '',
      mountPath: '',
      data: {}
    }];

    onChange({
      ...config,
      yamlTemplate: {
        ...config.yamlTemplate,
        configMaps: newConfigMaps
      }
    });
  };

  const handleRemoveConfigMap = (index) => {
    const newConfigMaps = config.yamlTemplate?.configMaps?.filter((_, i) => i !== index) || [];
    onChange({
      ...config,
      yamlTemplate: {
        ...config.yamlTemplate,
        configMaps: newConfigMaps
      }
    });
  };

  const handleAddConfigItem = (configMapIndex) => {
    const newConfigMaps = [...(config.yamlTemplate?.configMaps || [])];
    const configMap = newConfigMaps[configMapIndex];
    const newKey = `key${Object.keys(configMap.data || {}).length + 1}`;
    
    newConfigMaps[configMapIndex] = {
      ...configMap,
      data: {
        ...(configMap.data || {}),
        [newKey]: ''
      }
    };

    onChange({
      ...config,
      yamlTemplate: {
        ...config.yamlTemplate,
        configMaps: newConfigMaps
      }
    });
  };

  const handleConfigItemChange = (configMapIndex, key, field, value) => {
    const newConfigMaps = [...(config.yamlTemplate?.configMaps || [])];
    const configMap = newConfigMaps[configMapIndex];
    
    if (field === 'key') {
      const oldData = configMap.data || {};
      const newData = {};
      Object.entries(oldData).forEach(([k, v]) => {
        if (k === key) {
          newData[value] = v;
        } else {
          newData[k] = v;
        }
      });
      newConfigMaps[configMapIndex].data = newData;
    } else {
      newConfigMaps[configMapIndex].data = {
        ...(configMap.data || {}),
        [key]: value
      };
    }

    onChange({
      ...config,
      yamlTemplate: {
        ...config.yamlTemplate,
        configMaps: newConfigMaps
      }
    });
  };

  const toggleExpanded = (index) => {
    setExpandedMap(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {t('podDeployment:podDeployment.configMaps.title')}
      </Typography>

      {errors?.configMaps && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errors.configMaps}
        </Alert>
      )}

      <Box sx={{ mb: 2 }}>
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={handleAddConfigMap}
        >
          {t('podDeployment:podDeployment.configMaps.add')}
        </Button>
      </Box>

      <Grid container spacing={2}>
        {config.yamlTemplate?.configMaps?.map((configMap, index) => (
          <Grid item xs={12} key={index}>
            <Card variant="outlined">
              <CardHeader
                title={
                  <TextField
                    fullWidth
                    label={t('podDeployment:podDeployment.configMaps.name')}
                    value={configMap.name || ''}
                    onChange={(e) => handleConfigMapChange(index, 'name', e.target.value)}
                    error={!!errors?.configMaps?.[index]?.name}
                    helperText={errors?.configMaps?.[index]?.name}
                  />
                }
                action={
                  <IconButton onClick={() => toggleExpanded(index)}>
                    {expandedMap[index] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </IconButton>
                }
              />
              <Collapse in={expandedMap[index]}>
                <CardContent>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label={t('podDeployment:podDeployment.configMaps.mountPath')}
                        value={configMap.mountPath || ''}
                        onChange={(e) => handleConfigMapChange(index, 'mountPath', e.target.value)}
                        error={!!errors?.configMaps?.[index]?.mountPath}
                        helperText={errors?.configMaps?.[index]?.mountPath}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Box sx={{ mb: 2 }}>
                        <Button
                          size="small"
                          startIcon={<AddIcon />}
                          onClick={() => handleAddConfigItem(index)}
                        >
                          {t('podDeployment:podDeployment.configMaps.addItem')}
                        </Button>
                      </Box>
                      <Grid container spacing={2}>
                        {Object.entries(configMap.data || {}).map(([key, value]) => (
                          <Grid item xs={12} key={key}>
                            <Grid container spacing={2}>
                              <Grid item xs={4}>
                                <TextField
                                  fullWidth
                                  label={t('podDeployment:podDeployment.configMaps.key')}
                                  value={key}
                                  onChange={(e) => handleConfigItemChange(index, key, 'key', e.target.value)}
                                />
                              </Grid>
                              <Grid item xs={8}>
                                <TextField
                                  fullWidth
                                  label={t('podDeployment:podDeployment.configMaps.value')}
                                  value={value}
                                  onChange={(e) => handleConfigItemChange(index, key, 'value', e.target.value)}
                                  multiline
                                  rows={1}
                                />
                              </Grid>
                            </Grid>
                          </Grid>
                        ))}
                      </Grid>
                    </Grid>
                  </Grid>
                </CardContent>
              </Collapse>
              <CardActions sx={{ justifyContent: 'flex-end' }}>
                <IconButton
                  color="error"
                  onClick={() => handleRemoveConfigMap(index)}
                >
                  <DeleteIcon />
                </IconButton>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {config.yamlTemplate?.configMaps?.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            {t('podDeployment:podDeployment.configMaps.preview')}
          </Typography>
          <Card variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
              {generateConfigMapYaml(config.yamlTemplate.configMaps)}
            </pre>
          </Card>
        </Box>
      )}
    </Box>
  );
};

const generateConfigMapYaml = (configMaps) => {
  if (!configMaps?.length) return '';

  return configMaps.map(cm => `---
apiVersion: v1
kind: ConfigMap
metadata:
  name: ${cm.name}
data:
${Object.entries(cm.data || {}).map(([key, value]) => `  ${key}: ${value}`).join('\n')}

---
volumeMounts:
- name: ${cm.name}
  mountPath: ${cm.mountPath}
volumes:
- name: ${cm.name}
  configMap:
    name: ${cm.name}`).join('\n\n');
};

export default ConfigMapEditor; 