import React, { useState, useEffect } from 'react';
import { logger } from '../../utils/logger.ts';  // 導入 logger
import axios from 'axios';
import {
  Box,
  CircularProgress,
  Alert,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Chip,
  InputAdornment,
  IconButton,
  Tooltip,
  Button,
  Dialog,
  DialogContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
  DialogTitle,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Typography
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Visibility as PreviewIcon,
  Timeline as ProgressIcon,
  Article as LogIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  Download as DownloadIcon,
  Upload as UploadIcon
} from '@mui/icons-material';
import { useAppTranslation } from '../../hooks/useAppTranslation';

// Import step components
import StepperDeployment from './components/StepperDeployment';
import BasicSetup from './steps/BasicSetup';
import TemplateConfig from './steps/TemplateConfig';
import ResourceConfig from './steps/ResourceConfig';
import AffinityConfig from './steps/AffinityConfig';
import VolumeConfig from './steps/VolumeConfig';
import ConfigMapEditor from './steps/ConfigMapEditor';
import SecretEditor from './steps/SecretEditor';

// Import other components
import DeploymentPreview from './components/DeploymentPreview';
import DeploymentProgress from './components/DeploymentProgress';
import LogViewer from './components/LogViewer';
import ImportConfig from './components/ImportConfig';
import ExportConfig from './components/ExportConfig';

import { podService } from '../../services/podService';
import { podDeploymentService } from '../../services/podDeploymentService';

axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL || '/api';
axios.defaults.headers.common['Content-Type'] = 'application/json';

