import React, { useState, useEffect } from 'react';
import { logger } from '../../../utils/logger.ts'; // 
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
  Autocomplete,
  CircularProgress
} from '@mui/material';
import { Upload as UploadIcon } from '@mui/icons-material';
import { useAppTranslation } from '../../../hooks/useAppTranslation';
import { templateService } from '../../../services/templateService';
import { podDeploymentService } from '../../../services/podDeploymentService';

const BasicSetup = ({ config, onChange, errors: propErrors, onStepVisibilityChange }) => {
  const { t } = useAppTranslation();
  const [localErrors, setLocalErrors] = useState({});
  const [showResourceQuota, setShowResourceQuota] = useState(false);
  const [availableTemplates, setAvailableTemplates] = useState([]);
  const [showTemplateUpload, setShowTemplateUpload] = useState(false);
  const [isNewDeployment, setIsNewDeployment] = useState(false);
  const [versions, setVersions] = useState([]);
  const [existingNamespaces, setExistingNamespaces] = useState([]);
  const [isLoadingNamespaces, setIsLoadingNamespaces] = useState(true);

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

      logger.info('Upload request details:', {
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

      logger.info('Upload response:', {
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

  // Fetch versions when deployment name changes
  useEffect(() => {
    const fetchVersions = async () => {
      if (!config.name || isNewDeployment) return;
      
      try {
        const response = await podDeploymentService.getDeploymentVersions(config.name);
        const versionList = Array.isArray(response.versions) ? response.versions : [];
        setVersions(versionList);
        
        // Auto-select latest version if none selected
        if (!config.version && response.latestVersion) {
          onChange({
            ...config,
            version: response.latestVersion
          });
        }
      } catch (error) {
        console.error('Failed to fetch versions:', error);
      }
    };

    fetchVersions();
  }, [config.name, isNewDeployment]);

  // Load version configuration when version changes
  useEffect(() => {
    const loadVersionConfig = async () => {
      if (!config.name || !config.version || isNewDeployment) return;
      
      try {
        const versionConfig = await podDeploymentService.getVersionConfig(
          config.name,
          config.version
        );
        const updatedConfig = {
          ...versionConfig.config,
          deploymentMode: versionConfig.config.deploymentMode || 'k8s'
        };
        onChange(updatedConfig);
      } catch (error) {
        console.error('Failed to load version config:', error);
      }
    };

    loadVersionConfig();
  }, [config.name, config.version]);

  // 獲取現有的 namespaces
  useEffect(() => {
    const fetchNamespaces = async () => {
      try {
        setIsLoadingNamespaces(true);
        const namespaces = await podDeploymentService.getNamespaces();
        setExistingNamespaces(namespaces.map(ns => ns.name));
      } catch (error) {
        console.error('Failed to fetch namespaces:', error);
      } finally {
        setIsLoadingNamespaces(false);
      }
    };

    fetchNamespaces();
  }, []);

  const handleNamespaceChange = async (event, newValue) => {
    try {
      if (!newValue) return;

      const isNewNamespace = !existingNamespaces.includes(newValue);
      
      if (isNewNamespace && config.name) {
        // 如果是新的 namespace 且已有部署名稱，則創建 YAML
        await podDeploymentService.handleNamespaceChange(config.name, newValue);
      }
      
      onChange({
        ...config,
        namespace: newValue
      });
    } catch (error) {
      console.error('Failed to handle namespace change:', error);
      setLocalErrors(prev => ({
        ...prev,
        namespace: t('podDeployment:podDeployment.errors.namespaceCreateFailed')
      }));
    }
  };

  const handleVersionChange = (event, newValue) => {
    const newVersion = newValue?.trim() || '';
    
    logger.info('📝 Version change in BasicSetup:', { 
      oldVersion: config.version,
      newVersion: newVersion,
      isNewVersion: !versions.includes(newVersion)
    });
    
    onChange({
      ...config,
      version: newVersion
    });
  };

  // 修改版本失焦處理
  const handleVersionBlur = async (event) => {
    const newVersion = event.target.value?.trim();
    if (!newVersion || !config.name) return;

    if (!versions.includes(newVersion)) {
      try {
        // 創建新版本的配置，確保包含 deploymentMode
        const newConfig = {
          ...config,
          version: newVersion,
          timestamp: new Date().toISOString(),
          deploymentMode: config.deploymentMode || 'k8s' // 確保有默認值
        };

        logger.info('📝 Creating new version config:', newConfig);

        try {
          // 保存新版本配置
          await podDeploymentService.saveDeploymentConfig(
            config.name,
            newVersion,
            newConfig
          );

          // 更新版本列表
          const response = await podDeploymentService.getDeploymentVersions(config.name);
          const updatedVersions = Array.isArray(response.versions) ? response.versions : [];
          setVersions(updatedVersions);

          // 更新當前配置
          onChange(newConfig);

          logger.info('✅ New version created and saved successfully:', {
            version: newVersion,
            config: newConfig
          });
        } catch (error) {
          console.error('❌ Failed to save new version:', error);
          const errorStatus = error.response?.status;
          
          // 根據錯誤狀態顯示不同的錯誤信息
          if (errorStatus === 404) {
            setLocalErrors(prev => ({
              ...prev,
              version: t('podDeployment:podDeployment.errors.apiEndpointNotFound')
            }));
          } else if (errorStatus === 400) {
            setLocalErrors(prev => ({
              ...prev,
              version: t('podDeployment:podDeployment.errors.invalidVersionFormat')
            }));
          } else {
            setLocalErrors(prev => ({
              ...prev,
              version: t('podDeployment:podDeployment.errors.versionCreateFailed')
            }));
          }
        }
      } catch (error) {
        console.error('❌ Failed to prepare new version:', error);
        setLocalErrors(prev => ({
          ...prev,
          version: t('podDeployment:podDeployment.errors.unexpectedError')
        }));
      }
    }
  };

  const handleBasicConfigChange = (field) => (event) => {
    onChange({
      ...config,
      [field]: event.target.value
    });
  };

  // 修改部署模式處理函數
  const handleDeploymentModeChange = (event) => {
    const isHelm = event.target.checked;
    const newConfig = {
      ...config,
      deploymentMode: isHelm ? 'helm' : 'k8s'
    };
    
    // 更新本地配置
    onChange(newConfig);

    // 如果已經有版本，則保存更新後的配置
    if (config.name && config.version) {
      try {
        podDeploymentService.saveDeploymentConfig(
          config.name,
          config.version,
          newConfig
        );
      } catch (error) {
        console.error('Failed to save deployment mode:', error);
        setLocalErrors(prev => ({
          ...prev,
          deploymentMode: t('podDeployment:podDeployment.errors.saveFailed')
        }));
      }
    }
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
          <Autocomplete
            freeSolo
            value={config.version || ''}
            onChange={handleVersionChange}
            options={versions || []}
            disabled={isNewDeployment}
            getOptionLabel={(option) => option?.toString() || ''}
            renderInput={(params) => (
              <TextField
                {...params}
                label={t('podDeployment:podDeployment.basic.version')}
                required
                error={!!allErrors.version}
                helperText={allErrors.version}
                onBlur={handleVersionBlur}
              />
            )}
          />
          {!versions.includes(config.version) && config.version && (
            <Alert 
              severity="info" 
              sx={{ mt: 1 }}
            >
              {t('podDeployment:podDeployment.basic.newVersion')}
            </Alert>
          )}
        </Grid>

        <Grid item xs={12}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={config.enableResourceQuota || false}
                  onChange={handleResourceQuotaChange}
                />
              }
              label={t('podDeployment:podDeployment.basic.enableResourceQuota')}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={config.deploymentMode === 'helm'}
                  onChange={handleDeploymentModeChange}
                />
              }
              label={t('podDeployment:podDeployment.basic.useHelmChart')}
            />
          </Box>
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
