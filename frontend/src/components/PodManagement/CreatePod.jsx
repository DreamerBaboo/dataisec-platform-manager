import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Alert
} from '@mui/material';
import { useTranslation } from 'react-i18next';

const CreatePod = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    namespace: 'default',
    type: 'deployment',
    image: '',
    replicas: 1,
    cpu: '100m',
    memory: '128Mi',
  });
  const [error, setError] = useState('');

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
      const response = await fetch('http://localhost:3001/api/pods', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Failed to create pod');
      }

      navigate('/pods');
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', mt: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h5" gutterBottom>
          {t('createPod')}
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                name="name"
                label={t('podName')}
                value={formData.name}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>{t('namespace')}</InputLabel>
                <Select
                  name="namespace"
                  value={formData.namespace}
                  label={t('namespace')}
                  onChange={handleChange}
                >
                  <MenuItem value="default">default</MenuItem>
                  <MenuItem value="kube-system">kube-system</MenuItem>
                  <MenuItem value="monitoring">monitoring</MenuItem>
                  <MenuItem value="database">database</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>{t('podType')}</InputLabel>
                <Select
                  name="type"
                  value={formData.type}
                  label={t('podType')}
                  onChange={handleChange}
                >
                  <MenuItem value="deployment">{t('deployment')}</MenuItem>
                  <MenuItem value="statefulset">{t('statefulSet')}</MenuItem>
                  <MenuItem value="daemonset">{t('daemonSet')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                name="image"
                label={t('containerImage')}
                value={formData.image}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                required
                fullWidth
                type="number"
                name="replicas"
                label={t('replicas')}
                value={formData.replicas}
                onChange={handleChange}
                inputProps={{ min: 1 }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                required
                fullWidth
                name="cpu"
                label={t('cpuLimit')}
                value={formData.cpu}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                required
                fullWidth
                name="memory"
                label={t('memoryLimit')}
                value={formData.memory}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button 
                  variant="outlined" 
                  onClick={() => navigate('/pods')}
                >
                  {t('cancel')}
                </Button>
                <Button 
                  type="submit" 
                  variant="contained" 
                  color="primary"
                >
                  {t('create')}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Box>
  );
};

export default CreatePod;