const PodDeploymentManagement = () => {
  const { t } = useAppTranslation();
  const [namespaces, setNamespaces] = useState([]);
  const [selectedNamespace, setSelectedNamespace] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [pods, setPods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Dialog states
  const [configDialog, setConfigDialog] = useState({ open: false, pod: null });
  const [previewDialog, setPreviewDialog] = useState({ open: false, pod: null });
  const [progressDialog, setProgressDialog] = useState({ open: false, pod: null });
  const [logDialog, setLogDialog] = useState({ open: false, pod: null });
  const [createDialog, setCreateDialog] = useState(false);

  // Add new state for stepper
  const [deploymentConfig, setDeploymentConfig] = useState(null);

  const [storageConfig, setStorageConfig] = useState({
    storageClasses: [],
    persistentVolumes: []
  });

  // Add new states for template download
  const [templateDialog, setTemplateDialog] = useState(false);
  const [availableTemplates, setAvailableTemplates] = useState([]);
  const [selectedTemplates, setSelectedTemplates] = useState([]);
  const [templateLoading, setTemplateLoading] = useState(false);

  // Add new states for template upload
  const [uploadDialog, setUploadDialog] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [existingTemplates, setExistingTemplates] = useState([]);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);

  const fetchNamespaces = async () => {
    try {
      const result = await podService.getNamespaces();
      if (result && result.namespaces) {
        setNamespaces(result.namespaces);
      }
    } catch (error) {
      console.error('Error fetching namespaces:', error);
      // Handle error appropriately
    }
  };

  const fetchPods = async () => {
    try {
      logger.info('🔍 Fetching pods for namespace:', selectedNamespace || 'all namespaces');
      // Only set loading true on initial load, not during refresh
      if (!isRefreshing) {
        setLoading(true);
      }
      const response = await axios.get(`/api/pods${selectedNamespace ? `?namespace=${selectedNamespace}` : ''}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      logger.info('✅ Pods fetched:', response.data);
      setPods(response.data);
      setError(null);
    } catch (err) {
      console.error('❌ Error fetching pods:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Add auto-refresh interval
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      setIsRefreshing(true);
      fetchPods();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(refreshInterval);
  }, [selectedNamespace]); // Re-create interval when namespace changes

  useEffect(() => {
    logger.info('🚀 Component mounted');
    fetchNamespaces();
  }, []);

  useEffect(() => {
    logger.info('📌 Selected namespace changed:', selectedNamespace);
    fetchPods();
  }, [selectedNamespace]);

  const handleRefresh = () => {
    logger.info('🔄 Manually refreshing pods...');
    setIsRefreshing(true);
    fetchPods();
  };

  const handleDelete = async (pod) => {
    try {
      logger.info('🗑️ Deleting pod:', pod);
      await axios.delete(`/api/pods/${pod.name}?namespace=${pod.namespace}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      logger.info('✅ Pod deleted successfully');
      fetchPods();
    } catch (err) {
      console.error('❌ Error deleting pod:', err);
      setError(err.message);
    }
  };

  // Modify handleConfigSave to use new config format
  const handleConfigSave = async (config) => {
    try {
      logger.info('💾 Saving pod configuration:', config);
      if (configDialog.pod) {
        await axios.put(`/api/pod-deployments/${configDialog.pod.name}`, config, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
      } else {
        await axios.post('/api/pod-deployments', config, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
      }
      logger.info('✅ Configuration saved successfully');
      setConfigDialog({ open: false, pod: null });
      fetchPods();
    } catch (err) {
      console.error('❌ Error saving configuration:', err);
      setError(err.message);
    }
  };

  // Add handler for deployment
  const handleDeploy = async (config) => {
    try {
      const response = await axios.post('/api/pod-deployments/deploy', config, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setProgressDialog({ open: true, pod: response.data });
    } catch (err) {
      setError(err.message);
    }
  };

  const filteredPods = React.useMemo(() => {
    logger.info('🔍 Filtering pods:', { pods, searchTerm, selectedNamespace });
    return pods.filter(pod => {
      const searchMatch = pod.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         pod.namespace.toLowerCase().includes(searchTerm.toLowerCase());
      const namespaceMatch = !selectedNamespace || pod.namespace === selectedNamespace;
      return searchMatch && namespaceMatch;
    });
  }, [pods, searchTerm, selectedNamespace]);

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'running': return 'success';
      case 'pending': return 'warning';
      case 'failed': return 'error';
      case 'succeeded': return 'info';
      default: return 'default';
    }
  };

  const formatMetrics = (metrics) => {
    if (!metrics) return '無數據';
    return `CPU: ${(metrics.cpu / 1000000).toFixed(2)}m | Memory: ${(metrics.memory / (1024 * 1024)).toFixed(2)}Mi`;
  };

  const handleImportConfig = (importedConfig) => {
    setConfigDialog({ 
      open: true, 
      pod: importedConfig 
    });
  };

  // 處理儲存配置更新
  const handleStorageConfigChange = async (newConfig) => {
    setStorageConfig(newConfig);
    
    if (config.name && config.version) {
      try {
        await podDeploymentService.saveStorageConfig(
          config.name,
          config.version,
          {
            storageClassYaml: generateStorageClassYaml(newConfig.storageClasses),
            persistentVolumeYaml: generatePersistentVolumeYaml(newConfig.persistentVolumes)
          }
        );
      } catch (error) {
        console.error('Failed to save storage config:', error);
        // 處理錯誤...
      }
    }
  };

  // Add function to fetch available templates
  const fetchTemplates = async () => {
    try {
      setTemplateLoading(true);
      const response = await axios.get('/api/deployment-templates/list-templates');
      setAvailableTemplates(response.data.templates);
    } catch (error) {
      console.error('Error fetching templates:', error);
      setError('Failed to fetch template list');
    } finally {
      setTemplateLoading(false);
    }
  };

  // Add function to handle template selection
  const handleTemplateToggle = (templateName) => {
    setSelectedTemplates(prev => {
      if (prev.includes(templateName)) {
        return prev.filter(name => name !== templateName);
      } else {
        return [...prev, templateName];
      }
    });
  };

  // Add function to download selected templates
  const handleTemplateDownload = async () => {
    try {
      setTemplateLoading(true);
      const response = await axios.post('/api/deployment-templates/download-templates', 
        { templates: selectedTemplates },
        { responseType: 'blob' }
      );
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'deployment-templates.zip');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      setTemplateDialog(false);
      setSelectedTemplates([]);
    } catch (error) {
      console.error('Error downloading templates:', error);
      setError('Failed to download templates');
    } finally {
      setTemplateLoading(false);
    }
  };

  // Add function to handle template upload
  const handleTemplateUpload = async (file) => {
    try {
      if (!file) {
        console.error('No file provided');
        setError('Please select a file to upload');
        return;
      }

      if (!file.name.toLowerCase().endsWith('.zip')) {
        console.error('Invalid file type:', file.type);
        setError('Only ZIP files are supported');
        return;
      }

      setUploadLoading(true);
      console.log('Uploading file:', file.name, 'Size:', file.size, 'Type:', file.type);
      
      const formData = new FormData();
      formData.append('file', file);

      // First check for existing templates
      console.log('Checking for existing templates...');
      const checkResponse = await axios.post('/api/deployment-templates/check-templates', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      console.log('Check response:', checkResponse.data);
      
      const { existingTemplates, allTemplates } = checkResponse.data;

      if (existingTemplates.length > 0) {
        setExistingTemplates(existingTemplates);
        setUploadFile(file);
        setConfirmOverwrite(true);
      } else {
        await uploadTemplates(file, false);
      }
    } catch (error) {
      console.error('Error uploading templates:', error);
      console.error('Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers
      });
      setError('Failed to upload templates: ' + (error.response?.data?.error || error.message));
    } finally {
      setUploadLoading(false);
    }
  };

  // Function to handle the actual upload
  const uploadTemplates = async (file, overwrite) => {
    try {
      if (!file) {
        console.error('No file provided');
        setError('Please select a file to upload');
        return;
      }

      setUploadLoading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('overwrite', overwrite);

      await axios.post('/api/deployment-templates/upload-templates', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setUploadDialog(false);
      setConfirmOverwrite(false);
      setUploadFile(null);
      // Refresh template list if it's open
      if (templateDialog) {
        await fetchTemplates();
      }
    } catch (error) {
      console.error('Error uploading templates:', error);
      console.error('Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers
      });
      setError('Failed to upload templates: ' + (error.response?.data?.error || error.message));
    } finally {
      setUploadLoading(false);
    }
  };

  return (
    <Box sx={{ width: '94vw', height: '100%', minWidth: '1182px' }}>
      {/* Show refresh indicator during background refresh */}
      {isRefreshing && (
        <Box sx={{ position: 'fixed', top: '1rem', right: '1rem' }}>
          <CircularProgress size={24} />
        </Box>
      )}
      
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <FormControl fullWidth>
            <InputLabel>{t('podDeployment:podDeployment.filter.namespace')}</InputLabel>
            <Select
              value={selectedNamespace}
              onChange={(e) => setSelectedNamespace(e.target.value)}
              label={t('podDeployment:podDeployment.filter.namespace')}
            >
              <MenuItem value="">
                {t('podDeployment:podDeployment.filter.allNamespaces')}
              </MenuItem>
              {Array.isArray(namespaces) && namespaces.map((namespace) => (
                <MenuItem key={namespace} value={namespace}>
                  {namespace}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={8}>
          <TextField
            fullWidth
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('podDeployment:podDeployment.filter.search')}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
              endAdornment: searchTerm && (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setSearchTerm('')}
                    edge="end"
                    size="small"
                  >
                    <ClearIcon />
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
        </Grid>
      </Grid>

      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setConfigDialog({ open: true, pod: null });
          }}
        >
          {t('podDeployment:podDeployment.createNew')}
        </Button>
        {/* <ImportConfig onImport={handleImportConfig} /> */}
        { <Button
          variant="contained"
          startIcon={<UploadIcon />}
          onClick={() => setUploadDialog(true)}
          sx={{ ml: 1 }}
        >
          {t('Upload Templates')}
        </Button> }
        <Button
          variant="contained"
          startIcon={<DownloadIcon />}
          onClick={() => {
            setTemplateDialog(true);
            fetchTemplates();
          }}
          sx={{ ml: 1 }}
        >
          {t('Download Templates')}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Show loading indicator only on initial load */}
      {loading && !isRefreshing ? (
        <Box display="flex" justifyContent="center" m={3}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>{t('podDeployment:podDeployment.table.name')}</TableCell>
                <TableCell>{t('podDeployment:podDeployment.table.namespace')}</TableCell>
                <TableCell>{t('podDeployment:podDeployment.table.status')}</TableCell>
                <TableCell>{t('podDeployment:podDeployment.table.ready')}</TableCell>
                <TableCell>{t('podDeployment:podDeployment.table.restarts')}</TableCell>
                <TableCell>{t('podDeployment:podDeployment.table.age')}</TableCell>
                <TableCell>{t('podDeployment:podDeployment.table.node')}</TableCell>
                {/* <TableCell>{t('podDeployment:podDeployment.table.ip')}</TableCell>
                <TableCell align="right">{t('podDeployment:podDeployment.table.actions')}</TableCell> */}
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredPods.map((pod) => (
                <TableRow key={`${pod.namespace}-${pod.name}`}>
                  <TableCell>{pod.name}</TableCell>
                  <TableCell>{pod.namespace}</TableCell>
                  <TableCell>
                    <Chip 
                      label={pod.status} 
                      color={getStatusColor(pod.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{`${pod.readyContainers}/${pod.totalContainers}`}</TableCell>
                  <TableCell>{pod.restarts}</TableCell>
                  <TableCell>{pod.age}</TableCell>
                  <TableCell>{pod.node}</TableCell>
                  <TableCell>{pod.ip}</TableCell>
                  {/* <TableCell>
                    <Tooltip title={t('podDeployment:podDeployment.actions.configure')}>
                      <IconButton onClick={() => setConfigDialog({ open: true, pod })}>
                        <SettingsIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={t('podDeployment:podDeployment.actions.preview')}>
                      <IconButton onClick={() => setPreviewDialog({ open: true, pod })}>
                        <PreviewIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={t('podDeployment:podDeployment.actions.progress')}>
                      <IconButton onClick={() => setProgressDialog({ open: true, pod })}>
                        <ProgressIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={t('podDeployment:podDeployment.actions.logs')}>
                      <IconButton onClick={() => setLogDialog({ open: true, pod })}>
                        <LogIcon />
                      </IconButton>
                    </Tooltip>
                    <ExportConfig config={pod} />
                    <Tooltip title={t('podDeployment:podDeployment.actions.delete')}>
                      <IconButton onClick={() => handleDelete(pod)}>
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell> */}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Dialogs */}
      <Dialog
        open={configDialog.open}
        onClose={() => {
          setConfigDialog({ open: false, pod: null });
        }}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            minHeight: '90vh',
            maxHeight: '90vh'
          }
        }}
      >
        <DialogContent sx={{ p: 3 }}>
          <StepperDeployment
            deployment={configDialog.pod}
            onSave={handleConfigSave}
            onDeploy={handleDeploy}
            onCancel={() => {
              setConfigDialog({ open: false, pod: null });
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={previewDialog.open}
        onClose={() => setPreviewDialog({ open: false, pod: null })}
        maxWidth="md"
        fullWidth
      >
        <DialogContent>
          <DeploymentPreview pod={previewDialog.pod} />
        </DialogContent>
      </Dialog>

      <Dialog
        open={progressDialog.open}
        onClose={() => setProgressDialog({ open: false, pod: null })}
        maxWidth="md"
        fullWidth
      >
        <DialogContent>
          <DeploymentProgress
            name={progressDialog.pod?.name}
            namespace={progressDialog.pod?.namespace}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={logDialog.open}
        onClose={() => setLogDialog({ open: false, pod: null })}
        maxWidth="lg"
        fullWidth
      >
        <DialogContent>
          <LogViewer
            podName={logDialog.pod?.name}
            namespace={logDialog.pod?.namespace}
          />
        </DialogContent>
      </Dialog>

      {/* Add Template Download Dialog */}
      <Dialog 
        open={templateDialog} 
        onClose={() => setTemplateDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t('Download Deployment Templates')}</DialogTitle>
        <DialogContent>
          {templateLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <List>
              {availableTemplates.map((template) => (
                <ListItem key={template} dense button onClick={() => handleTemplateToggle(template)}>
                  <ListItemIcon>
                    <Checkbox
                      edge="start"
                      checked={selectedTemplates.includes(template)}
                      tabIndex={-1}
                      disableRipple
                    />
                  </ListItemIcon>
                  <ListItemText primary={template} />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTemplateDialog(false)}>{t('Cancel')}</Button>
          <Button 
            onClick={handleTemplateDownload}
            disabled={selectedTemplates.length === 0 || templateLoading}
            variant="contained"
          >
            {t('Download')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Template Upload Dialog */}
      <Dialog 
        open={uploadDialog} 
        onClose={() => {
          setUploadDialog(false);
          setUploadFile(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t('Upload Deployment Templates')}</DialogTitle>
        <DialogContent>
          {uploadLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
              <input
                type="file"
                accept=".zip"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    console.log('File selected:', {
                      name: file.name,
                      type: file.type,
                      size: file.size
                    });
                    handleTemplateUpload(file);
                  }
                }}
                style={{ display: 'none' }}
                id="template-upload-input"
              />
              <label htmlFor="template-upload-input">
                <Button
                  variant="contained"
                  component="span"
                  startIcon={<UploadIcon />}
                >
                  {t('Select Template Zip File')}
                </Button>
              </label>
              <Typography variant="body2" color="textSecondary">
                {t('Only .zip files are supported')}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setUploadDialog(false);
            setUploadFile(null);
          }}>
            {t('Cancel')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Overwrite Confirmation Dialog */}
      <Dialog
        open={confirmOverwrite}
        onClose={() => {
          setConfirmOverwrite(false);
          setUploadFile(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t('Confirm Template Overwrite')}</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            {t('The following templates already exist:')}
          </Typography>
          <List>
            {existingTemplates.map((template) => (
              <ListItem key={template}>
                <ListItemText primary={template} />
              </ListItem>
            ))}
          </List>
          <Typography>
            {t('Do you want to overwrite these templates?')}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setConfirmOverwrite(false);
            setUploadFile(null);
          }}>
            {t('Cancel')}
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => {
              uploadTemplates(uploadFile, true);
              setConfirmOverwrite(false);
            }}
          >
            {t('Overwrite')}
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              uploadTemplates(uploadFile, false);
              setConfirmOverwrite(false);
            }}
          >
            {t('Skip Existing')}
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default PodDeploymentManagement; 