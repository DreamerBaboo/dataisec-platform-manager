import React, { useState, useEffect } from 'react';
import { logger } from '../../../utils/logger'; // 導入 logger
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
import { api } from '../../../utils/api';

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
      logger.info('開始獲取節點列表...');
      
      const nodeData = await api.get('api/k8s/nodes');
      logger.info('獲取到的節點數據:', nodeData);
      
      const formattedNodes = (Array.isArray(nodeData) ? nodeData : []).map(node => ({
        name: node.name,
        hostname: node.hostname || '',
        internalIP: node.internalIP || '',
        roles: node.roles || [],
        status: node.status,
        label: `${node.hostname || ''} (${node.name})`
      }));
      
      logger.info('格式化後的節點數據:', formattedNodes);
      setNodes(formattedNodes);
      
      // 清除任何之前的錯誤
      setLocalErrors(prev => {
        const { fetch, ...rest } = prev;
        return rest;
      });
      
    } catch (error) {
      console.error('獲取節點列表失敗:', error);
      setLocalErrors(prev => ({
        ...prev,
        fetch: t('podDeployment:podDeployment.errors.fetchNodesFailed')
      }));
      setNodes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAffinityChange = async (field, value) => {
    try {
      logger.info(`更新親和性配置: ${field} = ${value}`);
      
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

      // 更新父組件狀態
      onChange(updatedConfig);

      // 保存到配置文件
      await api.post(`api/deployment-config/${config.name}/${config.version}`, updatedConfig);

      logger.info(`✅ 親和性字段 ${field} 已保存:`, value);
      
      // 清除該字段的錯誤
      setLocalErrors(prev => {
        const { [field]: removed, ...rest } = prev;
        return rest;
      });
      
    } catch (error) {
      console.error(`❌ 保存親和性字段 ${field} 失敗:`, error);
      setLocalErrors(prev => ({
        ...prev,
        [field]: t('podDeployment:podDeployment.errors.saveFieldFailed')
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