import React, { useState } from 'react';
import {
  Box,
  TextField,
  Grid,
  Typography,
  Button,
  Alert,
  FormControlLabel,
  Checkbox,
  Paper
} from '@mui/material';
import { Upload as UploadIcon } from '@mui/icons-material';
import { useAppTranslation } from '../../../hooks/useAppTranslation';

const BasicSetup = ({ config, onChange, errors: propErrors }) => {
  const { t } = useAppTranslation();
  const [localErrors, setLocalErrors] = useState({});
  const [showResourceQuota, setShowResourceQuota] = useState(false);

  const handleResourceQuotaChange = (field, value) => {
    onChange({
      ...config,
      resourceQuota: {
        ...config.resourceQuota,
        [field]: value
      }
    });
  };

  const generateResourceQuotaPreview = () => {
    if (!showResourceQuota || !config.resourceQuota) return '';

    return `apiVersion: v1
kind: ResourceQuota
metadata:
  name: ${config.name}-quota
  namespace: ${config.namespace}
spec:
  hard:
    requests.cpu: ${config.resourceQuota?.requestsCpu || '1'}
    requests.memory: ${config.resourceQuota?.requestsMemory || '1Gi'}
    limits.cpu: ${config.resourceQuota?.limitsCpu || '2'}
    limits.memory: ${config.resourceQuota?.limitsMemory || '2Gi'}
    pods: ${config.resourceQuota?.pods || '10'}
    configmaps: ${config.resourceQuota?.configmaps || '10'}
    persistentvolumeclaims: ${config.resourceQuota?.pvcs || '5'}
    services: ${config.resourceQuota?.services || '10'}
    secrets: ${config.resourceQuota?.secrets || '10'}
    count/deployments.apps: ${config.resourceQuota?.deployments || '5'}
    count/replicasets.apps: ${config.resourceQuota?.replicasets || '10'}
    count/statefulsets.apps: ${config.resourceQuota?.statefulsets || '5'}
    count/jobs.batch: ${config.resourceQuota?.jobs || '10'}
    count/cronjobs.batch: ${config.resourceQuota?.cronjobs || '5'}`;
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!config.name) {
      setLocalErrors(prev => ({
        ...prev,
        name: t('podDeployment:podDeployment.validation.name.required')
      }));
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('deploymentName', config.name);

      console.log('Upload request details:', {
        fileName: file.name,
        deploymentName: config.name,
        formDataEntries: Array.from(formData.entries()).map(([key, value]) => ({
          key,
          value: value instanceof File ? value.name : value
        }))
      });

      const response = await fetch('/api/deployment-templates/upload', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      console.log('Upload response:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Upload error response:', errorData);
        throw new Error(errorData.error || 'Upload failed');
      }

      const result = await response.json();
      onChange({
        ...config,
        templatePath: result.path
      });
      
      setLocalErrors({});

    } catch (error) {
      console.error('Upload failed:', error);
      setLocalErrors(prev => ({
        ...prev,
        upload: error.message
      }));
    }
  };

  const allErrors = { ...propErrors, ...localErrors };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {t('podDeployment:podDeployment.steps.basicSetup')}
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label={t('podDeployment:podDeployment.basic.name')}
            value={config.name}
            onChange={(e) => {
              onChange({ ...config, name: e.target.value });
              if (localErrors.name) {
                setLocalErrors(prev => {
                  const { name, ...rest } = prev;
                  return rest;
                });
              }
            }}
            error={!!allErrors.name}
            helperText={allErrors.name}
            required
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label={t('podDeployment:podDeployment.basic.version')}
            value={config.version || ''}
            onChange={(e) => onChange({ ...config, version: e.target.value })}
            placeholder="1.0.0"
            required
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label={t('podDeployment:podDeployment.basic.namespace')}
            value={config.namespace}
            onChange={(e) => onChange({ ...config, namespace: e.target.value })}
            error={!!allErrors.namespace}
            helperText={allErrors.namespace}
            required
          />
        </Grid>

        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Checkbox
                checked={config.enableResourceQuota}
                onChange={(e) => onChange({
                  ...config,
                  enableResourceQuota: e.target.checked
                })}
              />
            }
            label={t('podDeployment:podDeployment.basic.enableResourceQuota')}
          />
        </Grid>

        {config.name && (
          <Grid item xs={12}>
            <Box sx={{ mt: 2 }}>
              <input
                type="file"
                accept=".zip,.tar,.tar.gz"
                style={{ display: 'none' }}
                id="template-upload"
                onChange={handleFileUpload}
              />
              <label htmlFor="template-upload">
                <Button
                  variant="contained"
                  component="span"
                  startIcon={<UploadIcon />}
                >
                  {t('podDeployment:podDeployment.steps.uploadTemplate')}
                </Button>
              </label>
              {config.templatePath && (
                <Typography variant="body2" sx={{ mt: 1, color: 'success.main' }}>
                  {t('podDeployment:podDeployment.steps.templateUploaded')}
                </Typography>
              )}
            </Box>
          </Grid>
        )}
      </Grid>

      {allErrors.upload && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {allErrors.upload}
        </Alert>
      )}
    </Box>
  );
};

export default BasicSetup; 