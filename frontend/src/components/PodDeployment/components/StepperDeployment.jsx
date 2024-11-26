import React, { useState, useEffect, useCallback } from 'react';
import { logger } from '../../../utils/logger'; // 導入 logger
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
import { podDeploymentService } from '../../../services/podDeploymentService';
import CommandExecutor from './CommandExecutor';

const StepperDeployment = ({ deployment, onSave, onCancel, onDeploy }) => {
  const { t } = useAppTranslation();
  const [activeStep, setActiveStep] = useState(0);
  const [versions, setVersions] = useState([]);
  const [deploymentConfig, setDeploymentConfig] = useState({
    name: deployment?.name || '',
    namespace: deployment?.namespace || 'default',
    templatePath: deployment?.templatePath || '',
    yamlConfig: deployment?.yamlConfig || null,
    resources: deployment?.resources || {},
    affinity: deployment?.affinity || {},
    volumes: deployment?.volumes || [],
    configMaps: deployment?.configMaps || [],
    secrets: deployment?.secrets || [],
    enableResourceQuota: deployment?.enableResourceQuota || false,
    resourceQuota: deployment?.resourceQuota || null,
    version: deployment?.version || ''
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
  const [isCommandExecutorOpen, setIsCommandExecutorOpen] = useState(false);

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

  useEffect(() => {
    const fetchVersions = async () => {
      if (!deploymentConfig.name) return;
      
      try {
        const response = await podDeploymentService.getDeploymentVersions(deploymentConfig.name);
        const versionList = Array.isArray(response.versions) ? response.versions : [];
        setVersions(versionList);
        
        if (deployment && !deploymentConfig.version && response.latestVersion) {
          setDeploymentConfig(prev => ({
            ...prev,
            version: response.latestVersion
          }));
        }
      } catch (error) {
        console.error('Failed to fetch versions:', error);
      }
    };

    fetchVersions();
  }, [deploymentConfig.name, deployment]);

  const validateStep = useCallback((step, config = deploymentConfig) => {
    const newErrors = {};
    
    switch (step) {
      case 0: // Basic Setup
        if (!config.name) {
          newErrors.name = t('podDeployment:podDeployment.validation.name.required');
        } else if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(config.name)) {
          newErrors.name = t('podDeployment:podDeployment.validation.name.format');
        }
        
        if (!config.version) {
          newErrors.version = t('podDeployment:podDeployment.validation.version.required');
        }
        
        if (!config.namespace) {
          newErrors.namespace = t('podDeployment:podDeployment.validation.namespace.required');
        } else if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(config.namespace)) {
          newErrors.namespace = t('podDeployment:podDeployment.validation.namespace.format');
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
        
      case 8: // Namespace Quota
        if (config.enableResourceQuota && !config.resourceQuota) {
          newErrors.resourceQuota = t('podDeployment:podDeployment.validation.resourceQuota.required');
        }
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [deploymentConfig, visibleSteps, t]);

  const handleNext = async () => {
    try {
      // 驗證當前步驟
      if (!validateStep(activeStep)) {
        return;
      }

      // 特殊處理 namespace quota 步驟
      if (activeStep === 8) {
        if (!deploymentConfig.enableResourceQuota) {
          // 如果未啟用 quota，直接跳到下一步
          setActiveStep(prevStep => prevStep + 1);
          return;
        }
        // 如果啟用了 quota 但沒有設置值，不允許進入下一步
        if (!deploymentConfig.resourceQuota) {
          setErrors(prev => ({
            ...prev,
            resourceQuota: t('podDeployment:podDeployment.validation.resourceQuota.required')
          }));
          return;
        }
      }

      // 保存當前配置
      if (activeStep === 0) {
        const configToSave = {
          ...deploymentConfig,
          timestamp: new Date().toISOString()
        };
        
        logger.info('💾 Preparing to save config:', {
          name: configToSave.name,
          version: configToSave.version,
          isNewVersion: !versions.includes(configToSave.version)
        });
        
        try {
          await podDeploymentService.saveDeploymentConfig(
            configToSave.name,
            configToSave.version,
            configToSave
          );

          // 重新加載版本列表
          const response = await podDeploymentService.getDeploymentVersions(configToSave.name);
          setVersions(Array.isArray(response.versions) ? response.versions : []);
          
          logger.info('✅ Configuration saved and versions updated');
        } catch (error) {
          console.error('❌ Failed to save configuration:', error);
          setErrors(prev => ({
            ...prev,
            save: t('podDeployment:podDeployment.errors.saveFailed')
          }));
          return;
        }
      }
      
      // 移動到下一步
      setActiveStep(prevStep => {
        const nextStep = prevStep + 1;
        logger.info('📊 Moving to next step:', {
          currentStep: prevStep,
          nextStep: nextStep,
          config: deploymentConfig
        });
        return nextStep;
      });
    } catch (error) {
      console.error('❌ Failed to process next step:', error);
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
  logger.info('🔄 Config change in StepperDeployment:', {
    currentConfig: deploymentConfig,
    newConfig: newConfig,
    isVersionChange: newConfig.version !== deploymentConfig.version
  });

  setDeploymentConfig(prev => {
    const updatedConfig = {
      ...prev,
      ...newConfig
    };
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

  // 監聽配置變更
  useEffect(() => {
    logger.info('📊 Deployment config updated:', {
      name: deploymentConfig.name,
      version: deploymentConfig.version,
      step: activeStep,
      timestamp: new Date().toISOString()
    });
  }, [deploymentConfig, activeStep]);

  // 改版本監聽器
  useEffect(() => {
    const loadVersionConfig = async () => {
      if (!deploymentConfig.name || !deploymentConfig.version) return;
      
      // 只在加載現有版本時獲取配置
      if (versions.includes(deploymentConfig.version)) {
        try {
          const versionConfig = await podDeploymentService.getVersionConfig(
            deploymentConfig.name,
            deploymentConfig.version
          );
          
          logger.info('📥 Loading version config:', {
            name: deploymentConfig.name,
            version: deploymentConfig.version,
            config: versionConfig
          });
          
          setDeploymentConfig(prev => ({
            ...prev,
            ...versionConfig.config
          }));
        } catch (error) {
          console.error('Failed to load version config:', error);
        }
      }
    };

    loadVersionConfig();
  }, [deploymentConfig.name, deploymentConfig.version, versions]);

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

      <CommandExecutor
        name={deploymentConfig.name}
        version={deploymentConfig.version}
        namespace={deploymentConfig.yamlTemplate?.placeholders?.namespace || 'default'}
        open={isCommandExecutorOpen}
        onClose={() => setIsCommandExecutorOpen(false)}
      />
    </Box>
  );
};

export default StepperDeployment;