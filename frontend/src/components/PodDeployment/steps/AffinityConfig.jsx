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

const AffinityConfig = ({ config, onChange, errors }) => {
  const { t } = useAppTranslation();

  const handleNodeSelectorChange = (value) => {
    onChange({
      ...config,
      yamlTemplate: {
        ...config.yamlTemplate,
        placeholders: {
          ...config.yamlTemplate.placeholders,
          node_selector: value
        }
      }
    });
  };

  const handleSiteNodeChange = (value) => {
    onChange({
      ...config,
      yamlTemplate: {
        ...config.yamlTemplate,
        placeholders: {
          ...config.yamlTemplate.placeholders,
          site_node: value
        }
      }
    });
  };

  const renderAffinityField = (field, placeholder) => {
    const hasDefaultValues = config.yamlTemplate?.defaultValues?.[placeholder];
    const currentValue = config.yamlTemplate?.placeholders?.[placeholder] || '';

    if (hasDefaultValues) {
      return (
        <Autocomplete
          freeSolo
          value={currentValue}
          onChange={(_, newValue) => {
            if (field === 'nodeSelector') {
              handleNodeSelectorChange(newValue);
            } else if (field === 'siteNode') {
              handleSiteNodeChange(newValue);
            }
          }}
          options={config.yamlTemplate.defaultValues[placeholder]}
          renderInput={(params) => (
            <TextField
              {...params}
              fullWidth
              label={t(`podDeployment:podDeployment.affinity.${field}`)}
              error={!!errors?.affinity?.[field]}
              helperText={errors?.affinity?.[field]}
            />
          )}
        />
      );
    }

    return (
      <TextField
        fullWidth
        label={t(`podDeployment:podDeployment.affinity.${field}`)}
        value={currentValue}
        onChange={(e) => {
          if (field === 'nodeSelector') {
            handleNodeSelectorChange(e.target.value);
          } else if (field === 'siteNode') {
            handleSiteNodeChange(e.target.value);
          }
        }}
        error={!!errors?.affinity?.[field]}
        helperText={errors?.affinity?.[field]}
      />
    );
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {t('podDeployment:podDeployment.affinity.title')}
      </Typography>

      {errors?.affinity && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errors.affinity}
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom>
              {t('podDeployment:podDeployment.affinity.nodeSelector')}
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                {renderAffinityField('nodeSelector', 'node_selector')}
              </Grid>
              <Grid item xs={12} sm={6}>
                {renderAffinityField('siteNode', 'site_node')}
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default AffinityConfig; 