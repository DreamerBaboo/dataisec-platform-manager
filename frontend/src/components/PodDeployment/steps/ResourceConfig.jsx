import React, { useState } from 'react';
import { logger } from '../../../utils/logger'; // 導入 logger
import {
  Box,
  Typography,
  Grid,
  TextField,
  Paper,
  Alert,
  Autocomplete,
  Divider
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

      logger.info(`✅ Resource field ${field} saved to config.json:`, value);
    } catch (error) {
      console.error(`❌ Failed to save resource field ${field}:`, error);
      setLocalErrors(prev => ({
        ...prev,
        [field]: 'Failed to save value'
      }));
    }
  };

  const renderResourceField = (field, label, placeholder) => {
    const defaultValues = config.yamlTemplate?.defaultValues?.[field] || [];
    const currentValue = config.yamlTemplate?.placeholders?.[field] || '';

    return (
      <Autocomplete
        freeSolo
        options={defaultValues}
        value={currentValue}
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
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {t('podDeployment:podDeployment.resourceConfig.title')}
      </Typography>

      <Paper sx={{ p: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          {t('podDeployment:podDeployment.resourceConfig.containerResources')}
        </Typography>
        
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

        <Divider sx={{ my: 3 }} />

        <Typography variant="subtitle2" gutterBottom>
          {t('podDeployment:podDeployment.resourceConfig.javaHeapSettings')}
        </Typography>

        <Grid container spacing={3}>
          {/* Java Heap Size */}
          <Grid item xs={12}>
            {renderResourceField(
              'java_heap',
              t('podDeployment:podDeployment.basic.javaHeap'),
              'e.g., -Xms512m -Xmx1024m'
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