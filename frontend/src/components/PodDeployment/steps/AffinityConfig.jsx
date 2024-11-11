import React, { useState, useEffect } from 'react';
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

const AffinityConfig = ({ config, onChange, errors = {} }) => {
  const { t } = useAppTranslation();
  const [localErrors, setLocalErrors] = useState({});
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchNodes();
  }, []);

  const fetchNodes = async () => {
    try {
      setLoading(true);
      const response = await podDeploymentService.getNodes();
      setNodes(response || []);
    } catch (error) {
      console.error('Failed to fetch nodes:', error);
      setLocalErrors(prev => ({
        ...prev,
        fetch: 'Failed to fetch nodes'
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleAffinityChange = async (field, value) => {
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

      console.log(`✅ Affinity field ${field} saved to config.json:`, value);
    } catch (error) {
      console.error(`❌ Failed to save affinity field ${field}:`, error);
      setLocalErrors(prev => ({
        ...prev,
        [field]: 'Failed to save value'
      }));
    }
  };

  const renderAffinityField = (field, label, placeholder) => {
    const hasDefaultValues = config.yamlTemplate?.defaultValues?.[field];

    if (hasDefaultValues) {
      return (
        <Autocomplete
          freeSolo
          options={config.yamlTemplate.defaultValues[field]}
          value={config.yamlTemplate?.placeholders?.[field] || ''}
          onChange={(_, newValue) => handleAffinityChange(field, newValue)}
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
        onChange={(e) => handleAffinityChange(field, e.target.value)}
        placeholder={placeholder}
        error={!!errors?.[field] || !!localErrors?.[field]}
        helperText={errors?.[field] || localErrors?.[field]}
      />
    );
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {t('podDeployment:podDeployment.affinityConfig.title')}
      </Typography>

      <Paper sx={{ p: 3 }}>
        <Grid container spacing={3}>
          {/* Node Selector */}
          <Grid item xs={12} md={6}>
            {renderAffinityField(
              'node_selector',
              t('podDeployment:podDeployment.affinity.nodeSelector'),
              t('podDeployment:podDeployment.affinity.nodeSelectorPlaceholder')
            )}
          </Grid>

          {/* Site Node */}
          <Grid item xs={12} md={6}>
            {renderAffinityField(
              'site_node',
              t('podDeployment:podDeployment.affinity.siteNode'),
              t('podDeployment:podDeployment.affinity.siteNodePlaceholder')
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

export default AffinityConfig; 