import React, { useState } from 'react';
import { TextField, Button, Box, Typography, MenuItem } from '@mui/material';
import axios from 'axios';

const PodForm = ({ onSubmit }) => {
  const [podConfig, setPodConfig] = useState({
    name: '',
    image: '',
    replicas: 1,
    namespace: 'default',
    cpu: '100m',
    memory: '128Mi',
  });

  const handleChange = (e) => {
    setPodConfig({ ...podConfig, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:3001/pods', podConfig, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      onSubmit();
      // 重置表單
      setPodConfig({
        name: '',
        image: '',
        replicas: 1,
        namespace: 'default',
        cpu: '100m',
        memory: '128Mi',
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
        name="cpu"
        value={podConfig.cpu}
        onChange={handleChange}
        margin="normal"
        helperText="例如: 100m, 0.1"
      />
      <TextField
        fullWidth
        label="內存請求"
        name="memory"
        value={podConfig.memory}
        onChange={handleChange}
        margin="normal"
        helperText="例如: 128Mi, 1Gi"
      />
      <Button type="submit" variant="contained" color="primary" sx={{ mt: 2 }}>
        創建 Pod
      </Button>
    </Box>
  );
};

export default PodForm;
