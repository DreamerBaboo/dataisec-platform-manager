import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  TextField,
  Paper,
  Alert,
  Autocomplete
} from '@mui/material';
import { useAppTranslation } from '../../../hooks/useAppTranslation';
import { podDeploymentService } from '../../../services/podDeploymentService';

const ResourceConfig = ({ config, onChange, errors = {} }) => {
  const { t } = useAppTranslation();
  const [localErrors, setLocalErrors] = useState({});

  const handleResourceChange = async (field, value) => {
    try {
      const updatedConfig = {
        ...config,
        yamlTemplate: {
          ...config.yamlTemplate,
          placeholders: {
            ...config.yamlTemplate?.placeholders,
            [field]: value
          }
        }
      };

      // Update parent state
      onChange(updatedConfig);

      // Save to config.json
      await podDeploymentService.saveDeploymentConfig(
        config.name,
        config.version,
        updatedConfig
      );

      console.log(`✅ Resource field ${field} saved to config.json:`, value);
    } catch (error) {
      console.error(`❌ Failed to save resource field ${field}:`, error);
      setLocalErrors(prev => ({
        ...prev,
        [field]: 'Failed to save value'
      }));
    }
  };

  const renderResourceField = (field, label, placeholder) => {
    const hasDefaultValues = config.yamlTemplate?.defaultValues?.[field];

    if (hasDefaultValues) {
      return (
        <Autocomplete
          freeSolo
          options={config.yamlTemplate.defaultValues[field]}
          value={config.yamlTemplate?.placeholders?.[field] || ''}
          onChange={(_, newValue) => handleResourceChange(field, newValue)}
          renderInput={(params) => (
            <TextField
              {...params}
              fullWidth
              label={label}
              placeholder={placeholder}
              error={!!errors?.[field] || !!localErrors?.[field]}
              helperText={errors?.[field] || localErrors?.[field]}
            />
          )}
        />
      );
    }

    return (
      <TextField
        fullWidth
        label={label}
        value={config.yamlTemplate?.placeholders?.[field] || ''}
        onChange={(e) => handleResourceChange(field, e.target.value)}
        placeholder={placeholder}
        error={!!errors?.[field] || !!localErrors?.[field]}
        helperText={errors?.[field] || localErrors?.[field]}
      />
    );
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {t('podDeployment:podDeployment.resourceConfig.title')}
      </Typography>

      <Paper sx={{ p: 3 }}>
        <Grid container spacing={3}>
          {/* CPU Requests */}
          <Grid item xs={12} md={6}>
            {renderResourceField(
              'cpu_request',
              t('podDeployment:podDeployment.basic.requestsCpu'),
              'e.g., 100m'
            )}
          </Grid>

          {/* Memory Requests */}
          <Grid item xs={12} md={6}>
            {renderResourceField(
              'memory_request',
              t('podDeployment:podDeployment.basic.requestsMemory'),
              'e.g., 128Mi'
            )}
          </Grid>

          {/* CPU Limits */}
          <Grid item xs={12} md={6}>
            {renderResourceField(
              'cpu_limit',
              t('podDeployment:podDeployment.basic.limitsCpu'),
              'e.g., 200m'
            )}
          </Grid>

          {/* Memory Limits */}
          <Grid item xs={12} md={6}>
            {renderResourceField(
              'memory_limit',
              t('podDeployment:podDeployment.basic.limitsMemory'),
              'e.g., 256Mi'
            )}
          </Grid>
        </Grid>
      </Paper>

      {Object.keys(localErrors).length > 0 && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {t('podDeployment:podDeployment.errors.saveFailed')}
        </Alert>
      )}
    </Box>
  );
};

export default ResourceConfig; 