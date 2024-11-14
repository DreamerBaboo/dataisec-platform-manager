import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  TextField,
  Paper,
  Alert,
  Autocomplete,
  CircularProgress
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
      const response = await fetch('/api/k8s/nodes', {
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token')}` 
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch nodes');
      }

      const nodeData = await response.json();
      const formattedNodes = nodeData.map(node => ({
        name: node.name,
        hostname: node.hostname || '',
        internalIP: node.internalIP || '',
        roles: node.roles || [],
        status: node.status,
        label: `${node.hostname || ''} (${node.name})`
      }));
      
      setNodes(formattedNodes);
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
    if (field === 'site_node') {
      return (
        <Autocomplete
          options={nodes}
          getOptionLabel={(option) => {
            if (typeof option === 'string') return option;
            return option.label || option.hostname || option.name;
          }}
          value={config.yamlTemplate?.placeholders?.[field] || ''}
          onChange={(_, newValue) => {
            const valueToSave = newValue ? (newValue.hostname || newValue.name || newValue) : '';
            handleAffinityChange(field, valueToSave);
          }}
          loading={loading}
          renderOption={(props, option) => (
            <li {...props}>
              <Box>
                <Typography>{option.hostname}</Typography>
                <Typography variant="caption" color="textSecondary">
                  Node: {option.name}
                  {option.roles?.length > 0 && ` • Roles: ${option.roles.join(', ')}`}
                  {option.internalIP && ` • IP: ${option.internalIP}`}
                </Typography>
              </Box>
            </li>
          )}
          renderInput={(params) => (
            <TextField
              {...params}
              fullWidth
              label={label}
              placeholder={loading ? t('common:loading') : placeholder}
              error={!!errors?.[field] || !!localErrors?.[field]}
              helperText={errors?.[field] || localErrors?.[field]}
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <>
                    {loading && <CircularProgress color="inherit" size={20} />}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
            />
          )}
        />
      );
    }

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

  // 檢查佔位符是否存在
  const hasPlaceholder = (field) => {
    const placeholders = Object.keys(config.yamlTemplate?.placeholders || {});
    return placeholders.includes(field);
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {t('podDeployment:podDeployment.affinityConfig.title')}
      </Typography>

      <Paper sx={{ p: 3 }}>
        <Grid container spacing={3}>
          {/* Node Selector - 始終顯示 */}
          <Grid item xs={12} md={hasPlaceholder('site_node') ? 6 : 12}>
            {renderAffinityField(
              'node_selector',
              t('podDeployment:podDeployment.affinity.nodeSelector'),
              t('podDeployment:podDeployment.affinity.nodeSelectorPlaceholder')
            )}
          </Grid>

          {/* Site Node - 只在佔位符存在時顯示 */}
          {hasPlaceholder('site_node') && (
            <Grid item xs={12} md={6}>
              {renderAffinityField(
                'site_node',
                t('podDeployment:podDeployment.affinity.siteNode'),
                t('podDeployment:podDeployment.affinity.siteNodePlaceholder')
              )}
            </Grid>
          )}
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