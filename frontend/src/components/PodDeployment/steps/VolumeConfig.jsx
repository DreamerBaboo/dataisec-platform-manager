import React, { useState, useEffect, useImperativeHandle } from 'react';
import { logger } from '../../../utils/logger.ts'; // 導入 logger
import {
  Box,
  Button,
  TextField,
  Typography,
  Grid,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Autocomplete,
  FormHelperText,
  Snackbar
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Visibility as VisibilityIcon, VisibilityOff as VisibilityOffIcon } from '@mui/icons-material';
import { useAppTranslation } from '../../../hooks/useAppTranslation';
import axios from 'axios';
import YAML from 'yaml';
import PropTypes from 'prop-types';
import { podDeploymentService } from '../../../services/podDeploymentService';
import path from 'path';

const VolumeConfig = ({ config, onChange, errors = {} }) => {
  const { t } = useAppTranslation();
  const [nodes, setNodes] = useState([]);
  const [persistentVolumes, setPersistentVolumes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showStorageClass, setShowStorageClass] = useState(false);
  const [localErrors, setLocalErrors] = useState({});
  const [createStorageClassDialog, setCreateStorageClassDialog] = useState(false);
  const [newStorageClass, setNewStorageClass] = useState({
    reclaimPolicy: 'Retain',
    volumeBindingMode: 'WaitForFirstConsumer',
    provisioner: 'kubernetes.io/no-provisioner'
  });
  const [showStoragePreview, setShowStoragePreview] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarVariant, setSnackbarVariant] = useState('success');

  // Load existing configuration when component mounts
  useEffect(() => {
    const loadStorageConfig = async () => {
      if (!config?.name || !config?.version) {
        logger.info('No deployment name or version provided');
        return;
      }

      try {
        setLoading(true);
        logger.info('Loading storage configuration for:', config.name, config.version);
        
        const response = await podDeploymentService.getStorageConfig(config.name, config.version);
        logger.info('Loaded storage configuration:', response);

        // Set storage class visibility if it exists
        if (response.storageClassYaml) {
          setShowStorageClass(true);
        }

        // Parse and set persistent volumes if they exist
        if (response.persistentVolumeYaml) {
          const pvDocs = YAML.parseAllDocuments(response.persistentVolumeYaml);
          const pvConfigs = pvDocs.map(doc => doc.toJSON()).filter(Boolean);
          
          const formattedPVs = pvConfigs.map(pv => ({
            name: pv.metadata.name,
            labels: pv.metadata.labels || { type: 'local' },
            capacity: pv.spec.capacity,
            volumeMode: pv.spec.volumeMode,
            accessModes: pv.spec.accessModes,
            persistentVolumeReclaimPolicy: pv.spec.persistentVolumeReclaimPolicy,
            storageClassName: pv.spec.storageClassName,
            local: pv.spec.local,
            nodeAffinity: pv.spec.nodeAffinity
          }));

          setPersistentVolumes(formattedPVs);
        }
      } catch (error) {
        if (error.response?.status !== 404) {
          console.error('Failed to load storage configuration:', error);
          setError(t('podDeployment:errors.failedToLoadStorage'));
        }
      } finally {
        setLoading(false);
      }
    };

    loadStorageConfig();
  }, [config?.name, config?.version]);

  // Save configuration whenever it changes
  useEffect(() => {
    const saveStorageConfig = async () => {
      if (!config?.name || !config?.version || !showStorageClass) return;

      try {
        const storageConfig = {
          storageClassYaml: generateStorageClassYaml(),
          persistentVolumeYaml: persistentVolumes.length > 0 ? generatePersistentVolumeYaml() : null
        };

        await podDeploymentService.saveStorageConfig(
          config.name,
          config.version,
          storageConfig
        );

        // Only delete PV file if storage class exists and PV array is empty
        if (showStorageClass && persistentVolumes.length === 0) {
          await podDeploymentService.deleteStorageConfig(
            config.name,
            config.version,
            'persistentVolume'
          );
        }

      } catch (error) {
        console.error('Failed to save storage configuration:', error);
        setError(t('podDeployment:errors.failedToSaveStorage'));
      }
    };

    saveStorageConfig();
  }, [showStorageClass, persistentVolumes, config?.name, config?.version]);

  // 修改節點數據的獲取
  useEffect(() => {
    const fetchNodes = async () => {
      try {
        setLoading(true);
        // 使用 podDeploymentService 獲取節點列表
        const response = await podDeploymentService.getNodes();
        logger.info('Fetched nodes:', response); // 用於調試

        if (response && Array.isArray(response)) {
          const formattedNodes = response.map(node => ({
            name: node.name,
            role: node.role || '',
            status: node.status || ''
          }));
          logger.info('Formatted nodes:', formattedNodes); // 用於調試
          setNodes(formattedNodes);
        }
      } catch (error) {
        console.error('Failed to fetch nodes:', error);
        setError(t('podDeployment:errors.failedToFetchNodes'));
      } finally {
        setLoading(false);
      }
    };

    fetchNodes();
  }, []);

  // 驗證容量式的函數
  const validateStorageCapacity = (value) => {
    if (!value) {
      return t('podDeployment:errors.storageRequired');
    }
    const regex = /^[1-9][0-9]*[KMGT]i$/;
    if (!regex.test(value)) {
      return t('podDeployment:errors.invalidStorageFormat');
    }

    const size = parseInt(value.replace(/[KMGT]i$/, ''));
    const unit = value.match(/[KMGT]i$/)[0];

    const maxSizes = {
      'Ki': 1024 * 1024,
      'Mi': 1024,
      'Gi': 1024,
      'Ti': 100
    };

    if (size > maxSizes[unit]) {
      return t('podDeployment:errors.storageTooLarge', { max: maxSizes[unit], unit });
    }

    return '';
  };

  // 驗證持久卷名稱的函數
  const validatePVName = (name) => {
    const regex = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;
    if (!name) {
      return t('podDeployment:errors.pvNameRequired');
    }
    if (!regex.test(name)) {
      return t('podDeployment:errors.pvNameInvalid');
    }
    if (name.length > 253) {
      return t('podDeployment:errors.pvNameTooLong');
    }
    return '';
  };

  // 驗證路徑的函數
  const validatePath = (path) => {
    if (!path) {
      return t('podDeployment:errors.pathRequired');
    }
    if (!path.startsWith('/')) {
      return t('podDeployment:errors.pathMustStartWithSlash');
    }
    return '';
  };

  // 驗證節點選擇器的函數
  const validateNodeSelector = (node) => {
    if (!node) {
      return t('podDeployment:errors.nodeSelectorRequired');
    }
    return '';
  };

  // 驗證所有持久卷
  const validatePersistentVolumes = () => {
    if (persistentVolumes.length === 0) {
      return true;
    }

    const errors = {};
    let isValid = true;

    persistentVolumes.forEach((pv, index) => {
      // Validate name
      const nameError = validatePVName(pv.name);
      if (nameError) {
        errors[`pv${index}name`] = nameError;
        isValid = false;
      }

      // Validate path
      const pathError = validatePath(pv.local.path);
      if (pathError) {
        errors[`pv${index}path`] = pathError;
        isValid = false;
      }

      // Validate capacity
      const capacityError = validateStorageCapacity(pv.capacity.storage);
      if (capacityError) {
        errors[`pv${index}Capacity`] = capacityError;
        isValid = false;
      }

      // Validate node selector
      const nodeSelectorValue = pv.nodeAffinity?.required?.nodeSelectorTerms?.[0]?.matchExpressions?.[0]?.values?.[0];
      const nodeSelectorError = validateNodeSelector(nodeSelectorValue);
      if (nodeSelectorError) {
        errors[`pv${index}nodeSelector`] = nodeSelectorError;
        isValid = false;
      }
    });

    setLocalErrors(errors);
    if (!isValid) {
      setError(t('podDeployment:errors.invalidPersistentVolumes'));
    }
    return isValid;
  };

  // 處理容量值變更 - 只在輸入時更新值
  const handleCapacityChange = (index, value) => {
    handlePVChange(index, 'capacity.storage', value);
    // 清除該字段的錯誤
    setLocalErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[`pv${index}Capacity`];
      return newErrors;
    });
  };

  // 處理容量值失去焦點 - 進行驗證
  const handleCapacityBlur = (index, value) => {
    const error = validateStorageCapacity(value);
    if (error) {
      setLocalErrors(prev => ({
        ...prev,
        [`pv${index}Capacity`]: error
      }));
    } else {
      setLocalErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`pv${index}Capacity`];
        return newErrors;
      });
    }
  };

  // 處理持久卷字段變更
  const handlePVChange = async (index, field, value) => {
    const newPVs = [...persistentVolumes];
    
    // 根據字段路徑更新值
    switch (field) {
      case 'path':
        newPVs[index].local.path = value;
        break;
      case 'capacity.storage':
        newPVs[index].capacity.storage = value;
        break;
      case 'nodeSelector':
        const oldNode = newPVs[index].nodeAffinity?.required?.nodeSelectorTerms?.[0]?.matchExpressions?.[0]?.values?.[0];
        newPVs[index].nodeAffinity.required.nodeSelectorTerms[0].matchExpressions[0].values = [value];
        
        // 如果節點有變更且路徑已設置，則創建目錄
        const path = newPVs[index].local?.path;
        if (value && value !== oldNode && path) {
          try {
            await podDeploymentService.createHostDirectory(value, path);
            // Show success message
            setSnackbarMessage(t('podDeployment:messages.hostDirectoryCreated'));
            setSnackbarVariant('success');
            setSnackbarOpen(true);
          } catch (error) {
            console.error('Failed to create host directory:', error);
            setSnackbarMessage(t('podDeployment:errors.hostDirectoryCreationFailed'));
            setSnackbarVariant('error');
            setSnackbarOpen(true);
          }
        }
        
        // 清除節點選擇器錯誤
        if (value) {
          setLocalErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[`pv${index}nodeSelector`];
            return newErrors;
          });
        }
        break;
      default:
        newPVs[index][field] = value;
    }
    
    setPersistentVolumes(newPVs);

    // 通知父組件配置已更改
    onChange({
      ...config,
      persistentVolumes: newPVs,
      isValid: validatePersistentVolumes()
    });
  };

  // Save to deploy-scripts folder when navigating
  const handleNext = async () => {
    try {
      // Only validate if there are persistent volumes
      if (persistentVolumes.length > 0) {
        const isValid = validatePersistentVolumes();
        if (!isValid) {
          return false;
        }
      }

      const deployScriptsPath = path.join('deploymentTemplate', config.name, 'deploy-scripts');
      const combinedYaml = generatePreview();
      
      if (combinedYaml) {
        await podDeploymentService.saveDeployScript(
          config.name,
          config.version,
          'storage.yaml',
          combinedYaml
        );
      }
      return true;
    } catch (error) {
      console.error('Failed to save deploy script:', error);
      setError(t('podDeployment:errors.failedToSaveDeployScript'));
      return false;
    }
  };

  // 生成 StorageClass YAML
  const generateStorageClassYaml = () => {
    if (!showStorageClass) return '';
    
    return `apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ${config.name}-storageclass
provisioner: kubernetes.io/no-provisioner
reclaimPolicy: Retain
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: false`;
  };

  // 生成 PersistentVolume YAML
  const generatePersistentVolumeYaml = () => {
    if (!persistentVolumes.length) return '';
    
    return persistentVolumes.map(pv => `apiVersion: v1
kind: PersistentVolume
metadata:
  name: ${pv.name}
  labels:
    type: local
spec:
  capacity:
    storage: ${pv.capacity.storage}
  volumeMode: ${pv.volumeMode}
  accessModes:
    - ${pv.accessModes[0]}
  persistentVolumeReclaimPolicy: ${pv.persistentVolumeReclaimPolicy}
  storageClassName: ${config.name}-storageclass
  local:
    path: ${pv.local.path}
  nodeAffinity:
    required:
      nodeSelectorTerms:
      - matchExpressions:
        - key: kubernetes.io/hostname
          operator: In
          values:
          - ${pv.nodeAffinity.required.nodeSelectorTerms[0].matchExpressions[0].values[0]}`).join('\n---\n');
  };

  // 生成完整的預覽 YAML
  const generatePreview = () => {
    if (!showStorageClass) return '';

    let yamlContent = '';

    // 添加 StorageClass YAML
    if (showStorageClass) {
      yamlContent += `apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ${config?.name || 'default'}-storageclass
provisioner: kubernetes.io/no-provisioner
reclaimPolicy: Retain
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: false`;
    }

    // 添加 PersistentVolume YAML
    if (persistentVolumes && persistentVolumes.length > 0) {
      persistentVolumes.forEach((pv, index) => {
        if (index > 0 || yamlContent) {
          yamlContent += '\n---\n';
        }

        // 確保所有必要的屬性都存在
        const pvName = pv?.name || `${config?.name || 'default'}-pv-${index + 1}`;
        const pvPath = pv?.local?.path || '/data';
        const pvCapacity = pv?.capacity?.storage || '1Gi';
        const pvVolumeMode = pv?.volumeMode || 'Filesystem';
        const pvAccessMode = pv?.accessModes?.[0] || 'ReadWriteOnce';
        const pvReclaimPolicy = pv?.persistentVolumeReclaimPolicy || 'Retain';
        const selectedNode = pv?.nodeAffinity?.required?.nodeSelectorTerms?.[0]?.matchExpressions?.[0]?.values?.[0] || '';

        yamlContent += `apiVersion: v1
kind: PersistentVolume
metadata:
  name: ${pvName}
  labels:
    type: local
spec:
  capacity:
    storage: ${pvCapacity}
  volumeMode: ${pvVolumeMode}
  accessModes:
    - ${pvAccessMode}
  persistentVolumeReclaimPolicy: ${pvReclaimPolicy}
  storageClassName: ${config?.name || 'default'}-storageclass
  local:
    path: ${pvPath}
  nodeAffinity:
    required:
      nodeSelectorTerms:
      - matchExpressions:
        - key: kubernetes.io/hostname
          operator: In
          values:
          - ${selectedNode}`;
      });
    }

    return yamlContent;
  };

  // 處理存儲類配置變更
  const handleStorageConfigChange = (field, value) => {
    const updatedConfig = {
      ...config,
      yamlTemplate: {
        ...config.yamlTemplate,
        placeholders: {
          ...config.yamlTemplate?.placeholders,
          [field]: value
        }
      }
    };
    onChange(updatedConfig);
  };

  // 處理添加持久卷
  const handleAddPersistentVolume = () => {
    setPersistentVolumes([
      ...persistentVolumes,
      {
        name: `${config.name}-pv-${persistentVolumes.length + 1}`,
        local: {
          path: ''
        },
        capacity: {
          storage: ''
        },
        volumeMode: 'Filesystem',
        accessModes: ['ReadWriteOnce'],
        persistentVolumeReclaimPolicy: 'Retain',
        nodeAffinity: {
          required: {
            nodeSelectorTerms: [{
              matchExpressions: [{
                key: 'kubernetes.io/hostname',
                operator: 'In',
                values: ['']
              }]
            }]
          }
        }
      }
    ]);
  };

  // 處理刪除持久卷
  const handleDeletePersistentVolume = (index) => {
    const newPVs = persistentVolumes.filter((_, i) => i !== index);
    setPersistentVolumes(newPVs);

    // 如果刪除後沒有持久卷，可能需要更新相關狀態
    if (newPVs.length === 0) {
      // 可選：在沒有 PV 時自動刪除存儲類
      // setShowStorageClass(false);
    }
  };

  // 處理創建存儲類
  const handleCreateStorageClass = async () => {
    try {
      setLoading(true);
      
      // Storage class name is automatically set
      const storageClassConfig = {
        ...newStorageClass,
        name: `${config.name}-storageclass` // Automatic name generation
      };

      await podDeploymentService.createStorageClass(
        config.name,
        config.version,
        storageClassConfig
      );

      setCreateStorageClassDialog(false);
      setShowStorageClass(true);

      // Refresh storage configuration
      const response = await podDeploymentService.getStorageConfig(config.name, config.version);
      if (response.storageClassYaml) {
        setShowStorageClass(true);
      }
    } catch (error) {
      console.error('Failed to create storage class:', error);
      setError(t('podDeployment:errors.failedToCreateStorageClass'));
    } finally {
      setLoading(false);
    }
  };

  // 處理刪除存儲類
  const handleDeleteStorageClass = async () => {
    try {
      setLoading(true);
      await podDeploymentService.deleteStorageConfig(
        config.name,
        config.version,
        'all' // Delete both storage class and PV files
      );
      setShowStorageClass(false);
      setPersistentVolumes([]);
    } catch (error) {
      console.error('Failed to delete storage configuration:', error);
      setError(t('podDeployment:errors.failedToDeleteStorage'));
    } finally {
      setLoading(false);
    }
  };

  // 從模板中獲取預設
  const defaultValues = config.yamlTemplate?.defaultValues || {};
  const placeholders = config.yamlTemplate?.placeholders || {};

  // 在 UI 中渲染持久卷字段
  const renderPersistentVolumeFields = (pv, index) => {
    const pvId = `pv-${index}`;
    
    return (
      <Paper 
        key={index} 
        elevation={0} 
        sx={{ 
          p: 2, 
          mb: 2, 
          border: '1px solid',
          borderColor: 'divider'
        }}
      >
        <Grid container spacing={2}>
          <Grid item xs={12} display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle2">
              {t('podDeployment:podDeployment.volume.persistentVolume')} #{index + 1}
            </Typography>
            <IconButton 
              onClick={() => handleDeletePersistentVolume(index)}
              color="error"
              size="small"
              aria-label={t('common:common.delete')}
            >
              <DeleteIcon />
            </IconButton>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              id={`${pvId}-name`}
              name={`${pvId}-name`}
              fullWidth
              label={t('podDeployment:podDeployment.volume.pvName')}
              value={pv.name}
              onChange={(e) => handlePVChange(index, 'name', e.target.value)}
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              id={`${pvId}-path`}
              name={`${pvId}-path`}
              fullWidth
              label={t('podDeployment:podDeployment.volume.hostPath')}
              value={pv.local.path}
              onChange={(e) => handlePVChange(index, 'path', e.target.value)}
              placeholder="/data/path"
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              id={`${pvId}-capacity`}
              name={`${pvId}-capacity`}
              fullWidth
              label={t('podDeployment:podDeployment.volume.capacity')}
              value={pv.capacity.storage}
              onChange={(e) => handleCapacityChange(index, e.target.value)}
              placeholder="10Gi"
              helperText={t('podDeployment:podDeployment.volume.capacityHelp')}
              onBlur={(e) => handleCapacityBlur(index, e.target.value)}
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel id={`${pvId}-node-label`}>
                {t('podDeployment:podDeployment.volume.nodeSelector')}
              </InputLabel>
              <Select
                id={`${pvId}-node`}
                name={`${pvId}-node`}
                labelId={`${pvId}-node-label`}
                value={pv.nodeAffinity?.required?.nodeSelectorTerms?.[0]?.matchExpressions?.[0]?.values?.[0] || ''}
                onChange={(e) => handlePVChange(index, 'nodeSelector', e.target.value)}
                label={t('podDeployment:podDeployment.volume.nodeSelector')}
              >
                {nodes.length > 0 ? (
                  nodes.map((node) => (
                    <MenuItem 
                      key={node.name} 
                      value={node.name}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography>
                          {node.name}
                        </Typography>
                        {node.role && (
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              ml: 1, 
                              color: 'text.secondary',
                              backgroundColor: 'action.hover',
                              px: 1,
                              py: 0.5,
                              borderRadius: 1
                            }}
                          >
                            {node.role}
                          </Typography>
                        )}
                        {node.status && (
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              ml: 1,
                              color: node.status === 'Ready' ? 'success.main' : 'error.main'
                            }}
                          >
                            {node.status}
                          </Typography>
                        )}
                      </Box>
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem disabled>
                    {t('podDeployment:podDeployment.volume.noNodesAvailable')}
                  </MenuItem>
                )}
              </Select>
              <FormHelperText>
                {t('podDeployment:podDeployment.volume.nodeSelectorHelp')}
              </FormHelperText>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>
    );
  };

  return (
    <Box>
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', m: 2 }}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Volume Configuration Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          {t('podDeployment:podDeployment.volume.basicConfiguration')}
        </Typography>
        <Paper sx={{ p: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Autocomplete
                freeSolo
                options={config.yamlTemplate?.defaultValues?.storage_class || []}
                value={config.yamlTemplate?.placeholders?.storage_class || ''}
                onChange={(_, newValue) => handleStorageConfigChange('storage_class', newValue)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    fullWidth
                    label={t('podDeployment:podDeployment.volume.storageClass')}
                    error={!!errors?.storage_class}
                    helperText={errors?.storage_class}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Autocomplete
                freeSolo
                options={config.yamlTemplate?.defaultValues?.storage_access_mode || []}
                value={config.yamlTemplate?.placeholders?.storage_access_mode || ''}
                onChange={(_, newValue) => handleStorageConfigChange('storage_access_mode', newValue)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    fullWidth
                    label={t('podDeployment:podDeployment.volume.accessMode')}
                    error={!!errors?.storage_access_mode}
                    helperText={errors?.storage_access_mode}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Autocomplete
                freeSolo
                options={config.yamlTemplate?.defaultValues?.persistence_size || []}
                value={config.yamlTemplate?.placeholders?.persistence_size || ''}
                onChange={(_, newValue) => handleStorageConfigChange('persistence_size', newValue)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    fullWidth
                    label={t('podDeployment:podDeployment.volume.persistenceSize')}
                    error={!!errors?.persistence_size}
                    helperText={errors?.persistence_size}
                  />
                )}
              />
            </Grid>
          </Grid>
        </Paper>
      </Box>

      {/* Storage Implementation Section */}
      <Box>
        <Typography variant="h6" gutterBottom>
          {t('podDeployment:podDeployment.volume.storageImplementation')}
        </Typography>
        <Paper sx={{ p: 3 }}>
          {/* Top Action Buttons Row */}
          <Box sx={{ 
            mb: 3, 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 2  // 添加按鈕之間的間距
          }}>
            {/* Left side - Create Storage Button */}
            {!showStorageClass && (
              <Button
                variant="contained"
                onClick={() => setCreateStorageClassDialog(true)}
                startIcon={<AddIcon />}
              >
                {t('podDeployment:podDeployment.volume.createStorageClass')}
              </Button>
            )}
            {/* If storage class exists, show delete button on the left */}
            {showStorageClass && (
              <Button
                variant="outlined"
                color="error"
                onClick={handleDeleteStorageClass}
                startIcon={<DeleteIcon />}
              >
                {t('common:common.delete')}
              </Button>
            )}
            
            {/* Right side - Preview Button */}
            <Button
              variant="outlined"
              startIcon={showStoragePreview ? <VisibilityOffIcon /> : <VisibilityIcon />}
              onClick={() => setShowStoragePreview(!showStoragePreview)}
            >
              {showStoragePreview 
                ? t('podDeployment:podDeployment.yamlTemplate.hidePreview')
                : t('podDeployment:podDeployment.yamlTemplate.showPreview')
              }
            </Button>
          </Box>

          {/* YAML Preview */}
          {showStoragePreview && (
            <Box sx={{ mb: 3 }}>
              <Paper 
                variant="outlined" 
                sx={{ 
                  p: 2,
                  backgroundColor: 'grey.50',
                  '& pre': {
                    margin: 0,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }
                }}
              >
                <pre>
                  <code>{generatePreview()}</code>
                </pre>
              </Paper>
            </Box>
          )}

          {/* Storage Class Configuration */}
          {showStorageClass && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ mb: 2 }}>
                {t('podDeployment:podDeployment.volume.storageClass')}
              </Typography>
              {/* ... StorageClass 配置內容 ... */}
            </Box>
          )}

          {/* Persistent Volume Configuration */}
          {showStorageClass && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1">
                  {t('podDeployment:podDeployment.volume.persistentVolumes')}
                </Typography>
                <Button
                  variant="contained"
                  onClick={handleAddPersistentVolume}
                  startIcon={<AddIcon />}
                >
                  {t('podDeployment:podDeployment.volumes.add')}
                </Button>
              </Box>

              {/* Render PV Fields */}
              {persistentVolumes.map((pv, index) => renderPersistentVolumeFields(pv, index))}
            </Box>
          )}
        </Paper>
      </Box>

      {/* Storage Class Creation Dialog */}
      <Dialog 
        open={createStorageClassDialog}
        onClose={() => setCreateStorageClassDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {t('podDeployment:podDeployment.volume.createStorageClassTitle')}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('podDeployment:podDeployment.volume.reclaimPolicy')}
                select
                value={newStorageClass.reclaimPolicy}
                onChange={(e) => setNewStorageClass({
                  ...newStorageClass,
                  reclaimPolicy: e.target.value
                })}
              >
                <MenuItem value="Retain">Retain</MenuItem>
                <MenuItem value="Delete">Delete</MenuItem>
                <MenuItem value="Recycle">Recycle</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('podDeployment:podDeployment.volume.volumeBindingMode')}
                select
                value={newStorageClass.volumeBindingMode}
                onChange={(e) => setNewStorageClass({
                  ...newStorageClass,
                  volumeBindingMode: e.target.value
                })}
              >
                <MenuItem value="Immediate">Immediate</MenuItem>
                <MenuItem value="WaitForFirstConsumer">WaitForFirstConsumer</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('podDeployment:podDeployment.volume.provisioner')}
                value={newStorageClass.provisioner}
                onChange={(e) => setNewStorageClass({
                  ...newStorageClass,
                  provisioner: e.target.value
                })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setCreateStorageClassDialog(false)}
          >
            {t('common:common.cancel')}
          </Button>
          <Button 
            variant="contained" 
            onClick={handleCreateStorageClass}
            disabled={loading}
          >
            {t('common:common.create')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ... 其他對話框和組件 ... */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
        severity={snackbarVariant}
      />
    </Box>
  );
};

// 添加 propTypes
VolumeConfig.propTypes = {
  config: PropTypes.shape({
    name: PropTypes.string,
    version: PropTypes.string
  }),
  onChange: PropTypes.func.isRequired,
  errors: PropTypes.object,
  onNext: PropTypes.func
};

export default VolumeConfig; 