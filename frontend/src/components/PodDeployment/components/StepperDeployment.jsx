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

const steps = [
  'basicSetup',
  'templateConfig',
  'resourceConfig',
  'affinityConfig',
  'volumeConfig',
  'configMapConfig',
  'secretConfig',
  'preview'
];

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
    secrets: []
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (deployment) {
      setDeploymentConfig(deployment);
    }
  }, [deployment]);

  const validateStep = useCallback((step) => {
    const newErrors = {};
    switch (step) {
      case 0: // Basic Setup
        if (deploymentConfig.name && !/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(deploymentConfig.name)) {
          newErrors.name = t('podDeployment:podDeployment.validation.name.format');
        }
        break;
      case 7: // Preview - Only validate required fields in final step
        if (!deploymentConfig.name || !deploymentConfig.namespace || !deploymentConfig.templatePath) {
          return false;
        }
        break;
    }
    setErrors(newErrors);
    return true; // Always return true except for final validation
  }, [deploymentConfig, t]);

  const handleNext = useCallback(() => {
    if (validateStep(activeStep)) {
      setActiveStep(prev => prev + 1);
    }
  }, [activeStep, validateStep]);

  const handleBack = useCallback(() => {
    setActiveStep(prev => prev - 1);
  }, []);

  const handleConfigChange = useCallback((newConfig) => {
    setDeploymentConfig(prev => ({
      ...prev,
      ...newConfig
    }));
  }, []);

  const renderStepContent = useCallback((step) => {
    switch (step) {
      case 0:
        return (
          <BasicSetup
            config={deploymentConfig}
            onChange={handleConfigChange}
            errors={errors}
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
          <ResourceConfig
            config={deploymentConfig}
            onChange={handleConfigChange}
            errors={errors}
          />
        );
      case 3:
        return (
          <AffinityConfig
            config={deploymentConfig}
            onChange={handleConfigChange}
            errors={errors}
          />
        );
      case 4:
        return (
          <VolumeConfig
            config={deploymentConfig}
            onChange={handleConfigChange}
            errors={errors}
          />
        );
      case 5:
        return (
          <ConfigMapEditor
            config={deploymentConfig}
            onChange={handleConfigChange}
            errors={errors}
          />
        );
      case 6:
        return (
          <SecretEditor
            config={deploymentConfig}
            onChange={handleConfigChange}
            errors={errors}
          />
        );
      case 7:
        return (
          <DeploymentPreview
            config={deploymentConfig}
            onDeploy={onDeploy}
            onBack={() => setActiveStep(prev => prev - 1)}
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

  return (
    <Box sx={{ width: '100%' }}>
      <Stepper activeStep={activeStep} alternativeLabel>
        {steps.map((label, index) => (
          <Step key={label} onClick={() => handleStepClick(index)} sx={{ cursor: 'pointer' }}>
            <StepLabel>
              {t(`podDeployment:podDeployment.steps.${label}`)}
            </StepLabel>
          </Step>
        ))}
      </Stepper>

      <Box sx={{ mt: 4, mb: 2 }}>
        <Paper sx={{ p: 3 }}>
          {renderStepContent(activeStep)}
        </Paper>
      </Box>

      {activeStep !== 7 && (
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