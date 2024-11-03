import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Tabs,
  Tab
} from '@mui/material';
import { useAppTranslation } from '../../hooks/useAppTranslation';

// 導入子組件
import ResourceConfig from './components/ResourceConfig';
import AffinityConfig from './components/AffinityConfig';
import VolumeConfig from './components/VolumeConfig';
import ConfigMapEditor from './components/ConfigMapEditor';
import SecretEditor from './components/SecretEditor';
import ConfigImportExport from './components/ConfigImportExport';

const DeploymentForm = ({ deployment, onChange, onPreview }) => {
  const { t } = useAppTranslation();
  const [activeTab, setActiveTab] = useState(0);
  const [config, setConfig] = useState({
    name: '',
    namespace: 'default',
    type: 'deployment',
    replicas: 1,
    image: {
      repository: '',
      tag: 'latest',
      pullPolicy: 'IfNotPresent'
    },
    resources: {
      requests: {
        cpu: '100m',
        memory: '128Mi'
      },
      limits: {
        cpu: '200m',
        memory: '256Mi'
      }
    },
    affinity: {
      nodeAffinity: '',
      podAffinity: '',
      podAntiAffinity: ''
    },
    volumes: [],
    configMaps: [],
    secrets: []
  });

  useEffect(() => {
    if (deployment) {
      setConfig(deployment);
    }
  }, [deployment]);

  useEffect(() => {
    onChange?.(config);
  }, [config, onChange]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleBasicConfigChange = (field) => (event) => {
    setConfig(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const handleImageConfigChange = (field) => (event) => {
    setConfig(prev => ({
      ...prev,
      image: {
        ...prev.image,
        [field]: event.target.value
      }
    }));
  };

  const handleResourceChange = (resources) => {
    setConfig(prev => ({
      ...prev,
      resources
    }));
  };

  const handleAffinityChange = (affinity) => {
    setConfig(prev => ({
      ...prev,
      affinity
    }));
  };

  const handleVolumeChange = (volumes) => {
    setConfig(prev => ({
      ...prev,
      volumes
    }));
  };

  const handleConfigMapChange = (configMaps) => {
    setConfig(prev => ({
      ...prev,
      configMaps
    }));
  };

  const handleSecretChange = (secrets) => {
    setConfig(prev => ({
      ...prev,
      secrets
    }));
  };

  const handleImport = (importedConfig) => {
    setConfig(importedConfig);
  };

  return (
    <Box>
      <Paper sx={{ mb: 2 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label={t('podDeployment:podDeployment.tabs.basic')} />
          <Tab label={t('podDeployment:podDeployment.tabs.resources')} />
          <Tab label={t('podDeployment:podDeployment.tabs.affinity')} />
          <Tab label={t('podDeployment:podDeployment.tabs.volumes')} />
          <Tab label={t('podDeployment:podDeployment.tabs.configMaps')} />
          <Tab label={t('podDeployment:podDeployment.tabs.secrets')} />
        </Tabs>
      </Paper>

      <ConfigImportExport
        config={config}
        onImport={handleImport}
      />

      <Box sx={{ mt: 2 }}>
        {activeTab === 0 && (
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={t('podDeployment:podDeployment.basic.name')}
                value={config.name}
                onChange={handleBasicConfigChange('name')}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={t('podDeployment:podDeployment.basic.namespace')}
                value={config.namespace}
                onChange={handleBasicConfigChange('namespace')}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>{t('podDeployment:podDeployment.basic.type')}</InputLabel>
                <Select
                  value={config.type}
                  onChange={handleBasicConfigChange('type')}
                  label={t('podDeployment:podDeployment.basic.type')}
                >
                  <MenuItem value="deployment">Deployment</MenuItem>
                  <MenuItem value="statefulset">StatefulSet</MenuItem>
                  <MenuItem value="daemonset">DaemonSet</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            {config.type !== 'daemonset' && (
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label={t('podDeployment:podDeployment.basic.replicas')}
                  value={config.replicas}
                  onChange={handleBasicConfigChange('replicas')}
                  inputProps={{ min: 1 }}
                />
              </Grid>
            )}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={t('podDeployment:podDeployment.basic.repository')}
                value={config.image.repository}
                onChange={handleImageConfigChange('repository')}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={t('podDeployment:podDeployment.basic.tag')}
                value={config.image.tag}
                onChange={handleImageConfigChange('tag')}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>{t('podDeployment:podDeployment.basic.pullPolicy')}</InputLabel>
                <Select
                  value={config.image.pullPolicy}
                  onChange={handleImageConfigChange('pullPolicy')}
                  label={t('podDeployment:podDeployment.basic.pullPolicy')}
                >
                  <MenuItem value="Always">Always</MenuItem>
                  <MenuItem value="IfNotPresent">IfNotPresent</MenuItem>
                  <MenuItem value="Never">Never</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        )}

        {activeTab === 1 && (
          <ResourceConfig
            resources={config.resources}
            onChange={handleResourceChange}
          />
        )}

        {activeTab === 2 && (
          <AffinityConfig
            affinity={config.affinity}
            onChange={handleAffinityChange}
          />
        )}

        {activeTab === 3 && (
          <VolumeConfig
            volumes={config.volumes}
            onChange={handleVolumeChange}
          />
        )}

        {activeTab === 4 && (
          <ConfigMapEditor
            configMaps={config.configMaps}
            onChange={handleConfigMapChange}
          />
        )}

        {activeTab === 5 && (
          <SecretEditor
            secrets={config.secrets}
            onChange={handleSecretChange}
          />
        )}
      </Box>

      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          onClick={() => onPreview?.(config)}
          disabled={!config.name || !config.image.repository}
        >
          {t('podDeployment:podDeployment.actions.preview')}
        </Button>
      </Box>
    </Box>
  );
};

export default DeploymentForm; 