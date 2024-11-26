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
  Cancel as CancelIcon
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

  // Initialize or update quotas
  useEffect(() => {
    if (!isUserEdited) {
      // Only use calculated values if user hasn't edited
      if (config.resourceQuota) {
        // Use existing values from config
        setLocalQuota(config.resourceQuota);
      } else {
        // Calculate default values
        const defaultQuotas = calculateDefaultQuotas();
        setLocalQuota(defaultQuotas);
        
        // Save default values to config
        onChange({
          ...config,
          resourceQuota: defaultQuotas
        });
      }
    }
  }, [
    config.replicas,
    config.yamlTemplate?.placeholders?.cpu_request,
    config.yamlTemplate?.placeholders?.cpu_limit,
    config.yamlTemplate?.placeholders?.memory_request,
    config.yamlTemplate?.placeholders?.memory_limit,
    isUserEdited
  ]);

  const handleQuotaChange = (field, value) => {
    setIsUserEdited(true);
    
    // Validate the new value
    const validationErrors = validateQuota(field, value);
    if (Object.keys(validationErrors).length > 0) {
      setLocalErrors(prev => ({
        ...prev,
        ...validationErrors
      }));
      return;
    }

    // Clear any previous errors for this field
    setLocalErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });

    // Update the local quota
    const updatedQuota = {
      ...localQuota,
      [field]: value
    };
    setLocalQuota(updatedQuota);

    // Save changes immediately
    const saveChanges = async () => {
      try {
        // Save to config.json
        await podDeploymentService.saveDeploymentConfig(
          config.name,
          config.version,
          {
            ...config,
            resourceQuota: updatedQuota
          }
        );

        // Generate and save YAML
        const quotaYaml = generateQuotaYaml(updatedQuota);
        await podDeploymentService.saveDeployScript(
          config.name,
          config.version,
          `${config.name}-${config.version}-quota.yaml`,
          quotaYaml
        );

        // Update parent config
        onChange({
          ...config,
          resourceQuota: updatedQuota
        });
      } catch (error) {
        console.error('Failed to save quota changes:', error);
        setLocalErrors(prev => ({
          ...prev,
          submit: t('podDeployment:quota.errors.saveFailed')
        }));
      }
    };

    saveChanges();
  };

  const handleSaveQuota = async () => {
    try {
      // Save to config.json
      await podDeploymentService.saveDeploymentConfig(
        config.name,
        config.version,
        {
          ...config,
          resourceQuota: localQuota
        }
      );

      // Save YAML file
      await saveQuotaYaml(localQuota);

      // Exit edit mode
      setEditMode(false);
    } catch (error) {
      console.error('Failed to save resource quota:', error);
      setLocalErrors(prev => ({
        ...prev,
        submit: t('podDeployment:quota.errors.saveFailed')
      }));
    }
  };

  const handleEditToggle = () => {
    if (editMode) {
      // Cancel edit - reset to original values
      setLocalQuota(config.resourceQuota);
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
      const yamlContent = generateQuotaYaml(quotas);
      if (yamlContent) {
        await podDeploymentService.saveDeployScript(
          config.name,
          config.version,
          `${config.name}-${config.version}-quota.yaml`,
          yamlContent
        );
        logger.info('✅ Quota YAML saved successfully');
      }
    } catch (error) {
      console.error('Failed to save quota YAML:', error);
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
            // Save to config.json
            await podDeploymentService.saveDeploymentConfig(
              config.name,
              config.version,
              {
                ...config,
                resourceQuota: newQuotas
              }
            );

            // Save YAML file
            await saveQuotaYaml(newQuotas);
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
    isUserEdited
  ]);

  const generateQuotaYaml = (quotas) => {
    if (!quotas) return '';

    return `apiVersion: v1
kind: ResourceQuota
metadata:
  name: ${config.name}-quota
  namespace: ${config.namespace}
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

    switch (field) {
      case 'requestsCpu':
      case 'limitsCpu':
        if (!validateCpuValue(value)) {
          errors[field] = t('podDeployment:quota.validation.invalidCpu');
        }
        break;

      case 'requestsMemory':
      case 'limitsMemory':
        if (!validateMemoryValue(value)) {
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
        if (!validateResourceCount(value)) {
          errors[field] = t('podDeployment:quota.validation.invalidCount');
        }
        break;
    }

    return errors;
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
            <Button
              variant="contained"
              startIcon={<EditIcon />}
              onClick={handleEditToggle}
            >
              {t('common:common.edit')}
            </Button>
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
          {/* Display calculated values in read-only/edit fields */}
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
              disabled={!editMode}
              error={!!localErrors.pods}
              helperText={localErrors.pods || 'e.g., 1, 2, 500m'}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label={t('podDeployment:podDeployment.basic.configmaps')}
              value={localQuota?.configmaps || ''}
              disabled={!editMode}
              error={!!localErrors.configmaps}
              helperText={localErrors.configmaps || 'e.g., 1, 2, 500m'}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label={t('podDeployment:podDeployment.basic.secrets')}
              value={localQuota?.secrets || ''}
              disabled={!editMode}
              error={!!localErrors.secrets}
              helperText={localErrors.secrets || 'e.g., 1, 2, 500m'}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label={t('podDeployment:podDeployment.basic.pvcs')}
              value={localQuota?.pvcs || ''}
              disabled={!editMode}
              error={!!localErrors.pvcs}
              helperText={localErrors.pvcs || 'e.g., 1, 2, 500m'}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label={t('podDeployment:podDeployment.basic.services')}
              value={localQuota?.services || ''}
              disabled={!editMode}
              error={!!localErrors.services}
              helperText={localErrors.services || 'e.g., 1, 2, 500m'}
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
              disabled={!editMode}
              error={!!localErrors.deployments}
              helperText={localErrors.deployments || 'e.g., 1, 2, 500m'}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label={t('podDeployment:podDeployment.basic.replicasets')}
              value={localQuota?.replicasets || ''}
              disabled={!editMode}
              error={!!localErrors.replicasets}
              helperText={localErrors.replicasets || 'e.g., 1, 2, 500m'}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label={t('podDeployment:podDeployment.basic.statefulsets')}
              value={localQuota?.statefulsets || ''}
              disabled={!editMode}
              error={!!localErrors.statefulsets}
              helperText={localErrors.statefulsets || 'e.g., 1, 2, 500m'}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label={t('podDeployment:podDeployment.basic.jobs')}
              value={localQuota?.jobs || ''}
              disabled={!editMode}
              error={!!localErrors.jobs}
              helperText={localErrors.jobs || 'e.g., 1, 2, 500m'}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label={t('podDeployment:podDeployment.basic.cronjobs')}
              value={localQuota?.cronjobs || ''}
              disabled={!editMode}
              error={!!localErrors.cronjobs}
              helperText={localErrors.cronjobs || 'e.g., 1, 2, 500m'}
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