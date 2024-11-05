import React, { useEffect } from 'react';
import {
  Box,
  Grid,
  Typography,
  TextField,
  Alert,
  Paper
} from '@mui/material';
import { useAppTranslation } from '../../../hooks/useAppTranslation';

const NamespaceQuotaConfig = ({ config, onChange, errors }) => {
  const { t } = useAppTranslation();

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

  // Function to calculate quotas based on current configuration
  const calculateQuotas = () => {
    // Get current values
    const replicas = parseInt(config.replicas) || 1;
    const configMapsCount = (config.yamlTemplate?.configMaps?.length || 0);
    const secretsCount = (config.yamlTemplate?.secrets?.length || 0);
    const volumesCount = (config.yamlTemplate?.volumes?.length || 0);

    // Calculate total instances (replicas + 1 for buffer)
    const totalInstances = replicas + 1;

    // Parse CPU values
    const cpuRequest = parseFloat(config.yamlTemplate?.placeholders?.cpu_request || '0.1');
    const cpuLimit = parseFloat(config.yamlTemplate?.placeholders?.cpu_limit || '0.2');

    // Parse memory values and convert to Mi
    const memoryRequestMi = parseMemory(config.yamlTemplate?.placeholders?.memory_request || '128Mi');
    const memoryLimitMi = parseMemory(config.yamlTemplate?.placeholders?.memory_limit || '256Mi');

    // Calculate totals
    const totalCpuRequest = (totalInstances * cpuRequest).toFixed(1);
    const totalCpuLimit = (totalInstances * cpuLimit).toFixed(1);
    const totalMemoryRequest = formatMemory(totalInstances * memoryRequestMi);
    const totalMemoryLimit = formatMemory(totalInstances * memoryLimitMi);

    // Calculate workload resources (all should be replicas + 1)
    const workloadCount = totalInstances;

    // Calculate config resources with base values
    const configResourceCount = 3 + configMapsCount;
    const secretResourceCount = 3 + secretsCount;
    const pvcCount = Math.max(5, volumesCount);

    return {
      requestsCpu: totalCpuRequest,
      limitsCpu: totalCpuLimit,
      requestsMemory: totalMemoryRequest,
      limitsMemory: totalMemoryLimit,
      pods: `${workloadCount}`,
      configmaps: `${configResourceCount}`,
      pvcs: `${pvcCount}`,
      services: '3',
      secrets: `${secretResourceCount}`,
      deployments: `${workloadCount}`,
      replicasets: `${workloadCount}`,
      statefulsets: `${workloadCount}`,
      jobs: '10',
      cronjobs: '10'
    };
  };

  // Watch for changes in any relevant configuration
  useEffect(() => {
    const newQuotas = calculateQuotas();
    
    // Only update if values have changed
    if (JSON.stringify(newQuotas) !== JSON.stringify(config.resourceQuota)) {
      onChange({
        ...config,
        resourceQuota: newQuotas
      });
    }
  }, [
    config.replicas,
    config.yamlTemplate?.configMaps,
    config.yamlTemplate?.secrets,
    config.yamlTemplate?.volumes,
    config.yamlTemplate?.placeholders?.cpu_request,
    config.yamlTemplate?.placeholders?.cpu_limit,
    config.yamlTemplate?.placeholders?.memory_request,
    config.yamlTemplate?.placeholders?.memory_limit
  ]);

  const handleQuotaChange = (field, value) => {
    onChange({
      ...config,
      resourceQuota: {
        ...config.resourceQuota,
        [field]: value
      }
    });
  };

  const generateQuotaPreview = () => {
    if (!config.resourceQuota) return '';

    return `apiVersion: v1
kind: ResourceQuota
metadata:
  name: ${config.name}-quota
  namespace: ${config.namespace}
spec:
  hard:
    requests.cpu: ${config.resourceQuota.requestsCpu}
    requests.memory: ${config.resourceQuota.requestsMemory}
    limits.cpu: ${config.resourceQuota.limitsCpu}
    limits.memory: ${config.resourceQuota.limitsMemory}
    pods: ${config.resourceQuota.pods}
    configmaps: ${config.resourceQuota.configmaps}
    persistentvolumeclaims: ${config.resourceQuota.pvcs}
    services: ${config.resourceQuota.services}
    secrets: ${config.resourceQuota.secrets}
    count/deployments.apps: ${config.resourceQuota.deployments}
    count/replicasets.apps: ${config.resourceQuota.replicasets}
    count/statefulsets.apps: ${config.resourceQuota.statefulsets}
    count/jobs.batch: ${config.resourceQuota.jobs}
    count/cronjobs.batch: ${config.resourceQuota.cronjobs}`;
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {t('podDeployment:podDeployment.basic.resourceQuota')}
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3}>
          {/* Compute Resources */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom>
              {t('podDeployment:podDeployment.resources.requests')}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label={t('podDeployment:podDeployment.basic.requestsCpu')}
              value={config.resourceQuota?.requestsCpu || ''}
              onChange={(e) => handleQuotaChange('requestsCpu', e.target.value)}
              helperText="e.g., 1, 2, 500m"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label={t('podDeployment:podDeployment.basic.requestsMemory')}
              value={config.resourceQuota?.requestsMemory || ''}
              onChange={(e) => handleQuotaChange('requestsMemory', e.target.value)}
              helperText="e.g., 1Gi, 512Mi"
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
              value={config.resourceQuota?.limitsCpu || ''}
              onChange={(e) => handleQuotaChange('limitsCpu', e.target.value)}
              helperText="e.g., 2, 4, 1000m"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label={t('podDeployment:podDeployment.basic.limitsMemory')}
              value={config.resourceQuota?.limitsMemory || ''}
              onChange={(e) => handleQuotaChange('limitsMemory', e.target.value)}
              helperText="e.g., 2Gi, 1024Mi"
            />
          </Grid>

          {/* Workload Resources */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom>
              {t('podDeployment:podDeployment.basic.workloadResources')}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label={t('podDeployment:podDeployment.basic.pods')}
              value={config.resourceQuota?.pods || ''}
              onChange={(e) => handleQuotaChange('pods', e.target.value)}
              type="number"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label={t('podDeployment:podDeployment.basic.deployments')}
              value={config.resourceQuota?.deployments || ''}
              onChange={(e) => handleQuotaChange('deployments', e.target.value)}
              type="number"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label={t('podDeployment:podDeployment.basic.replicasets')}
              value={config.resourceQuota?.replicasets || ''}
              onChange={(e) => handleQuotaChange('replicasets', e.target.value)}
              type="number"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label={t('podDeployment:podDeployment.basic.statefulsets')}
              value={config.resourceQuota?.statefulsets || ''}
              onChange={(e) => handleQuotaChange('statefulsets', e.target.value)}
              type="number"
            />
          </Grid>

          {/* Storage and Config Resources */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom>
              {t('podDeployment:podDeployment.basic.storageAndConfig')}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label={t('podDeployment:podDeployment.basic.configmaps')}
              value={config.resourceQuota?.configmaps || ''}
              onChange={(e) => handleQuotaChange('configmaps', e.target.value)}
              type="number"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label={t('podDeployment:podDeployment.basic.secrets')}
              value={config.resourceQuota?.secrets || ''}
              onChange={(e) => handleQuotaChange('secrets', e.target.value)}
              type="number"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label={t('podDeployment:podDeployment.basic.pvcs')}
              value={config.resourceQuota?.pvcs || ''}
              onChange={(e) => handleQuotaChange('pvcs', e.target.value)}
              type="number"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label={t('podDeployment:podDeployment.basic.services')}
              value={config.resourceQuota?.services || ''}
              onChange={(e) => handleQuotaChange('services', e.target.value)}
              type="number"
            />
          </Grid>

          {/* Job Resources */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom>
              {t('podDeployment:podDeployment.basic.jobResources')}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label={t('podDeployment:podDeployment.basic.jobs')}
              value={config.resourceQuota?.jobs || ''}
              onChange={(e) => handleQuotaChange('jobs', e.target.value)}
              type="number"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label={t('podDeployment:podDeployment.basic.cronjobs')}
              value={config.resourceQuota?.cronjobs || ''}
              onChange={(e) => handleQuotaChange('cronjobs', e.target.value)}
              type="number"
            />
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
        <Typography variant="subtitle2" gutterBottom>
          {t('podDeployment:podDeployment.basic.resourceQuotaPreview')}
        </Typography>
        <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
          {generateQuotaPreview()}
        </pre>
      </Paper>
    </Box>
  );
};

export default NamespaceQuotaConfig; 