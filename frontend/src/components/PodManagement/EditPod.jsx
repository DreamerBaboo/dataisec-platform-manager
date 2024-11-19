import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { 
  Box, 
  Paper, 
  Typography, 
  TextField, 
  Button, 
  Grid, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem,
  Alert,
  CircularProgress
} from '@mui/material';
import { useAppTranslation } from '../../hooks/useAppTranslation';
import { api } from '../../utils/api';

const EditPod = () => {
  const { t } = useAppTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    namespace: '',
    type: '',
    image: '',
    replicas: 1,
    cpuRequest: '',
    cpuLimit: '',
    memoryRequest: '',
    memoryLimit: '',
    affinity: '',
  });

  useEffect(() => {
    if (location.state?.pod) {
      const pod = location.state.pod;
      setFormData({
        name: pod.metadata.name,
        namespace: pod.metadata.namespace,
        type: pod.type,
        image: pod.image || '',
        replicas: pod.replicas || 1,
        cpuRequest: pod.cpuRequest || '100m',
        cpuLimit: pod.cpuLimit || '200m',
        memoryRequest: pod.memoryRequest || '128Mi',
        memoryLimit: pod.memoryLimit || '256Mi',
        affinity: pod.affinity || '',
      });
      setLoading(false);
    } else {
      fetchPodData();
    }
  }, [id, location.state]);

  const fetchPodData = async () => {
    try {
      const pod = await api.get(`pods/${id}`);
      setFormData({
        name: pod.metadata.name,
        namespace: pod.metadata.namespace,
        type: pod.type,
        image: pod.image || '',
        replicas: pod.replicas || 1,
        cpuRequest: pod.cpuRequest || '100m',
        cpuLimit: pod.cpuLimit || '200m',
        memoryRequest: pod.memoryRequest || '128Mi',
        memoryLimit: pod.memoryLimit || '256Mi',
        affinity: pod.affinity || '',
      });
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`pods/${id}`, formData);
      navigate('/pods');
    } catch (error) {
      setError(error.message);
    }
  };

  // 定義所有可用的命名空間
  const availableNamespaces = [
    'default',
    'kube-system',
    'monitoring',
    'database',
    'opensearch',  // 添加新的命名空間
    'kafka',       // 添加新的命名空間
    'decoder'      // 添加新的命名空間
  ];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', mt: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h5" gutterBottom>
          {t('podManagement:edit.title')}
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <form onSubmit={handleSubmit}>
          <Grid2 container spacing={3}>
            <Grid2 item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                name="name"
                label={t('podManagement:form.name')}
                value={formData.name}
                onChange={handleChange}
                disabled
              />
            </Grid2>
            <Grid2 item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>{t('podManagement:form.namespace')}</InputLabel>
                <Select
                  name="namespace"
                  value={formData.namespace}
                  label={t('podManagement:form.namespace')}
                  onChange={handleChange}
                  disabled
                >
                  {availableNamespaces.map(namespace => (
                    <MenuItem key={namespace} value={namespace}>
                      {namespace}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid2>
            <Grid2 item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>{t('podManagement:form.type')}</InputLabel>
                <Select
                  name="type"
                  value={formData.type}
                  label={t('podManagement:form.type')}
                  onChange={handleChange}
                  disabled
                >
                  <MenuItem value="deployment">{t('podManagement:form.deployment')}</MenuItem>
                  <MenuItem value="statefulset">{t('podManagement:form.statefulSet')}</MenuItem>
                  <MenuItem value="daemonset">{t('podManagement:form.daemonSet')}</MenuItem>
                </Select>
              </FormControl>
            </Grid2>
            <Grid2 item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                name="image"
                label={t('podManagement:form.image')}
                value={formData.image}
                onChange={handleChange}
                disabled
              />
            </Grid2>
            <Grid2 item xs={12} sm={4}>
              <TextField
                required
                fullWidth
                type="number"
                name="replicas"
                label={t('podManagement:form.replicas')}
                value={formData.replicas}
                onChange={handleChange}
                inputProps={{ min: 1 }}
              />
            </Grid2>
            <Grid2 item xs={12} sm={4}>
              <TextField
                required
                fullWidth
                name="cpuRequest"
                label={t('podManagement:form.cpuRequest')}
                value={formData.cpuRequest}
                onChange={handleChange}
              />
            </Grid2>
            <Grid2 item xs={12} sm={4}>
              <TextField
                required
                fullWidth
                name="cpuLimit"
                label={t('podManagement:form.cpuLimit')}
                value={formData.cpuLimit}
                onChange={handleChange}
              />
            </Grid2>
            <Grid2 item xs={12} sm={4}>
              <TextField
                required
                fullWidth
                name="memoryRequest"
                label={t('podManagement:form.memoryRequest')}
                value={formData.memoryRequest}
                onChange={handleChange}
              />
            </Grid2>
            <Grid2 item xs={12} sm={4}>
              <TextField
                required
                fullWidth
                name="memoryLimit"
                label={t('podManagement:form.memoryLimit')}
                value={formData.memoryLimit}
                onChange={handleChange}
              />
            </Grid2>
            <Grid2 item xs={12}>
              <TextField
                fullWidth
                name="affinity"
                label={t('podManagement:form.affinity')}
                value={formData.affinity}
                onChange={handleChange}
                helperText="K8s 親和性條件"
              />
            </Grid2>
            <Grid2 item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button 
                  variant="outlined" 
                  onClick={() => navigate('/pods')}
                >
                  {t('common:common.cancel')}
                </Button>
                <Button 
                  type="submit" 
                  variant="contained" 
                  color="primary"
                >
                  {t('common:common.save')}
                </Button>
              </Box>
            </Grid2>
          </Grid2>
        </form>
      </Paper>
    </Box>
  );
};

export default EditPod;
