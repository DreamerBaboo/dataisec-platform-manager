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
  Alert,
  IconButton,
  Tooltip
} from '@mui/material';
import { useAppTranslation } from '../../hooks/useAppTranslation';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

const CreatePod = () => {
  const { t } = useAppTranslation();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    namespace: 'default',
    type: 'deployment',
    image: '',
    imageTag: '',
    replicas: 1,
    cpuRequest: '100m',
    cpuLimit: '200m',
    memoryRequest: '128Mi',
    memoryLimit: '256Mi',
    affinity: {
      nodeAffinity: '',
      podAffinity: '',
      podAntiAffinity: ''
    }
  });
  const [error, setError] = useState('');
  const [uploadedImage, setUploadedImage] = useState(null);

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

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('affinity.')) {
      const affinityType = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        affinity: {
          ...prev.affinity,
          [affinityType]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.tar')) {
      setError('只支持 .tar 格式的文件');
      return;
    }

    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch('http://localhost:3001/api/pods/upload-image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('上傳失敗');
      }

      const data = await response.json();
      setUploadedImage(file.name);
      setFormData(prev => ({
        ...prev,
        imageTag: data.tag
      }));
    } catch (error) {
      setError('上傳文件失敗: ' + error.message);
    }
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
          {t('podManagement:create.title')}
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <form onSubmit={handleSubmit}>
          <Grid2 container spacing={3}>
            {/* 基本信息 */}
            <Grid2 item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                name="name"
                label={t('podManagement:form.name')}
                value={formData.name}
                onChange={handleChange}
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
                >
                  {availableNamespaces.map(namespace => (
                    <MenuItem key={namespace} value={namespace}>
                      {namespace}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid2>

            {/* Pod 類型和副本數 */}
            <Grid2 item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>{t('podManagement:form.type')}</InputLabel>
                <Select
                  name="type"
                  value={formData.type}
                  label={t('podManagement:form.type')}
                  onChange={handleChange}
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
                type="number"
                name="replicas"
                label={t('podManagement:form.replicas')}
                value={formData.replicas}
                onChange={handleChange}
                inputProps={{ min: 1 }}
              />
            </Grid2>

            {/* 鏡像上傳和標籤 */}
            <Grid2 item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <Button
                  variant="contained"
                  component="label"
                  startIcon={<CloudUploadIcon />}
                >
                  {t('podManagement:form.uploadImage')}
                  <input
                    type="file"
                    hidden
                    accept=".tar"
                    onChange={handleImageUpload}
                  />
                </Button>
                {uploadedImage && (
                  <Typography variant="body2">
                    {uploadedImage}
                  </Typography>
                )}
              </Box>
              {formData.imageTag && (
                <TextField
                  fullWidth
                  margin="normal"
                  label={t('podManagement:form.imageTag')}
                  value={formData.imageTag}
                  disabled
                />
              )}
            </Grid2>

            {/* 資源請求和限制 */}
            <Grid2 item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                name="cpuRequest"
                label={t('podManagement:form.cpuRequest')}
                value={formData.cpuRequest}
                onChange={handleChange}
                helperText={t('podManagement:form.cpuRequestHelp')}
              />
            </Grid2>
            <Grid2 item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                name="cpuLimit"
                label={t('podManagement:form.cpuLimit')}
                value={formData.cpuLimit}
                onChange={handleChange}
                helperText={t('podManagement:form.cpuLimitHelp')}
              />
            </Grid2>
            <Grid2 item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                name="memoryRequest"
                label={t('podManagement:form.memoryRequest')}
                value={formData.memoryRequest}
                onChange={handleChange}
                helperText={t('podManagement:form.memoryRequestHelp')}
              />
            </Grid2>
            <Grid2 item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                name="memoryLimit"
                label={t('podManagement:form.memoryLimit')}
                value={formData.memoryLimit}
                onChange={handleChange}
                helperText={t('podManagement:form.memoryLimitHelp')}
              />
            </Grid2>

            {/* 親和性設置 - 更新後的版本 */}
            <Grid2 item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                {t('podManagement:form.affinitySettings')}
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                name="affinity.nodeAffinity"
                label={t('podManagement:form.nodeAffinity')}
                value={formData.affinity.nodeAffinity}
                onChange={handleChange}
                helperText={t('podManagement:form.nodeAffinityHelp')}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                multiline
                rows={3}
                name="affinity.podAffinity"
                label={t('podManagement:form.podAffinity')}
                value={formData.affinity.podAffinity}
                onChange={handleChange}
                helperText={t('podManagement:form.podAffinityHelp')}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                multiline
                rows={3}
                name="affinity.podAntiAffinity"
                label={t('podManagement:form.podAntiAffinity')}
                value={formData.affinity.podAntiAffinity}
                onChange={handleChange}
                helperText={t('podManagement:form.podAntiAffinityHelp')}
              />
            </Grid2>

            {/* 按鈕部分 */}
            <Grid2 item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button 
                  variant="outlined" 
                  onClick={() => navigate('/pods')}
                >
                  {t('podManagement:form.cancel')}
                </Button>
                <Button 
                  type="submit" 
                  variant="contained" 
                  color="primary"
                >
                  {t('podManagement:form.create')}
                </Button>
              </Box>
            </Grid2>
          </Grid2>
        </form>
      </Paper>
    </Box>
  );
};

export default CreatePod;
