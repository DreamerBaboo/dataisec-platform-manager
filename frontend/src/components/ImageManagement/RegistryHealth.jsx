import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Paper
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { imageService } from '../../services/imageService';

const RegistryHealth = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const checkHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await imageService.checkRegistryHealth();
      setStatus(response.data);
    } catch (error) {
      console.error('Failed to check registry health:', error);
      setError('無法連接到 Registry');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Registry 狀態
        </Typography>
        <Button
          startIcon={<RefreshIcon />}
          onClick={checkHealth}
          disabled={loading}
        >
          刷新
        </Button>
      </Box>

      {loading ? (
        <CircularProgress />
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : (
        <Box>
          <Alert 
            severity={status?.healthy ? "success" : "warning"}
            sx={{ mb: 2 }}
          >
            {status?.healthy ? 'Registry 運行正常' : 'Registry 可能存在問題'}
          </Alert>
          
          <Typography variant="body2" color="text.secondary">
            版本: {status?.version}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            上線時間: {status?.uptime}
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default RegistryHealth; 