import React, { useState, useEffect } from 'react';
import { logger } from '../../utils/logger'; // 導入 logger 
import {
  Box,
  TextField,
  Button,
  Grid,
  MenuItem,
  Typography,
  Alert,
  Stepper,
  Step,
  StepLabel,
  Paper,
  Divider,
  FormControl,
  InputLabel,
  Select,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Save as SaveIcon,
  FolderOpen as FolderOpenIcon
} from '@mui/icons-material';
import { useAppTranslation } from '../../hooks/useAppTranslation';  
import axios from 'axios';
import ResourceConfig from './components/ResourceConfig';
import AffinityConfig from './components/AffinityConfig';
import VolumeConfig from './components/VolumeConfig';
import ConfigMapEditor from './components/ConfigMapEditor';
import SecretEditor from './components/SecretEditor';
import DeploymentPreview from './components/DeploymentPreview';
import DeploymentProgress from './components/DeploymentProgress';
import validatePodConfig from '../../utils/podValidation';
import TemplateManager from './components/TemplateManager';
import ConfigImportExport from './components/ConfigImportExport';
import { createNewConfig } from '../../utils/configVersioning';
import { migrateConfig } from '../../utils/configVersioning';
import ConfigDiffViewer from './components/ConfigDiffViewer';
import { parseApiError, logError } from '../../utils/errorHandler';
import ErrorDisplay from '../common/ErrorDisplay';
import ImageSelector from './components/ImageSelector';

const steps = ['基本設置', '資源配置', '親和性', '存儲配置', '配置映射', '預覽'];

