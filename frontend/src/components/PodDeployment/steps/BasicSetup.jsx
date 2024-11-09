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
import { podDeploymentService } from '../../../services/podDeploymentService';
import semver from 'semver';

const BasicSetup = ({ config, onChange, errors: propErrors, onStepVisibilityChange }) => {
  const { t } = useAppTranslation();
  const [localErrors, setLocalErrors] = useState({});
  const [showResourceQuota, setShowResourceQuota] = useState(false);
  const [availableTemplates, setAvailableTemplates] = useState([]);
  const [showTemplateUpload, setShowTemplateUpload] = useState(false);
  const [isNewDeployment, setIsNewDeployment] = useState(false);
  const [versions, setVersions] = useState([]);
  const [namespaces, setNamespaces] = useState([]);
  const [localVersion, setLocalVersion] = useState('');

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

  // Fetch versions when deployment name changes
  useEffect(() => {
    const fetchVersions = async () => {
      if (!config.name || isNewDeployment) {
        console.log('⏭️ Skipping version fetch:', { 
          name: config.name, 
          isNewDeployment 
        });
        return;
      }
      
      try {
        console.log('🔄 Fetching versions for:', config.name);
        const token = localStorage.getItem('token');
        
        if (!token) {
          console.warn('⚠️ No auth token found');
          setLocalErrors(prev => ({
            ...prev,
            version: t('podDeployment:podDeployment.errors.authenticationRequired')
          }));
          return;
        }

        const response = await podDeploymentService.getDeploymentVersions(
          config.name,
          token
        );
        
        if (response?.versions && Array.isArray(response.versions)) {
          console.log('✅ Fetched versions:', response.versions);
          setVersions(response.versions);
          
          // Auto-select latest version if none selected
          if (!config.version && response.latestVersion) {
            console.log('📌 Auto-selecting latest version:', response.latestVersion);
            onChange({
              ...config,
              version: response.latestVersion
            });
          }
        } else {
          console.warn('⚠️ Invalid response format:', response);
          setLocalErrors(prev => ({
            ...prev,
            version: t('podDeployment:podDeployment.errors.invalidVersionFormat')
          }));
        }
      } catch (error) {
        console.error('❌ Failed to fetch versions:', error);
        let errorMessage = t('podDeployment:podDeployment.errors.failedToFetchVersions');
        
        // 處理特定錯誤類型
        if (error.response?.status === 401) {
          errorMessage = t('podDeployment:podDeployment.errors.unauthorized');
        } else if (error.response?.status === 404) {
          errorMessage = t('podDeployment:podDeployment.errors.deploymentNotFound');
        }
        
        setLocalErrors(prev => ({
          ...prev,
          version: errorMessage
        }));
        
        // 清空版本列表
        setVersions([]);
      }
    };

    fetchVersions();
  }, [config.name, isNewDeployment, t]);

  // Load version configuration when version changes
  useEffect(() => {
    const loadVersionConfig = async () => {
      if (!config.name || !localVersion || isNewDeployment) {
        console.log('⏭️ Skipping config load:', {
          name: config.name,
          localVersion,
          isNewDeployment
        });
        return;
      }

      try {
        console.log('🔄 Loading config with version:', {
          name: config.name,
          localVersion
        });
        
        const versionConfig = await podDeploymentService.getVersionConfig(
          config.name,
          localVersion
        );

        if (versionConfig?.config) {
          console.log('✅ Loaded version config:', {
            config: versionConfig,
            currentVersion: localVersion
          });
          const currentVersion = localVersion;
          onChange({
            ...config,
            ...versionConfig.config,
            version: currentVersion
          });
        } else {
          console.warn('⚠️ Invalid config format:', versionConfig);
          setLocalErrors(prev => ({
            ...prev,
            version: t('podDeployment:podDeployment.errors.invalidConfigFormat')
          }));
        }
      } catch (error) {
        console.error('❌ Failed to load version config:', error);
        let errorMessage = t('podDeployment:podDeployment.errors.failedToLoadConfig');
        
        if (error.response?.status === 404) {
          errorMessage = t('podDeployment:podDeployment.errors.versionNotFound');
        }
        
        setLocalErrors(prev => ({
          ...prev,
          version: errorMessage
        }));
      }
    };

    loadVersionConfig();
  }, [config.name, localVersion, isNewDeployment, t]);

  // Fetch namespaces on component mount
  useEffect(() => {
    const fetchNamespaces = async () => {
      try {
        const namespaceList = await podDeploymentService.getNamespaces();
        setNamespaces(namespaceList);
      } catch (error) {
        console.error('Failed to fetch namespaces:', error);
        setLocalErrors(prev => ({
          ...prev,
          namespace: t('podDeployment:podDeployment.errors.failedToFetchNamespaces')
        }));
      }
    };

    fetchNamespaces();
  }, [t]);

  // 在組件掛載時添加日誌
  useEffect(() => {
    console.log('🔍 BasicSetup mounted with config:', {
      name: config.name,
      version: config.version,
      namespace: config.namespace,
      timestamp: new Date().toISOString()
    });
  }, []);

  // 監聽配置變更
  useEffect(() => {
    console.log('📊 Config updated in BasicSetup:', {
      name: config.name,
      version: config.version,
      namespace: config.namespace,
      timestamp: new Date().toISOString()
    });
  }, [config]);

  // 在組件初始化時設置本地版本
  useEffect(() => {
    if (config.version && !localVersion) {
      console.log('🔄 Initializing local version:', {
        configVersion: config.version,
        currentLocalVersion: localVersion
      });
      setLocalVersion(config.version);
    }
  }, [config.version]);

  // 確保在配置更新時不會覆蓋用戶輸入的版本
  useEffect(() => {
    const loadVersionConfig = async () => {
      if (!config.name || !localVersion || isNewDeployment) {
        console.log('⏭️ Skipping config load:', {
          name: config.name,
          localVersion,
          isNewDeployment
        });
        return;
      }

      try {
        console.log('🔄 Loading config with version:', {
          name: config.name,
          localVersion
        });
        
        const versionConfig = await podDeploymentService.getVersionConfig(
          config.name,
          localVersion
        );

        if (versionConfig?.config) {
          console.log('✅ Loaded version config:', {
            config: versionConfig,
            currentVersion: localVersion
          });
          const currentVersion = localVersion;
          onChange({
            ...config,
            ...versionConfig.config,
            version: currentVersion
          });
        } else {
          console.warn('⚠️ Invalid config format:', versionConfig);
          setLocalErrors(prev => ({
            ...prev,
            version: t('podDeployment:podDeployment.errors.invalidConfigFormat')
          }));
        }
      } catch (error) {
        console.error('❌ Failed to load version config:', error);
        let errorMessage = t('podDeployment:podDeployment.errors.failedToLoadConfig');
        
        if (error.response?.status === 404) {
          errorMessage = t('podDeployment:podDeployment.errors.versionNotFound');
        }
        
        setLocalErrors(prev => ({
          ...prev,
          version: errorMessage
        }));
      }
    };

    loadVersionConfig();
  }, [config.name, localVersion, isNewDeployment, t]);

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
            value={localVersion}
            onChange={(event, newValue) => {
              console.group('🔄 Version Selection Debug');
              try {
                const selectedVersion = typeof newValue === 'string' ? newValue : '';
                
                console.log('Version Selection Details:', {
                  rawValue: newValue,
                  selectedVersion,
                  previousVersion: localVersion,
                  configVersion: config.version
                });

                // 更新本地版本狀態
                setLocalVersion(selectedVersion);
                
                // 更新父組件的配置
                onChange({
                  ...config,
                  version: selectedVersion
                });

                console.log('✅ Version updated:', {
                  newVersion: selectedVersion,
                  newConfig: {
                    ...config,
                    version: selectedVersion
                  }
                });
              } catch (error) {
                console.error('❌ Version selection error:', error);
              }
              console.groupEnd();
            }}
            onInputChange={(event, newInputValue) => {
              console.log('🔤 Input Change:', {
                newInputValue,
                currentLocalVersion: localVersion,
                currentConfigVersion: config.version
              });
              setLocalVersion(newInputValue);
              onChange({
                ...config,
                version: newInputValue
              });
            }}
            options={versions}
            getOptionLabel={(option) => {
              const label = typeof option === 'string' ? option : '';
              console.log('🏷️ Option Label:', { option, label });
              return label;
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label={t('podDeployment:podDeployment.basic.version')}
                required
                error={!!allErrors.version}
                helperText={allErrors.version}
                value={localVersion}
                onChange={(e) => {
                  const newValue = e.target.value;
                  console.log('📝 TextField Change:', {
                    newValue,
                    currentLocalVersion: localVersion,
                    currentConfigVersion: config.version
                  });
                  setLocalVersion(newValue);
                  onChange({
                    ...config,
                    version: newValue
                  });
                }}
              />
            )}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <Autocomplete
            freeSolo
            value={config.namespace || ''}
            onChange={(event, newValue) => {
              onChange({
                ...config,
                namespace: typeof newValue === 'string' ? newValue : newValue?.name
              });
            }}
            options={namespaces}
            getOptionLabel={(option) => {
              if (typeof option === 'string') return option;
              return option?.name || '';
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label={t('podDeployment:podDeployment.basic.namespace')}
                required
                error={!!allErrors.namespace}
                helperText={allErrors.namespace}
                fullWidth
              />
            )}
            renderOption={(props, option) => (
              <li {...props}>
                <Box>
                  <Typography>{option.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {option.status}
                  </Typography>
                </Box>
              </li>
            )}
            loading={namespaces.length === 0}
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