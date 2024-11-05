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
  Collapse,
  InputAdornment
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon
} from '@mui/icons-material';
import { useAppTranslation } from '../../../hooks/useAppTranslation';

const SecretEditor = ({ config, onChange, errors }) => {
  const { t } = useAppTranslation();
  const [expandedMap, setExpandedMap] = React.useState({});
  const [showValues, setShowValues] = React.useState({});

  const handleSecretChange = (index, field, value) => {
    const newSecrets = [...(config.yamlTemplate?.secrets || [])];
    if (!newSecrets[index]) {
      newSecrets[index] = { data: {} };
    }
    
    if (field === 'data') {
      try {
        const parsedData = typeof value === 'string' ? 
          value.split('\n').reduce((acc, line) => {
            const [key, ...values] = line.split(':');
            if (key && key.trim()) {
              acc[key.trim()] = values.join(':').trim();
            }
            return acc;
          }, {}) : value;
        newSecrets[index].data = parsedData;
      } catch (error) {
        newSecrets[index].data = value;
      }
    } else {
      newSecrets[index][field] = value;
    }

    onChange({
      ...config,
      yamlTemplate: {
        ...config.yamlTemplate,
        secrets: newSecrets
      }
    });
  };

  const handleAddSecret = () => {
    const newSecrets = [...(config.yamlTemplate?.secrets || []), {
      name: '',
      mountPath: '',
      data: {}
    }];

    onChange({
      ...config,
      yamlTemplate: {
        ...config.yamlTemplate,
        secrets: newSecrets
      }
    });
  };

  const handleRemoveSecret = (index) => {
    const newSecrets = config.yamlTemplate?.secrets?.filter((_, i) => i !== index) || [];
    onChange({
      ...config,
      yamlTemplate: {
        ...config.yamlTemplate,
        secrets: newSecrets
      }
    });
  };

  const handleAddSecretItem = (secretIndex) => {
    const newSecrets = [...(config.yamlTemplate?.secrets || [])];
    const secret = newSecrets[secretIndex];
    const newKey = `key${Object.keys(secret.data || {}).length + 1}`;
    
    newSecrets[secretIndex] = {
      ...secret,
      data: {
        ...(secret.data || {}),
        [newKey]: ''
      }
    };

    onChange({
      ...config,
      yamlTemplate: {
        ...config.yamlTemplate,
        secrets: newSecrets
      }
    });
  };

  const handleSecretItemChange = (secretIndex, key, field, value) => {
    const newSecrets = [...(config.yamlTemplate?.secrets || [])];
    const secret = newSecrets[secretIndex];
    
    if (field === 'key') {
      const oldData = secret.data || {};
      const newData = {};
      Object.entries(oldData).forEach(([k, v]) => {
        if (k === key) {
          newData[value] = v;
        } else {
          newData[k] = v;
        }
      });
      newSecrets[secretIndex].data = newData;
    } else {
      newSecrets[secretIndex].data = {
        ...(secret.data || {}),
        [key]: value
      };
    }

    onChange({
      ...config,
      yamlTemplate: {
        ...config.yamlTemplate,
        secrets: newSecrets
      }
    });
  };

  const toggleExpanded = (index) => {
    setExpandedMap(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const toggleShowValue = (secretIndex, key) => {
    setShowValues(prev => ({
      ...prev,
      [`${secretIndex}-${key}`]: !prev[`${secretIndex}-${key}`]
    }));
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {t('podDeployment:podDeployment.secrets.title')}
      </Typography>

      {errors?.secrets && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errors.secrets}
        </Alert>
      )}

      <Box sx={{ mb: 2 }}>
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={handleAddSecret}
        >
          {t('podDeployment:podDeployment.secrets.add')}
        </Button>
      </Box>

      <Grid container spacing={2}>
        {config.yamlTemplate?.secrets?.map((secret, index) => (
          <Grid item xs={12} key={index}>
            <Card variant="outlined">
              <CardHeader
                title={
                  <TextField
                    fullWidth
                    label={t('podDeployment:podDeployment.secrets.name')}
                    value={secret.name || ''}
                    onChange={(e) => handleSecretChange(index, 'name', e.target.value)}
                    error={!!errors?.secrets?.[index]?.name}
                    helperText={errors?.secrets?.[index]?.name}
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
                        label={t('podDeployment:podDeployment.secrets.mountPath')}
                        value={secret.mountPath || ''}
                        onChange={(e) => handleSecretChange(index, 'mountPath', e.target.value)}
                        error={!!errors?.secrets?.[index]?.mountPath}
                        helperText={errors?.secrets?.[index]?.mountPath}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Box sx={{ mb: 2 }}>
                        <Button
                          size="small"
                          startIcon={<AddIcon />}
                          onClick={() => handleAddSecretItem(index)}
                        >
                          {t('podDeployment:podDeployment.secrets.addItem')}
                        </Button>
                      </Box>
                      <Grid container spacing={2}>
                        {Object.entries(secret.data || {}).map(([key, value]) => (
                          <Grid item xs={12} key={key}>
                            <Grid container spacing={2}>
                              <Grid item xs={4}>
                                <TextField
                                  fullWidth
                                  label={t('podDeployment:podDeployment.secrets.key')}
                                  value={key}
                                  onChange={(e) => handleSecretItemChange(index, key, 'key', e.target.value)}
                                />
                              </Grid>
                              <Grid item xs={8}>
                                <TextField
                                  fullWidth
                                  type={showValues[`${index}-${key}`] ? 'text' : 'password'}
                                  label={t('podDeployment:podDeployment.secrets.value')}
                                  value={value}
                                  onChange={(e) => handleSecretItemChange(index, key, 'value', e.target.value)}
                                  InputProps={{
                                    endAdornment: (
                                      <InputAdornment position="end">
                                        <IconButton
                                          onClick={() => toggleShowValue(index, key)}
                                          edge="end"
                                        >
                                          {showValues[`${index}-${key}`] ? 
                                            <VisibilityOffIcon /> : 
                                            <VisibilityIcon />}
                                        </IconButton>
                                      </InputAdornment>
                                    )
                                  }}
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
                  onClick={() => handleRemoveSecret(index)}
                >
                  <DeleteIcon />
                </IconButton>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {config.yamlTemplate?.secrets?.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            {t('podDeployment:podDeployment.secrets.preview')}
          </Typography>
          <Card variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
              {generateSecretYaml(config.yamlTemplate.secrets)}
            </pre>
          </Card>
        </Box>
      )}
    </Box>
  );
};

const generateSecretYaml = (secrets) => {
  if (!secrets?.length) return '';

  return secrets.map(secret => `---
apiVersion: v1
kind: Secret
metadata:
  name: ${secret.name}
type: Opaque
data:
${Object.entries(secret.data || {}).map(([key, value]) => 
  `  ${key}: ${Buffer.from(value || '').toString('base64')}`
).join('\n')}

---
volumeMounts:
- name: ${secret.name}
  mountPath: ${secret.mountPath}
volumes:
- name: ${secret.name}
  secret:
    secretName: ${secret.name}`).join('\n\n');
};

export default SecretEditor; 