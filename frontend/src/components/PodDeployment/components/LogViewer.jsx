import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  FormControl,
  Select,
  MenuItem,
  IconButton,
  TextField,
  Button,
  Stack
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  GetApp as DownloadIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import { useAppTranslation } from '../../../hooks/useAppTranslation';
import axios from 'axios';

const LogViewer = ({ podName, namespace }) => {
  const { t } = useAppTranslation();
  const [containers, setContainers] = useState([]);
  const [selectedContainer, setSelectedContainer] = useState('');
  const [logs, setLogs] = useState('');
  const [tailLines, setTailLines] = useState(100);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [error, setError] = useState(null);
  const logRef = useRef(null);
  const refreshInterval = useRef(null);

  useEffect(() => {
    fetchContainers();
    return () => {
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
      }
    };
  }, [podName, namespace]);

  useEffect(() => {
    if (selectedContainer) {
      fetchLogs();
      if (autoRefresh) {
        refreshInterval.current = setInterval(fetchLogs, 5000);
      }
    }
    return () => {
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
      }
    };
  }, [selectedContainer, tailLines, autoRefresh]);

  const fetchContainers = async () => {
    try {
      const response = await axios.get(
        `/api/pod-deployments/${podName}/containers?namespace=${namespace}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );
      setContainers(response.data.containers);
      if (response.data.containers.length > 0) {
        setSelectedContainer(response.data.containers[0]);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchLogs = async () => {
    try {
      const response = await axios.get('/api/pod-deployments/logs', {
        params: {
          name: podName,
          namespace,
          container: selectedContainer,
          tailLines
        },
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setLogs(response.data.logs);
      if (logRef.current) {
        logRef.current.scrollTop = logRef.current.scrollHeight;
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([logs], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${podName}-${selectedContainer}-logs.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    setLogs('');
  };

  return (
    <Box>
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <FormControl sx={{ minWidth: 200 }}>
          <Select
            value={selectedContainer}
            onChange={(e) => setSelectedContainer(e.target.value)}
            displayEmpty
          >
            {containers.map((container) => (
              <MenuItem key={container} value={container}>
                {container}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          type="number"
          label={t('podDeployment:podDeployment.logs.tailLines')}
          value={tailLines}
          onChange={(e) => setTailLines(e.target.value)}
          sx={{ width: 120 }}
        />
        <Button
          variant="outlined"
          onClick={() => setAutoRefresh(!autoRefresh)}
          color={autoRefresh ? 'primary' : 'inherit'}
        >
          {autoRefresh ? t('podDeployment:podDeployment.logs.stopRefresh') : t('podDeployment:podDeployment.logs.autoRefresh')}
        </Button>
        <IconButton onClick={fetchLogs}>
          <RefreshIcon />
        </IconButton>
        <IconButton onClick={handleDownload}>
          <DownloadIcon />
        </IconButton>
        <IconButton onClick={handleClear}>
          <ClearIcon />
        </IconButton>
      </Stack>

      <Paper
        ref={logRef}
        sx={{
          p: 2,
          height: 400,
          overflow: 'auto',
          backgroundColor: 'black',
          color: 'lightgreen',
          fontFamily: 'monospace',
          fontSize: '0.9rem',
          whiteSpace: 'pre-wrap'
        }}
      >
        {logs || t('podDeployment:podDeployment.logs.noLogs')}
      </Paper>
    </Box>
  );
};

export default LogViewer; 