const DeploymentConfigurator = ({ onBack, deployment = null }) => {
  const { t } = useAppTranslation();
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState(deployment ? deployment : createNewConfig());
  const [error, setError] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [showProgress, setShowProgress] = useState(false);
  const [deployedPod, setDeployedPod] = useState(null);
  const [validationErrors, setValidationErrors] = useState(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [originalConfig, setOriginalConfig] = useState(null);
  const [config, setConfig] = useState(null);

  useEffect(() => {
    if (deployment) {
      try {
        const migratedConfig = migrateConfig(deployment);
        setFormData(migratedConfig);
      } catch (err) {
        setError(err.message);
      }
    }
  }, [deployment]);

  useEffect(() => {
    if (deployment) {
      setOriginalConfig(deployment);
    }
  }, [deployment]);

  // 初始化時讀取配置
  useEffect(() => {
    const loadConfig = async () => {
      try {
        if (deployment?.name) {
          const response = await templateService.getTemplateConfig(deployment.name);
          setConfig(response.data.config);
        } else {
          // 創建新的配置文件
          const newConfig = {
            name: '',
            namespace: '',
            version: '',
            image: {},
            resources: {},
            affinity: {},
            volumes: [],
            configMaps: [],
            secrets: []
          };
          await templateService.saveTemplateConfig('new', { config: newConfig });
          setConfig(newConfig);
        }
      } catch (error) {
        console.error('Failed to load config:', error);
      }
    };
    loadConfig();
  }, [deployment]);

  // 處理配置更新
  const handleConfigUpdate = async (section, data) => {
    try {
      const updatedConfig = {
        ...config,
        [section]: data
      };
      setConfig(updatedConfig);
      
      // 保存到 config.json
      await templateService.saveTemplateConfig(
        config.name || 'new',
        { config: updatedConfig }
      );
    } catch (error) {
      console.error('Failed to save config:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleNestedChange = (section, data) => {
    const updatedConfig = {
      ...formData,
      [section]: data
    };
    
    setFormData(updatedConfig);
    
    // 保存到 config.json
    saveConfigToFile(updatedConfig);
  };

  const saveConfigToFile = async (config) => {
    try {
      await templateService.saveTemplateConfig(config.name, {
        config,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to save config:', error);
    }
  };

  const handleNext = async () => {
    if (activeStep === steps.length - 1) {
      await handleDeploy();
    } else {
      if (activeStep === steps.length - 2) {
        const { isValid, errors } = validatePodConfig(formData);
        if (!isValid) {
          setValidationErrors(errors);
          return;
        }

        try {
          const response = await axios.post('/api/pod-deployments/preview', formData, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          setPreviewData(response.data);
          setValidationErrors(null);
        } catch (err) {
          setError(err.message);
          return;
        }
      }
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (activeStep === 0) {
      onBack();
    } else {
      setActiveStep((prev) => prev - 1);
    }
  };

  const handleDeploy = async () => {
    try {
      const { isValid, errors } = validatePodConfig(formData);
      if (!isValid) {
        setValidationErrors(errors);
        return;
      }

      const response = await axios.post('/api/pod-deployments', formData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      setValidationErrors(null);
      setError(null);
      setShowProgress(true);
      setDeployedPod(response.data);
      
    } catch (err) {
      const appError = parseApiError(err);
      logError(appError);
      setError(appError);
    }
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="name"
                label={t('podDeployment:podDeployment.form.name')}
                value={formData.name}
                onChange={handleChange}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="namespace"
                label={t('podDeployment:podDeployment.form.namespace')}
                value={formData.namespace}
                onChange={handleChange}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>{t('podDeployment:podDeployment.form.type')}</InputLabel>
                <Select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  label={t('podDeployment:podDeployment.form.type')}
                >
                  <MenuItem value="deployment">Deployment</MenuItem>
                  <MenuItem value="statefulset">StatefulSet</MenuItem>
                  <MenuItem value="daemonset">DaemonSet</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            {formData.type !== 'daemonset' && (
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  name="replicas"
                  label={t('podDeployment:podDeployment.form.replicas')}
                  value={formData.replicas}
                  onChange={handleChange}
                  inputProps={{ min: 1 }}
                  required
                />
              </Grid>
            )}
            <Grid item xs={12}>
              <ImageSelector
                value={formData.image}
                onChange={(imageData) => handleNestedChange('image', imageData)}
              />
            </Grid>
          </Grid>
        );
      case 1:
        return (
          <ResourceConfig
            resources={formData.resources}
            onChange={(data) => handleNestedChange('resources', data)}
          />
        );
      case 2:
        return (
          <AffinityConfig
            affinity={formData.affinity}
            onChange={(data) => handleNestedChange('affinity', data)}
          />
        );
      case 3:
        return (
          <VolumeConfig
            volumes={formData.volumes}
            onChange={(data) => handleNestedChange('volumes', data)}
          />
        );
      case 4:
        return (
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <ConfigMapEditor
                configMaps={formData.configMaps}
                onChange={(data) => handleNestedChange('configMaps', data)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <SecretEditor
                secrets={formData.secrets}
                onChange={(data) => handleNestedChange('secrets', data)}
              />
            </Grid>
          </Grid>
        );
      case 5:
        return (
          <DeploymentPreview
            data={previewData}
            config={formData}
          />
        );
      default:
        return null;
    }
  };

  const handleLoadTemplate = (config) => {
    setFormData(config);
  };

  const handleSaveTemplate = () => {
    const { isValid, errors } = validatePodConfig(formData);
    if (!isValid) {
      setValidationErrors(errors);
      return;
    }
    setShowTemplates(true);
  };

  const handleImportConfig = (importedConfig) => {
    try {
      setFormData(importedConfig);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {deployment 
          ? t('podDeployment:podDeployment.edit.title') 
          : t('podDeployment:podDeployment.create.title')}
      </Typography>

      <ErrorDisplay
        error={error}
        onClose={() => setError(null)}
      />

      {validationErrors && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            {t('podDeployment:podDeployment.validation.errors')}:
          </Typography>
          <ul>
            {Object.entries(validationErrors).map(([field, error]) => (
              <li key={field}>
                {typeof error === 'string' 
                  ? error 
                  : `${field}: ${Object.values(error).join(', ')}`}
              </li>
            ))}
          </ul>
        </Alert>
      )}

      <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{t(`podDeployment:podDeployment.steps.${label}`)}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Paper sx={{ p: 3, mb: 2 }}>
        {renderStepContent(activeStep)}
      </Paper>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
        <Button onClick={handleBack}>
          {activeStep === 0 ? t('common:common.cancel') : t('common:common.back')}
        </Button>
        <Button
          variant="contained"
          onClick={handleNext}
        >
          {activeStep === steps.length - 1 
            ? (deployment ? t('common:common.save') : t('common:common.create'))
            : t('common:common.next')}
        </Button>
      </Box>

      <Dialog
        open={showProgress}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {t('podDeployment:podDeployment.progress.title')}
        </DialogTitle>
        <DialogContent>
          <DeploymentProgress
            name={deployedPod?.metadata?.name}
            namespace={deployedPod?.metadata?.namespace}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowProgress(false)}>
            {t('common:common.close')}
          </Button>
        </DialogActions>
      </Dialog>

      <Box sx={{ mb: 3, display: 'flex', gap: 1, justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<SaveIcon />}
            onClick={handleSaveTemplate}
          >
            {t('podDeployment:podDeployment.templates.saveAsTemplate')}
          </Button>
          <Button
            variant="outlined"
            startIcon={<FolderOpenIcon />}
            onClick={() => setShowTemplates(true)}
          >
            {t('podDeployment:podDeployment.templates.loadTemplate')}
          </Button>
        </Box>
        
        <ConfigImportExport
          config={formData}
          onImport={handleImportConfig}
        />
      </Box>

      <TemplateManager
        open={showTemplates}
        onClose={() => setShowTemplates(false)}
        onLoad={handleLoadTemplate}
        currentConfig={formData}
      />

      <Dialog
        open={showDiff}
        onClose={() => setShowDiff(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {t('podDeployment:podDeployment.diff.title')}
        </DialogTitle>
        <DialogContent>
          <ConfigDiffViewer
            oldConfig={originalConfig}
            newConfig={formData}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDiff(false)}>
            {t('common:common.close')}
          </Button>
        </DialogActions>
      </Dialog>

      {activeStep === steps.length - 1 && originalConfig && (
        <Button
          variant="outlined"
          onClick={() => setShowDiff(true)}
          sx={{ mb: 2 }}
        >
          {t('podDeployment:podDeployment.diff.viewChanges')}
        </Button>
      )}
    </Box>
  );
};

export default DeploymentConfigurator; 