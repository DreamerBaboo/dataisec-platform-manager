import React, { useState, useEffect, useCallback } from 'react';
import {
  Stepper,
  Step,
  StepLabel,
  Button,
  Box,
  Typography,
  Alert,
  Paper
} from '@mui/material';
import { useAppTranslation } from '../../../hooks/useAppTranslation';
import BasicSetup from '../steps/BasicSetup';
import TemplateConfig from '../steps/TemplateConfig';
import ResourceConfig from '../steps/ResourceConfig';
import AffinityConfig from '../steps/AffinityConfig';
import VolumeConfig from '../steps/VolumeConfig';
import ConfigMapEditor from '../steps/ConfigMapEditor';
import SecretEditor from '../steps/SecretEditor';
import DeploymentPreview from './DeploymentPreview';
import NamespaceQuotaConfig from '../steps/NamespaceQuotaConfig';
import RepositoryConfig from '../steps/RepositoryConfig';

const StepperDeployment = ({ deployment, onSave, onCancel, onDeploy }) => {
  const { t } = useAppTranslation();
  const [activeStep, setActiveStep] = useState(0);
  const [deploymentConfig, setDeploymentConfig] = useState({
    name: '',
    namespace: 'default',
    templatePath: '',
    yamlConfig: null,
    resources: {},
    affinity: {},
    volumes: [],
    configMaps: [],
    secrets: [],
    enableResourceQuota: false,
    resourceQuota: null
  });
  const [errors, setErrors] = useState({});
  const [visibleSteps, setVisibleSteps] = useState({
    basicSetup: true,
    templateConfig: true,
    repositoryConfig: true,
    resourceConfig: true,
    affinityConfig: true,
    volumeConfig: true,
    configMapConfig: true,
    secretConfig: true,
    namespaceQuota: false,
    preview: true
  });

  const steps = [
    'basicSetup',
    'templateConfig',
    'repositoryConfig',
    'resourceConfig',
    'affinityConfig',
    'volumeConfig',
    'configMapConfig',
    'secretConfig',
    'namespaceQuota',
    'preview'
  ];

  useEffect(() => {
    if (deployment) {
      setDeploymentConfig(deployment);
    }
  }, [deployment]);

  const validateStep = useCallback((step, config = deploymentConfig) => {
    const newErrors = {};
    
    switch (step) {
      case 0: // Basic Setup
        if (!config.name) {
          newErrors.name = t('podDeployment:podDeployment.validation.name.required');
        } else if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(config.name)) {
          newErrors.name = t('podDeployment:podDeployment.validation.name.format');
        }
        break;
        
      case 2: // Repository Config
        if (!config.repository) {
          newErrors.repository = t('podDeployment:podDeployment.validation.repository.required');
        }
        if (!config.tag) {
          newErrors.tag = t('podDeployment:podDeployment.validation.tag.required');
        }
        break;
        
      case 7: // Namespace Quota
        if (visibleSteps.namespaceQuota && !config.resourceQuota) {
          newErrors.resourceQuota = t('podDeployment:podDeployment.validation.resourceQuota.required');
        }
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [deploymentConfig, visibleSteps, t]);

  const handleNext = () => {
    if (validateStep(activeStep)) {
      let nextStep = activeStep + 1;
      // 跳過隱藏的步驟
      while (nextStep < steps.length && !visibleSteps[steps[nextStep]]) {
        nextStep++;
      }
      setActiveStep(nextStep);
    }
  };

  const handleBack = useCallback(() => {
  let prevStep = activeStep - 1;
  // 跳過隱藏的步驟
  while (prevStep >= 0 && !visibleSteps[steps[prevStep]]) {
    prevStep--;
  }
  setActiveStep(prevStep);
}, [activeStep, visibleSteps, steps]);

 const handleConfigChange = useCallback((newConfig) => {
  setDeploymentConfig(prev => {
    const updatedConfig = {
      ...prev,
      ...newConfig
    };
    // 重新驗證當前步驟
    validateStep(activeStep, updatedConfig);
    return updatedConfig;
  });
}, [activeStep, validateStep]);

  const renderStepContent = useCallback((step) => {
    const stepIndex = steps.indexOf(steps[step]);
    switch (stepIndex) {
      case 0:
        return (
          <BasicSetup
            config={deploymentConfig}
            onChange={handleConfigChange}
            errors={errors}
            onStepVisibilityChange={handleStepVisibilityChange}
          />
        );
      case 1:
        return (
          <TemplateConfig
            config={deploymentConfig}
            onChange={handleConfigChange}
            errors={errors}
          />
        );
      case 2:
        return (
          <RepositoryConfig
            config={deploymentConfig}
            onChange={handleConfigChange}
            errors={errors}
          />
        );
      case 3:
        return (
          <ResourceConfig
            config={deploymentConfig}
            onChange={handleConfigChange}
            errors={errors}
          />
        );
      case 4:
        return (
          <AffinityConfig
            config={deploymentConfig}
            onChange={handleConfigChange}
            errors={errors}
          />
        );
      case 5:
        return (
          <VolumeConfig
            config={deploymentConfig}
            onChange={handleConfigChange}
            errors={errors}
          />
        );
      case 6:
        return (
          <ConfigMapEditor
            config={deploymentConfig}
            onChange={handleConfigChange}
            errors={errors}
          />
        );
      case 7:
        return (
          <SecretEditor
            config={deploymentConfig}
            onChange={handleConfigChange}
            errors={errors}
          />
        );
      case 8:
        return deploymentConfig.enableResourceQuota ? (
          <NamespaceQuotaConfig
            config={deploymentConfig}
            onChange={handleConfigChange}
            errors={errors}
          />
        ) : handleNext();
      case 9:
        return (
          <DeploymentPreview
            config={deploymentConfig}
            onDeploy={onDeploy}
            onBack={handleBack}
          />
        );
      default:
        return null;
    }
  }, [deploymentConfig, errors, handleConfigChange, onDeploy]);

  const handleStepClick = (step) => {
    if (step < steps.length - 1) {
      setActiveStep(step);
    }
  };

  const handleStepVisibilityChange = (stepName, isVisible) => {
    setVisibleSteps(prev => ({
      ...prev,
      [stepName]: isVisible
    }));
  };

  const getVisibleSteps = useCallback(() => {
    return steps.filter(step => visibleSteps[step]);
  }, [visibleSteps]);

  return (
    <Box sx={{ width: '100%' }}>
      <Stepper activeStep={activeStep}>
        {getVisibleSteps().map((step, index) => (
          <Step key={step}>
            <StepLabel>{t(`podDeployment:podDeployment.steps.${step}`)}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Box sx={{ mt: 4, mb: 2 }}>
        <Paper sx={{ p: 3 }}>
          {renderStepContent(activeStep)}
        </Paper>
      </Box>

      {activeStep !== 9 && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
          <Button onClick={onCancel}>
            {t('common:common.cancel')}
          </Button>
          <Box sx={{ display: 'flex', gap: 2 }}>
            {activeStep > 0 && (
              <Button onClick={handleBack}>
                {t('common:common.back')}
              </Button>
            )}
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={Object.keys(errors).length > 0}
            >
              {t('common:common.next')}
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default StepperDeployment;