import React, { useState } from 'react';
import { TextField, Button, Box, Typography, MenuItem } from '@mui/material';
import axios from 'axios';
import { getApiUrl } from '../../utils/api';
import { logger } from '../../utils/logger.ts';  // 導入 logger

const PodForm = ({ onSubmit }) => {
  const [podConfig, setPodConfig] = useState({
    name: '',
    image: '',
    replicas: 1,
    namespace: 'default',
    cpuRequest: '100m',
    cpuLimit: '200m',
    memoryRequest: '128Mi',
    memoryLimit: '256Mi',
    affinity: '',
    imageTag: '',
  });

  const handleChange = (e) => {
    setPodConfig({ ...podConfig, [e.target.name]: e.target.value });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/x-tar') {
      // 假設有一個 API 來處理文件上傳
      const formData = new FormData();
      formData.append('image', file);

      try {
        const response = await axios.post(getApiUrl('images/upload'), formData, {
          headers: { 
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'multipart/form-data'
          }
        });
        setPodConfig({ ...podConfig, imageTag: response.data.tag });
      } catch (error) {
        console.error('上傳鏡像失敗:', error);
      }
    } else {
      console.error('請上傳 tar 格式的文件');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(getApiUrl('pods/create'), podConfig, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      onSubmit();
      // 重置表單
      setPodConfig({
        name: '',
        image: '',
        replicas: 1,
        namespace: 'default',
        cpuRequest: '100m',
        cpuLimit: '200m',
        memoryRequest: '128Mi',
        memoryLimit: '256Mi',
        affinity: '',
        imageTag: '',
      });
    } catch (error) {
      console.error('創建 Pod 失敗:', error);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ maxWidth: 400 }}>
      <Typography variant="h6" gutterBottom>
        創建新 Pod
      </Typography>
      <TextField
        fullWidth
        label="Pod 名稱"
        name="name"
        value={podConfig.name}
        onChange={handleChange}
        margin="normal"
        required
      />
      <TextField
        fullWidth
        label="鏡像"
        name="image"
        value={podConfig.image}
        onChange={handleChange}
        margin="normal"
        required
      />
      <TextField
        fullWidth
        label="副本數"
        name="replicas"
        type="number"
        value={podConfig.replicas}
        onChange={handleChange}
        margin="normal"
        required
      />
      <TextField
        fullWidth
        select
        label="命名空間"
        name="namespace"
        value={podConfig.namespace}
        onChange={handleChange}
        margin="normal"
      >
        <MenuItem value="default">default</MenuItem>
        <MenuItem value="kube-system">kube-system</MenuItem>
      </TextField>
      <TextField
        fullWidth
        label="CPU 請求"
        name="cpuRequest"
        value={podConfig.cpuRequest}
        onChange={handleChange}
        margin="normal"
        helperText="例如: 100m, 0.1"
      />
      <TextField
        fullWidth
        label="CPU 限制"
        name="cpuLimit"
        value={podConfig.cpuLimit}
        onChange={handleChange}
        margin="normal"
        helperText="例如: 200m, 0.2"
      />
      <TextField
        fullWidth
        label="內存請求"
        name="memoryRequest"
        value={podConfig.memoryRequest}
        onChange={handleChange}
        margin="normal"
        helperText="例如: 128Mi, 1Gi"
      />
      <TextField
        fullWidth
        label="內存限制"
        name="memoryLimit"
        value={podConfig.memoryLimit}
        onChange={handleChange}
        margin="normal"
        helperText="例如: 256Mi, 2Gi"
      />
      <TextField
        fullWidth
        label="親和性條件"
        name="affinity"
        value={podConfig.affinity}
        onChange={handleChange}
        margin="normal"
        helperText="K8s 親和性條件"
      />
      <Button
        variant="contained"
        component="label"
        sx={{ mt: 2 }}
      >
        上傳鏡像
        <input
          type="file"
          hidden
          accept=".tar"
          onChange={handleFileUpload}
        />
      </Button>
      {podConfig.imageTag && (
        <Typography variant="body2" sx={{ mt: 1 }}>
          鏡像標籤: {podConfig.imageTag}
        </Typography>
      )}
      <Button type="submit" variant="contained" color="primary" sx={{ mt: 2 }}>
        創建 Pod
      </Button>
    </Box>
  );
};

export default PodForm;
