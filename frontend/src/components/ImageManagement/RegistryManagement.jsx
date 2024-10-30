import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress
} from '@mui/material';
import { imageService } from '../../services/imageService';

const RegistryManagement = () => {
  const [config, setConfig] = useState({
    url: '',
    port: '',
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await imageService.getRegistryConfig();
      setConfig(response.data);
    } catch (error) {
      console.error('Failed to fetch registry config:', error);
      setError('獲取配置失敗');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      await imageService.updateRegistryConfig(config);
      setStatus('配置已更新');
    } catch (error) {
      console.error('Failed to update registry config:', error);
      setError('更新配置失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setConfig({
      ...config,
      [e.target.name]: e.target.value
    });
  };

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', mt: 3 }}>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Registry 配置
          </Typography>
          
          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Registry URL"
              name="url"
              value={config.url}
              onChange={handleChange}
              margin="normal"
              required
            />
            
            <TextField
              fullWidth
              label="Port"
              name="port"
              value={config.port}
              onChange={handleChange}
              margin="normal"
              required
              type="number"
            />
            
            <TextField
              fullWidth
              label="Username"
              name="username"
              value={config.username}
              onChange={handleChange}
              margin="normal"
            />
            
            <TextField
              fullWidth
              label="Password"
              name="password"
              value={config.password}
              onChange={handleChange}
              margin="normal"
              type="password"
            />

            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}

            {status && (
              <Alert severity="success" sx={{ mt: 2 }}>
                {status}
              </Alert>
            )}

            <Button
              type="submit"
              variant="contained"
              sx={{ mt: 3 }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : '保存配置'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};

export default RegistryManagement; 