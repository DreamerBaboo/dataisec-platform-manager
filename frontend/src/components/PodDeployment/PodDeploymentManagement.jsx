import React, { useState, useEffect } from 'react';
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
  Paper
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Visibility as PreviewIcon,
  Timeline as ProgressIcon,
  Article as LogIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Clear as ClearIcon
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

axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
axios.defaults.headers.common['Content-Type'] = 'application/json';

const PodDeploymentManagement = () => {
  const { t } = useAppTranslation();
  const [namespaces, setNamespaces] = useState([]);
  const [selectedNamespace, setSelectedNamespace] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [pods, setPods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Dialog states
  const [configDialog, setConfigDialog] = useState({ open: false, pod: null });
  const [previewDialog, setPreviewDialog] = useState({ open: false, pod: null });
  const [progressDialog, setProgressDialog] = useState({ open: false, pod: null });
  const [logDialog, setLogDialog] = useState({ open: false, pod: null });
  const [createDialog, setCreateDialog] = useState(false);

  // Add new state for stepper
  const [deploymentConfig, setDeploymentConfig] = useState(null);

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
      console.log('🔍 Fetching pods for namespace:', selectedNamespace || 'all namespaces');
      setLoading(true);
      const response = await axios.get(`/api/pods${selectedNamespace ? `?namespace=${selectedNamespace}` : ''}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      console.log('✅ Pods fetched:', response.data);
      setPods(response.data);
      setError(null);
    } catch (err) {
      console.error('❌ Error fetching pods:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('🚀 Component mounted');
    fetchNamespaces();
  }, []);

  useEffect(() => {
    console.log('📌 Selected namespace changed:', selectedNamespace);
    fetchPods();
  }, [selectedNamespace]);

  const handleRefresh = () => {
    console.log('🔄 Manually refreshing pods...');
    fetchPods();
  };

  const handleDelete = async (pod) => {
    try {
      console.log('🗑️ Deleting pod:', pod);
      await axios.delete(`/api/pods/${pod.name}?namespace=${pod.namespace}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      console.log('✅ Pod deleted successfully');
      fetchPods();
    } catch (err) {
      console.error('❌ Error deleting pod:', err);
      setError(err.message);
    }
  };

  // Modify handleConfigSave to use new config format
  const handleConfigSave = async (config) => {
    try {
      console.log('💾 Saving pod configuration:', config);
      if (configDialog.pod) {
        await axios.put(`/api/pod-deployments/${configDialog.pod.name}`, config, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
      } else {
        await axios.post('/api/pod-deployments', config, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
      }
      console.log('✅ Configuration saved successfully');
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
    console.log('🔍 Filtering pods:', { pods, searchTerm, selectedNamespace });
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

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" m={3}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
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
        <ImportConfig onImport={handleImportConfig} />
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading ? (
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
                <TableCell>{t('podDeployment:podDeployment.table.ip')}</TableCell>
                <TableCell align="right">{t('podDeployment:podDeployment.table.actions')}</TableCell>
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
                  <TableCell>
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
                  </TableCell>
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
    </Box>
  );
};

export default PodDeploymentManagement; 