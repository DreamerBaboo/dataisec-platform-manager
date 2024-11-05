import React from 'react';
import {
  Box,
  Grid,
  Typography,
  TextField,
  Alert,
  Paper,
  Autocomplete
} from '@mui/material';
import { useAppTranslation } from '../../../hooks/useAppTranslation';

const ResourceConfig = ({ config, onChange, errors }) => {
  const { t } = useAppTranslation();

  const handleResourceChange = (type, resource, value) => {
    onChange({
      ...config,
      yamlTemplate: {
        ...config.yamlTemplate,
        placeholders: {
          ...config.yamlTemplate.placeholders,
          [`${resource}_${type}`.toLowerCase()]: value
        }
      }
    });
  };

  const renderResourceField = (type, resource) => {
    const placeholder = `${resource}_${type}`.toLowerCase();
    const hasDefaultValues = config.yamlTemplate?.defaultValues?.[placeholder];
    const currentValue = config.yamlTemplate?.placeholders?.[placeholder] || '';

    if (hasDefaultValues) {
      return (
        <Autocomplete
          freeSolo
          value={currentValue}
          onChange={(_, newValue) => handleResourceChange(type, resource, newValue)}
          options={config.yamlTemplate.defaultValues[placeholder]}
          renderInput={(params) => (
            <TextField
              {...params}
              fullWidth
              label={t(`podDeployment:podDeployment.resources.${resource}`)}
              error={!!errors?.resources?.[resource]?.[type]}
              helperText={errors?.resources?.[resource]?.[type] || 
                         resource === 'cpu' ? 'e.g., 100m, 0.5, 1' : 'e.g., 128Mi, 1Gi'}
            />
          )}
        />
      );
    }

    return (
      <TextField
        fullWidth
        label={t(`podDeployment:podDeployment.resources.${resource}`)}
        value={currentValue}
        onChange={(e) => handleResourceChange(type, resource, e.target.value)}
        error={!!errors?.resources?.[resource]?.[type]}
        helperText={errors?.resources?.[resource]?.[type] || 
                   resource === 'cpu' ? 'e.g., 100m, 0.5, 1' : 'e.g., 128Mi, 1Gi'}
      />
    );
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {t('podDeployment:podDeployment.resources.title')}
      </Typography>

      {errors?.resources && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errors.resources}
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom>
              {t('podDeployment:podDeployment.resources.limits')}
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                {renderResourceField('limit', 'cpu')}
              </Grid>
              <Grid item xs={12} sm={6}>
                {renderResourceField('limit', 'memory')}
              </Grid>
            </Grid>
          </Grid>

          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom>
              {t('podDeployment:podDeployment.resources.requests')}
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                {renderResourceField('request', 'cpu')}
              </Grid>
              <Grid item xs={12} sm={6}>
                {renderResourceField('request', 'memory')}
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default ResourceConfig; 