import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Grid,
  Typography,
  Button,
  Alert,
  FormControlLabel,
  Checkbox,
  Paper,
  Autocomplete
} from '@mui/material';
import { Upload as UploadIcon } from '@mui/icons-material';
import { useAppTranslation } from '../../../hooks/useAppTranslation';
import { templateService } from '../../../services/templateService';

const BasicSetup = ({ config, onChange, errors: propErrors, onStepVisibilityChange }) => {
  const { t } = useAppTranslation();
  const [localErrors, setLocalErrors] = useState({});
  const [showResourceQuota, setShowResourceQuota] = useState(false);
  const [availableTemplates, setAvailableTemplates] = useState([]);
  const [showTemplateUpload, setShowTemplateUpload] = useState(false);
  const [isNewDeployment, setIsNewDeployment] = useState(false);

  const handleResourceQuotaChange = (event) => {
    const isChecked = event.target.checked;
    
    // Update config
    onChange({
      ...config,
      enableResourceQuota: isChecked
    });

    // Notify parent about step visibility change
    if (onStepVisibilityChange) {
      onStepVisibilityChange('namespaceQuota', isChecked);
    }
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

  // Fetch available templates on component mount
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const templates = await templateService.getTemplateList();
        setAvailableTemplates(templates.map(t => t.name));
      } catch (error) {
        console.error('Failed to fetch templates:', error);
      }
    };
    fetchTemplates();
  }, []);

  // Handle deployment name change
  const handleDeploymentNameChange = (event, newValue) => {
    const deploymentName = newValue?.trim() || '';
    const isNew = !availableTemplates.includes(deploymentName);
    setIsNewDeployment(isNew);
    
    onChange({
      ...config,
      name: deploymentName
    });
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {t('podDeployment:podDeployment.basicSetup.title')}
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Autocomplete
            freeSolo
            value={config.name || ''}
            onChange={handleDeploymentNameChange}
            onInputChange={(event, newValue) => handleDeploymentNameChange(event, newValue)}
            options={availableTemplates}
            renderInput={(params) => (
              <TextField
                {...params}
                required
                fullWidth
                label={t('podDeployment:podDeployment.basic.name')}
                error={!!allErrors.name}
                helperText={allErrors.name}
              />
            )}
          />
          {isNewDeployment && config.name && (
            <Alert 
              severity="info" 
              sx={{ mt: 1 }}
            >
              {t('podDeployment:podDeployment.steps.uploadTemplateFile')}
            </Alert>
          )}
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
                checked={config.enableResourceQuota || false}
                onChange={handleResourceQuotaChange}
              />
            }
            label={t('podDeployment:podDeployment.basic.enableResourceQuota')}
          />
        </Grid>

        {isNewDeployment && config.name && (
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