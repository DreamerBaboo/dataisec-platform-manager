import React, { useState, useEffect } from 'react';
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
  DialogActions
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useAppTranslation } from '../../../hooks/useAppTranslation';
import axios from 'axios';
import YAML from 'yaml';
import PropTypes from 'prop-types';
import { podDeploymentService } from '../../../services/podDeploymentService';

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

  // 當組件掛載時加載現有配置
  useEffect(() => {
    const loadStorageConfig = async () => {
      if (!config?.name || !config?.version) {
        console.log('No deployment name or version provided');
        return;
      }

      try {
        setLoading(true);
        console.log('Loading storage configuration for:', config.name, config.version);
        
        const response = await podDeploymentService.getStorageConfig(config.name, config.version);
        console.log('Loaded storage configuration:', response);

        if (response.storageClassYaml) {
          setShowStorageClass(true);
        }

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
        console.error('Failed to load storage configuration:', error);
        setError(t('podDeployment:errors.failedToLoadStorage'));
      } finally {
        setLoading(false);
      }
    };

    loadStorageConfig();
  }, [config?.name, config?.version]);

  // 保存配置
  const saveStorageConfig = async () => {
    if (!config?.name || !config?.version) {
      console.error('Missing deployment name or version');
      return;
    }

    try {
      setLoading(true);
      console.log('Saving storage configuration...');

      const storageConfig = {
        storageClassYaml: generateStorageClassYaml(),
        persistentVolumeYaml: generatePersistentVolumeYaml()
      };

      console.log('Storage configuration to save:', storageConfig);

      await podDeploymentService.saveStorageConfig(
        config.name,
        config.version,
        storageConfig
      );

      console.log('Storage configuration saved successfully');
      setError(null);
    } catch (error) {
      console.error('Failed to save storage configuration:', error);
      setError(t('podDeployment:errors.failedToSaveStorage'));
    } finally {
      setLoading(false);
    }
  };

  // 當配置改變時自動保存
  useEffect(() => {
    if (showStorageClass || persistentVolumes.length > 0) {
      saveStorageConfig();
    }
  }, [showStorageClass, persistentVolumes]);

  // 獲取節點列表
  useEffect(() => {
    const fetchNodes = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/k8s/nodes', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        if (response.data && Array.isArray(response.data)) {
          setNodes(response.data);
        }
        setError(null);
      } catch (err) {
        console.error('Failed to fetch nodes:', err);
        setError(t('podDeployment:errors.failedToFetchNodes'));
      } finally {
        setLoading(false);
      }
    };
    fetchNodes();
  }, [t]);

  // 添加 PV - 修改命名邏輯
  const handleAddPersistentVolume = () => {
    // 確保有部署名稱
    if (!config?.name) {
      console.error('Deployment name is required');
      return;
    }

    // 生成新的 PV 序號
    const pvIndex = persistentVolumes.length;
    // 格式化序號為兩位數，例如：01, 02, 03...
    const sequenceNumber = String(pvIndex).padStart(2, '0');
    const newPvName = `${config.name}-pv${sequenceNumber}`;

    console.log('Creating new PV:', newPvName); // 添加日誌

    setPersistentVolumes(prev => [
      ...prev,
      {
        name: newPvName,
        labels: {
          type: 'local'
        },
        capacity: {
          storage: '1Gi'
        },
        volumeMode: 'Filesystem',
        accessModes: ['ReadWriteOnce'],
        persistentVolumeReclaimPolicy: 'Retain',
        storageClassName: config?.name ? `${config.name}-storageclass` : '',
        local: {
          path: '/data'
        },
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

  // 移除 PV - 更新後續 PV 的命名
  const handleRemovePV = (indexToRemove) => {
    setPersistentVolumes(prev => {
      const updatedPVs = prev.filter((_, index) => index !== indexToRemove);
      
      // 重新命名剩餘的 PV
      return updatedPVs.map((pv, index) => {
        const sequenceNumber = String(index).padStart(2, '0');
        return {
          ...pv,
          name: `${config.name}-pv${sequenceNumber}`
        };
      });
    });
  };

  // 處理 PV 變更
  const handlePVChange = (index, field, value) => {
    console.log('Updating PV:', { index, field, value });

    setPersistentVolumes(prev => prev.map((pv, i) => {
      if (i === index) {
        if (field.includes('.')) {
          const parts = field.split('.');
          let newPv = { ...pv };
          let current = newPv;
          
          // 遍歷路徑直到倒數第二個部分
          for (let i = 0; i < parts.length - 1; i++) {
            if (!current[parts[i]]) {
              current[parts[i]] = {};
            }
            current = current[parts[i]];
          }
          
          // 設置最後一個屬性的值
          current[parts[parts.length - 1]] = value;
          
          console.log('Updated PV:', newPv);
          return newPv;
        }
        return { ...pv, [field]: value };
      }
      return pv;
    }));
  };

  // 驗證容量格式的函數
  const validateStorageCapacity = (value) => {
    const regex = /^[1-9][0-9]*[KMGT]i$/;
    if (!regex.test(value)) {
      return 'Invalid format. Must be a number followed by Ki, Mi, Gi, or Ti (e.g., 1Gi, 500Mi)';
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
      return `Size too large. Maximum allowed is ${maxSizes[unit]}${unit}`;
    }

    return '';
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
          - ${pv.nodeAffinity?.required?.nodeSelectorTerms?.[0]?.matchExpressions?.[0]?.values?.[0] || ''}`).join('\n---\n');
  };

  // 生成完整的預覽 YAML
  const generatePreview = () => {
    if (!showStorageClass) return '';

    const storageClassYaml = generateStorageClassYaml();

    const persistentVolumeYaml = persistentVolumes.map(pv => {
      const selectedNode = pv?.nodeAffinity?.required?.nodeSelectorTerms?.[0]?.matchExpressions?.[0]?.values?.[0] || '';
      
      return `
apiVersion: v1
kind: PersistentVolume
metadata:
  name: ${pv.name}
  labels:
    type: ${pv.labels.type}
spec:
  capacity:
    storage: ${pv.capacity.storage}
  volumeMode: ${pv.volumeMode}
  accessModes:
    - ${pv.accessModes[0]}
  persistentVolumeReclaimPolicy: ${pv.persistentVolumeReclaimPolicy}
  storageClassName: ${config?.name}-${config?.version}-storageclass
  local:
    path: ${pv.local.path}
  nodeAffinity:
    required:
      nodeSelectorTerms:
      - matchExpressions:
        - key: kubernetes.io/hostname
          operator: In
          values:
          - ${selectedNode}`;
    }).join('\n---\n');

    if (storageClassYaml && persistentVolumeYaml) {
      return `${storageClassYaml}\n---\n${persistentVolumeYaml}`;
    } else if (storageClassYaml) {
      return storageClassYaml;
    } else if (persistentVolumeYaml) {
      return persistentVolumeYaml;
    }
    return '';
  };

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

      {/* StorageClass 配置 */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">
          {t('podDeployment:podDeployment.volume.storageClassConfiguration')}
        </Typography>
      </Box>

      {showStorageClass && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            {t('podDeployment:podDeployment.volume.storageClassConfiguration')}
          </Typography>
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
            {generateStorageClassYaml()}
          </pre>
        </Paper>
      )}

      {/* PersistentVolume 配置 - 只在有 StorageClass 時顯示 */}
      {showStorageClass && (
        <Box sx={{ mt: 3 }}>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              Persistent Volumes
            </Typography>
            <Button
              startIcon={<AddIcon />}
              onClick={handleAddPersistentVolume}
              variant="contained"
            >
              Add Persistent Volume
            </Button>
          </Box>

          {persistentVolumes.map((pv, index) => (
            <Paper key={index} sx={{ p: 2, mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1">
                  Persistent Volume #{index + 1} ({pv.name})
                </Typography>
                <IconButton
                  onClick={() => handleRemovePV(index)}
                  color="error"
                  size="small"
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Name"
                    value={pv.name}
                    disabled
                    helperText="Automatically generated name"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Storage Capacity"
                    value={pv.capacity.storage}
                    onChange={(e) => handleCapacityChange(index, e.target.value)}
                    onBlur={(e) => handleCapacityBlur(index, e.target.value)}
                    error={!!localErrors[`pv${index}Capacity`]}
                    helperText={localErrors[`pv${index}Capacity`] || "e.g., 1Gi, 500Mi"}
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Volume Mode</InputLabel>
                    <Select
                      value={pv.volumeMode}
                      onChange={(e) => handlePVChange(index, 'volumeMode', e.target.value)}
                    >
                      <MenuItem value="Filesystem">Filesystem</MenuItem>
                      <MenuItem value="Block">Block</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Access Mode</InputLabel>
                    <Select
                      value={pv.accessModes[0]}
                      onChange={(e) => handlePVChange(index, 'accessModes', [e.target.value])}
                    >
                      <MenuItem value="ReadWriteOnce">ReadWriteOnce</MenuItem>
                      <MenuItem value="ReadOnlyMany">ReadOnlyMany</MenuItem>
                      <MenuItem value="ReadWriteMany">ReadWriteMany</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Local Path"
                    value={pv.local.path}
                    onChange={(e) => handlePVChange(index, 'local.path', e.target.value)}
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Node Hostname</InputLabel>
                    <Select
                      value={pv.nodeAffinity?.required?.nodeSelectorTerms?.[0]?.matchExpressions?.[0]?.values?.[0] || ''}
                      onChange={(e) => {
                        console.log('Node selection changed:', e.target.value);
                        handlePVChange(
                          index,
                          'nodeAffinity.required.nodeSelectorTerms.0.matchExpressions.0.values.0',
                          e.target.value
                        );
                      }}
                      required
                    >
                      {nodes.map(node => (
                        <MenuItem key={node.name} value={node.name}>
                          {node.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Paper>
          ))}
        </Box>
      )}

      {/* YAML 預覽 */}
      {(showStorageClass || persistentVolumes.length > 0) && (
        <Paper sx={{ p: 2, mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Configuration Preview
          </Typography>
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
            {generatePreview()}
          </pre>
        </Paper>
      )}

      {!showStorageClass && (
        <Box sx={{ mt: 2 }}>
          <Button
            variant="contained"
            onClick={() => setCreateStorageClassDialog(true)}
            startIcon={<AddIcon />}
          >
            {t('podDeployment:podDeployment.volume.createStorageClass')}
          </Button>
        </Box>
      )}

      <Dialog 
        open={createStorageClassDialog} 
        onClose={() => setCreateStorageClassDialog(false)}
      >
        <DialogTitle>
          {t('podDeployment:podDeployment.volume.createStorageClass')}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {/* Display storage class name */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                disabled
                value={`${config.name}-storageclass`}
                label={t('podDeployment:podDeployment.volume.storageClassName')}
              />
            </Grid>
            {/* Reclaim Policy selection */}
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>
                  {t('podDeployment:podDeployment.volume.reclaimPolicy')}
                </InputLabel>
                <Select
                  value={newStorageClass.reclaimPolicy}
                  onChange={(e) => setNewStorageClass(prev => ({
                    ...prev,
                    reclaimPolicy: e.target.value
                  }))}
                >
                  <MenuItem value="Retain">Retain</MenuItem>
                  <MenuItem value="Delete">Delete</MenuItem>
                  <MenuItem value="Recycle">Recycle</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateStorageClassDialog(false)}>
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