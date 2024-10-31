import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  CircularProgress,
  Alert,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress
} from '@mui/material';
import { useTranslation } from 'react-i18next';

const ImageInstall = ({ open, onClose, image, onSuccess }) => {
  const { t } = useTranslation();
  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [logs, setLogs] = useState([]);
  const [config, setConfig] = useState({
    registry: '',
    tag: '',
    pullPolicy: 'IfNotPresent'
  });

  useEffect(() => {
    if (open && image) {
      setConfig(prev => ({
        ...prev,
        registry: image.name.includes('/') ? image.name.split('/')[0] : 'docker.io',
        tag: image.tag
      }));
    }
  }, [open, image]);

  const handleInstall = async () => {
    if (!image) return;

    setInstalling(true);
    setError(null);
    setProgress(0);

    try {
      // 模擬安裝進度
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            return 100;
          }
          return prev + 10;
        });
      }, 500);

      // 實際的安裝請求
      const response = await fetch(`/api/images/${image.id}/install`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });

      if (!response.ok) throw new Error('Installation failed');

      const data = await response.json();
      clearInterval(progressInterval);
      setProgress(100);
      
      // 添加安裝日誌
      setLogs(prev => [...prev, {
        timestamp: new Date().toISOString(),
        message: data.details || 'Installation completed successfully'
      }]);

      onSuccess?.();
      setTimeout(() => {
        handleClose();
      }, 1000);
    } catch (err) {
      setError(err.message);
      setProgress(0);
    } finally {
      setInstalling(false);
    }
  };

  const handleClose = () => {
    if (!installing) {
      setError(null);
      setProgress(0);
      setLogs([]);
      onClose();
    }
  };

  const handleConfigChange = (event) => {
    const { name, value } = event.target;
    setConfig(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (!image) return null;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {t('installImage')}
      </DialogTitle>
      <DialogContent>
        {error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body1" gutterBottom>
              {t('installConfirmation', { name: image.name, tag: image.tag })}
            </Typography>

            <FormControl fullWidth margin="normal">
              <TextField
                name="registry"
                label={t('registry')}
                value={config.registry}
                onChange={handleConfigChange}
                disabled={installing}
              />
            </FormControl>

            <FormControl fullWidth margin="normal">
              <TextField
                name="tag"
                label={t('tag')}
                value={config.tag}
                onChange={handleConfigChange}
                disabled={installing}
              />
            </FormControl>

            <FormControl fullWidth margin="normal">
              <InputLabel>{t('pullPolicy')}</InputLabel>
              <Select
                name="pullPolicy"
                value={config.pullPolicy}
                onChange={handleConfigChange}
                disabled={installing}
              >
                <MenuItem value="Always">{t('always')}</MenuItem>
                <MenuItem value="IfNotPresent">{t('ifNotPresent')}</MenuItem>
                <MenuItem value="Never">{t('never')}</MenuItem>
              </Select>
            </FormControl>

            {installing && (
              <Box sx={{ mt: 2 }}>
                <LinearProgress variant="determinate" value={progress} />
                <Typography variant="body2" color="textSecondary" align="center" sx={{ mt: 1 }}>
                  {progress}%
                </Typography>
              </Box>
            )}

            {logs.length > 0 && (
              <Box sx={{ mt: 2, maxHeight: 200, overflow: 'auto' }}>
                <Typography variant="subtitle2" gutterBottom>
                  {t('installationLogs')}
                </Typography>
                {logs.map((log, index) => (
                  <Typography key={index} variant="body2" color="textSecondary">
                    [{new Date(log.timestamp).toLocaleTimeString()}] {log.message}
                  </Typography>
                ))}
              </Box>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={installing}>
          {t('cancel')}
        </Button>
        <Button
          onClick={handleInstall}
          variant="contained"
          color="primary"
          disabled={installing}
          startIcon={installing && <CircularProgress size={20} />}
        >
          {installing ? t('installing') : t('install')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ImageInstall; 