import React, { useState, useEffect } from 'react';
import { logger } from '../../../utils/logger.ts';  // 導入 logger
import {
  Box,
  Grid,
  Typography,
  TextField,
  Alert,
  Paper,
  Button
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useAppTranslation } from '../../../hooks/useAppTranslation';
import { podDeploymentService } from '../../../services/podDeploymentService';

const NamespaceQuotaConfig = ({ config, onChange, errors }) => {
  const { t } = useAppTranslation();
  const [showYaml, setShowYaml] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [localQuota, setLocalQuota] = useState(null);
  const [localErrors, setLocalErrors] = useState({});
  const [isUserEdited, setIsUserEdited] = useState(false);

  // Function to calculate default quotas
  const calculateDefaultQuotas = () => {
    const replicas = parseInt(config.yamlTemplate?.placeholders?.replica_count) || 1;
    const scaleFactor = replicas * 3;
    const podScaleFactor = replicas + 1;

    const cpuRequest = parseFloat(config.yamlTemplate?.placeholders?.cpu_request || '0.1');
    const cpuLimit = parseFloat(config.yamlTemplate?.placeholders?.cpu_limit || '0.2');

    const totalInstances = replicas + 1;
    const totalCpuRequest = formatCpuValue((totalInstances * cpuRequest));
    const totalCpuLimit = formatCpuValue((totalInstances * cpuLimit));

    return {
      requestsCpu: totalCpuRequest,
      limitsCpu: totalCpuLimit,
      requestsMemory: formatMemory(totalInstances * parseMemory(config.yamlTemplate?.placeholders?.memory_request || '128Mi')),
      limitsMemory: formatMemory(totalInstances * parseMemory(config.yamlTemplate?.placeholders?.memory_limit || '256Mi')),
      pods: `${podScaleFactor}`,
      configmaps: `${scaleFactor}`,
      pvcs: `${scaleFactor}`,
      services: `${scaleFactor}`,
      secrets: `${scaleFactor}`,
      deployments: `${podScaleFactor}`,
      replicasets: `${scaleFactor}`,
      statefulsets: `${scaleFactor}`,
      jobs: '10',
      cronjobs: '10'
    };
  };

  // 添加加載 YAML 的函數
  const loadQuotaFromYaml = async () => {
    try {
      const response = await podDeploymentService.getDeployScript(
        config.name,
        config.version,
        `${config.name}-${config.version}-quota.yaml`
      );
      
      if (response) {
        // 解析 YAML 中的配額值
        const quotaValues = {};
        const lines = response.split('\n');
        lines.forEach(line => {
          if (line.includes('requests.cpu:')) {
            quotaValues.requestsCpu = line.split('"')[1];
          } else if (line.includes('requests.memory:')) {
            quotaValues.requestsMemory = line.split('"')[1];
          } else if (line.includes('limits.cpu:')) {
            quotaValues.limitsCpu = line.split('"')[1];
          } else if (line.includes('limits.memory:')) {
            quotaValues.limitsMemory = line.split('"')[1];
          } else if (line.includes('pods:')) {
            quotaValues.pods = line.split('"')[1];
          } else if (line.includes('configmaps:')) {
            quotaValues.configmaps = line.split('"')[1];
          } else if (line.includes('persistentvolumeclaims:')) {
            quotaValues.pvcs = line.split('"')[1];
          } else if (line.includes('services:')) {
            quotaValues.services = line.split('"')[1];
          } else if (line.includes('secrets:')) {
            quotaValues.secrets = line.split('"')[1];
          } else if (line.includes('count/deployments.apps:')) {
            quotaValues.deployments = line.split('"')[1];
          } else if (line.includes('count/replicasets.apps:')) {
            quotaValues.replicasets = line.split('"')[1];
          } else if (line.includes('count/statefulsets.apps:')) {
            quotaValues.statefulsets = line.split('"')[1];
          } else if (line.includes('count/jobs.batch:')) {
            quotaValues.jobs = line.split('"')[1];
          } else if (line.includes('count/cronjobs.batch:')) {
            quotaValues.cronjobs = line.split('"')[1];
          }
        });

        setLocalQuota(quotaValues);
        onChange({
          ...config,
          resourceQuota: quotaValues
        });
      }
    } catch (error) {
      console.error('Failed to load quota from YAML:', error);
      // 如果無法加載 YAML，使用計算的默認值
      const defaultQuotas = calculateDefaultQuotas();
      setLocalQuota(defaultQuotas);
      onChange({
        ...config,
        resourceQuota: defaultQuotas
      });
    }
  };

  // 修改初始化 useEffect
  useEffect(() => {
    // 首次加載時從 YAML 加載值
    loadQuotaFromYaml();
  }, []);

  const handleQuotaChange = async (field, value) => {
    setIsUserEdited(true);
    
    // 先更新本地值，允許用戶輸入中間狀態
    const updatedQuota = {
      ...localQuota,
      [field]: value
    };
    setLocalQuota(updatedQuota);

    // 只在值不為空時進行驗證
    if (value.trim() !== '') {
      const validationErrors = validateQuota(field, value);
      if (Object.keys(validationErrors).length > 0) {
        setLocalErrors(prev => ({
          ...prev,
          ...validationErrors
        }));
        // 即使有錯誤也不阻止更新本地值
        return;
      }
    }

    // 清除該字段的錯誤
    setLocalErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });

    try {
      // 只有在值有效時才保存到後端
      if (value.trim() !== '' && !Object.keys(validateQuota(field, value)).length) {
        await podDeploymentService.saveQuotaConfig(
          config.name,
          config.version,
          updatedQuota,
          config.namespace
        );

        // 更新父組件配置
        onChange({
          ...config,
          resourceQuota: updatedQuota
        });
      }
    } catch (error) {
      console.error('Failed to save quota changes:', error);
      setLocalErrors(prev => ({
        ...prev,
        submit: t('podDeployment:quota.errors.saveFailed')
      }));
    }
  };

  const handleSaveQuota = async () => {
    try {
      await podDeploymentService.saveQuotaConfig(
        config.name,
        config.version,
        localQuota,
        config.namespace
      );

      // Update parent config
      onChange({
        ...config,
        resourceQuota: localQuota
      });

      setEditMode(false);
    } catch (error) {
      console.error('Failed to save resource quota:', error);
      setLocalErrors(prev => ({
        ...prev,
        submit: t('podDeployment:quota.errors.saveFailed')
      }));
    }
  };

  // 修改 handleEditToggle 函數
  const handleEditToggle = () => {
    if (editMode) {
      // 取消編輯 - 重置為當前 YAML 中的值
      loadQuotaFromYaml();
    }
    setEditMode(!editMode);
  };

  // Function to parse memory value and convert to Mi
  const parseMemory = (value) => {
    if (!value) return 0;
    const match = value.match(/^(\d+)(\w+)$/);
    if (!match) return 0;
    
    const [, number, unit] = match;
    const num = parseInt(number);
    
    switch (unit.toLowerCase()) {
      case 'gi':
        return num * 1024;
      case 'mi':
        return num;
      case 'ki':
        return num / 1024;
      default:
        return num;
    }
  };

  // Function to format memory value
  const formatMemory = (miValue) => {
    if (miValue >= 1024) {
      return `${Math.round(miValue / 1024)}Gi`;
    }
    return `${miValue}Mi`;
  };

  // Function to format CPU value
  const formatCpuValue = (value) => {
    if (!value) return '0';
    // Convert to string and ensure it has proper unit
    return value.toString().includes('m') ? value : `${value}m`;
  };

  // Function to save quota YAML file
  const saveQuotaYaml = async (quotas) => {
    try {
      // 使用 saveQuotaConfig 來保存配置和 YAML，並傳遞 namespace
      await podDeploymentService.saveQuotaConfig(
        config.name,
        config.version,
        quotas,
        config.namespace
      );
      
      logger.info('✅ Quota YAML saved successfully');
    } catch (error) {
      console.error('Failed to save quota YAML:', error);
      throw error;
    }
  };

  // Watch for changes in configuration
  useEffect(() => {
    if (!isUserEdited) {
      const newQuotas = calculateDefaultQuotas();
      
      // Only update if values have changed
      if (JSON.stringify(newQuotas) !== JSON.stringify(config.resourceQuota)) {
        // Update parent config
        onChange({
          ...config,
          resourceQuota: newQuotas
        });

        // Save to config.json and create YAML file
        const saveChanges = async () => {
          try {
            // 使用統一的保存方法
            await podDeploymentService.saveQuotaConfig(
              config.name,
              config.version,
              newQuotas,
              config.namespace
            );
          } catch (error) {
            console.error('Failed to save quota changes:', error);
          }
        };

        saveChanges();
      }
    }
  }, [
    config.replicas,
    config.yamlTemplate?.placeholders?.cpu_request,
    config.yamlTemplate?.placeholders?.cpu_limit,
    config.yamlTemplate?.placeholders?.memory_request,
    config.yamlTemplate?.placeholders?.memory_limit,
    config.namespace,
    isUserEdited
  ]);

  const generateQuotaYaml = (quotas) => {
    if (!quotas) return '';

    return `apiVersion: v1
kind: ResourceQuota
metadata:
  name: ${config.name}-quota
  namespace: ${config.namespace || 'default'}
spec:
  hard:
    requests.cpu: "${quotas.requestsCpu}"
    requests.memory: "${quotas.requestsMemory}"
    limits.cpu: "${quotas.limitsCpu}"
    limits.memory: "${quotas.limitsMemory}"
    pods: "${quotas.pods}"
    configmaps: "${quotas.configmaps}"
    persistentvolumeclaims: "${quotas.pvcs}"
    services: "${quotas.services}"
    secrets: "${quotas.secrets}"
    count/deployments.apps: "${quotas.deployments}"
    count/replicasets.apps: "${quotas.replicasets}"
    count/statefulsets.apps: "${quotas.statefulsets}"
    count/jobs.batch: "${quotas.jobs}"
    count/cronjobs.batch: "${quotas.cronjobs}"`;
  };

  // Add validation functions
  const validateCpuValue = (value) => {
    // CPU can be in cores (e.g., "0.5") or millicores (e.g., "500m")
    const coreRegex = /^\d*\.?\d+$/;
    const milliRegex = /^\d+m$/;
    return coreRegex.test(value) || milliRegex.test(value);
  };

  const validateMemoryValue = (value) => {
    // Memory can be in Mi or Gi
    const memoryRegex = /^\d+[MGT]i$/;
    return memoryRegex.test(value);
  };

  const validateResourceCount = (value) => {
    // Resource counts must be positive integers
    return /^\d+$/.test(value) && parseInt(value) > 0;
  };

  const validateQuota = (field, value) => {
    const errors = {};
    
    // 如果值為空，不進行驗證
    if (!value || value.trim() === '') {
      return errors;
    }

    switch (field) {
      case 'requestsCpu':
      case 'limitsCpu':
        // 允許輸入過程中的不完整值
        if (!/^(\d*\.?\d*m?)?$/.test(value)) {
          errors[field] = t('podDeployment:quota.validation.invalidCpu');
        }
        break;

      case 'requestsMemory':
      case 'limitsMemory':
        // 允許輸入過程中的不完整值
        if (!/^(\d+([MGT]i)?)?$/.test(value)) {
          errors[field] = t('podDeployment:quota.validation.invalidMemory');
        }
        break;

      case 'pods':
      case 'configmaps':
      case 'pvcs':
      case 'services':
      case 'secrets':
      case 'deployments':
      case 'replicasets':
      case 'statefulsets':
      case 'jobs':
      case 'cronjobs':
        // 允許輸入過程中的數字
        if (!/^\d*$/.test(value)) {
          errors[field] = t('podDeployment:quota.validation.invalidCount');
        }
        break;
    }

    return errors;
  };

  // 修改重置函數
  const handleReset = async () => {
    try {
      // 計算新的默認值
      const calculatedQuotas = calculateDefaultQuotas();
      
      // 保存新的配置
      await podDeploymentService.saveQuotaConfig(
        config.name,
        config.version,
        calculatedQuotas,
        config.namespace
      );

      // 更新本地狀態
      setLocalQuota(calculatedQuotas);
      setIsUserEdited(false);

      // 更新父組件配置
      onChange({
        ...config,
        resourceQuota: calculatedQuotas
      });

      logger.info('✅ Reset quota configuration to calculated values');
    } catch (error) {
      console.error('Failed to reset quotas:', error);
      setLocalErrors(prev => ({
        ...prev,
        reset: t('podDeployment:quota.errors.resetFailed')
      }));
    }
  };

  return (
    <Box>
      {/* Header with buttons */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">
          {t('podDeployment:podDeployment.basic.resourceQuota')}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={showYaml ? <VisibilityOffIcon /> : <VisibilityIcon />}
            onClick={() => setShowYaml(!showYaml)}
          >
            {showYaml 
              ? t('podDeployment:podDeployment.basic.hideQuotaPreview')
              : t('podDeployment:podDeployment.basic.showQuotaPreview')
            }
          </Button>
          {editMode ? (
            <>
              <Button
                variant="contained"
                color="primary"
                startIcon={<SaveIcon />}
                onClick={handleSaveQuota}
              >
                {t('common:common.save')}
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<CancelIcon />}
                onClick={handleEditToggle}
              >
                {t('common:common.cancel')}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="contained"
                startIcon={<EditIcon />}
                onClick={handleEditToggle}
              >
                {t('common:common.edit')}
              </Button>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={handleReset}
              >
                {t('common:common.reset')}
              </Button>
            </>
          )}
        </Box>
      </Box>

      {/* YAML Preview */}
      {showYaml && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: 'grey.50' }}>
          <Typography variant="subtitle2" gutterBottom>
            {t('podDeployment:podDeployment.basic.quotaPreview')}
          </Typography>
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
            {generateQuotaYaml(localQuota)}
          </pre>
        </Paper>
      )}

      {/* Fields */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3}>
          {/* Requests Section */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom>
              {t('podDeployment:podDeployment.resources.requests')}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label={t('podDeployment:podDeployment.basic.requestsCpu')}
              value={localQuota?.requestsCpu || ''}
              onChange={(e) => handleQuotaChange('requestsCpu', e.target.value)}
              disabled={!editMode}
              error={!!localErrors.requestsCpu}
              helperText={localErrors.requestsCpu || 'e.g., 1, 2, 500m'}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label={t('podDeployment:podDeployment.basic.requestsMemory')}
              value={localQuota?.requestsMemory || ''}
              onChange={(e) => handleQuotaChange('requestsMemory', e.target.value)}
              disabled={!editMode}
              error={!!localErrors.requestsMemory}
              helperText={localErrors.requestsMemory || 'e.g., 128Mi, 256Mi'}
            />
          </Grid>

          {/* Limits Section */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom>
              {t('podDeployment:podDeployment.resources.limits')}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label={t('podDeployment:podDeployment.basic.limitsCpu')}
              value={localQuota?.limitsCpu || ''}
              onChange={(e) => handleQuotaChange('limitsCpu', e.target.value)}
              disabled={!editMode}
              error={!!localErrors.limitsCpu}
              helperText={localErrors.limitsCpu || 'e.g., 1, 2, 500m'}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label={t('podDeployment:podDeployment.basic.limitsMemory')}
              value={localQuota?.limitsMemory || ''}
              onChange={(e) => handleQuotaChange('limitsMemory', e.target.value)}
              disabled={!editMode}
              error={!!localErrors.limitsMemory}
              helperText={localErrors.limitsMemory || 'e.g., 128Mi, 256Mi'}
            />
          </Grid>

          {/* Resource counts */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom>
              {t('podDeployment:podDeployment.basic.resourceCounts')}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label={t('podDeployment:podDeployment.basic.pods')}
              value={localQuota?.pods || ''}
              onChange={(e) => handleQuotaChange('pods', e.target.value)}
              disabled={!editMode}
              error={!!localErrors.pods}
              helperText={localErrors.pods || t('podDeployment:quota.validation.positiveInteger')}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label={t('podDeployment:podDeployment.basic.configmaps')}
              value={localQuota?.configmaps || ''}
              onChange={(e) => handleQuotaChange('configmaps', e.target.value)}
              disabled={!editMode}
              error={!!localErrors.configmaps}
              helperText={localErrors.configmaps || t('podDeployment:quota.validation.positiveInteger')}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label={t('podDeployment:podDeployment.basic.secrets')}
              value={localQuota?.secrets || ''}
              onChange={(e) => handleQuotaChange('secrets', e.target.value)}
              disabled={!editMode}
              error={!!localErrors.secrets}
              helperText={localErrors.secrets || t('podDeployment:quota.validation.positiveInteger')}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label={t('podDeployment:podDeployment.basic.pvcs')}
              value={localQuota?.pvcs || ''}
              onChange={(e) => handleQuotaChange('pvcs', e.target.value)}
              disabled={!editMode}
              error={!!localErrors.pvcs}
              helperText={localErrors.pvcs || t('podDeployment:quota.validation.positiveInteger')}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label={t('podDeployment:podDeployment.basic.services')}
              value={localQuota?.services || ''}
              onChange={(e) => handleQuotaChange('services', e.target.value)}
              disabled={!editMode}
              error={!!localErrors.services}
              helperText={localErrors.services || t('podDeployment:quota.validation.positiveInteger')}
            />
          </Grid>

          {/* Workload counts */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom>
              {t('podDeployment:podDeployment.basic.workloadCounts')}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label={t('podDeployment:podDeployment.basic.deployments')}
              value={localQuota?.deployments || ''}
              onChange={(e) => handleQuotaChange('deployments', e.target.value)}
              disabled={!editMode}
              error={!!localErrors.deployments}
              helperText={localErrors.deployments || t('podDeployment:quota.validation.positiveInteger')}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label={t('podDeployment:podDeployment.basic.replicasets')}
              value={localQuota?.replicasets || ''}
              onChange={(e) => handleQuotaChange('replicasets', e.target.value)}
              disabled={!editMode}
              error={!!localErrors.replicasets}
              helperText={localErrors.replicasets || t('podDeployment:quota.validation.positiveInteger')}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label={t('podDeployment:podDeployment.basic.statefulsets')}
              value={localQuota?.statefulsets || ''}
              onChange={(e) => handleQuotaChange('statefulsets', e.target.value)}
              disabled={!editMode}
              error={!!localErrors.statefulsets}
              helperText={localErrors.statefulsets || t('podDeployment:quota.validation.positiveInteger')}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label={t('podDeployment:podDeployment.basic.jobs')}
              value={localQuota?.jobs || ''}
              onChange={(e) => handleQuotaChange('jobs', e.target.value)}
              disabled={!editMode}
              error={!!localErrors.jobs}
              helperText={localErrors.jobs || t('podDeployment:quota.validation.positiveInteger')}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label={t('podDeployment:podDeployment.basic.cronjobs')}
              value={localQuota?.cronjobs || ''}
              onChange={(e) => handleQuotaChange('cronjobs', e.target.value)}
              disabled={!editMode}
              error={!!localErrors.cronjobs}
              helperText={localErrors.cronjobs || t('podDeployment:quota.validation.positiveInteger')}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Error message */}
      {localErrors.submit && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {localErrors.submit}
        </Alert>
      )}
    </Box>
  );
};

export default NamespaceQuotaConfig; 