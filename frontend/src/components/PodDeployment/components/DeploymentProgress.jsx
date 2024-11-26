import React, { useState, useEffect, useRef } from 'react';
import { logger } from '../../../utils/logger'; // 導入 logger 
import {
  Box,
  Paper,
  Typography,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Collapse
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { useAppTranslation } from '../../../hooks/useAppTranslation';

const DeploymentProgress = ({ name, namespace }) => {
  const { t } = useAppTranslation();
  const [status, setStatus] = useState(null);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState(null);
  const wsRef = useRef(null);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const port = process.env.NODE_ENV === 'production' ? window.location.port : '3001';
    const wsUrl = `${protocol}//${host}:${port}/api/pod-deployments/${name}/progress?namespace=${namespace}`;

    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      switch (data.type) {
        case 'status':
          setStatus(data.data);
          break;
        case 'update':
          setEvents(prev => [...prev, data.data]);
          break;
        case 'error':
          setError(data.error);
          break;
      }
    };

    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      setError('Failed to connect to deployment progress stream');
    };

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [name, namespace]);

  const getStatusIcon = (condition) => {
    switch (condition?.type) {
      case 'Available':
        return <CheckCircleIcon color="success" />;
      case 'Progressing':
        return <InfoIcon color="info" />;
      case 'ReplicaFailure':
        return <ErrorIcon color="error" />;
      default:
        return <WarningIcon color="warning" />;
    }
  };

  const calculateProgress = () => {
    if (!status) return 0;
    const { replicas, availableReplicas = 0 } = status;
    return replicas ? (availableReplicas / replicas) * 100 : 0;
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {t('podDeployment:podDeployment.progress.title')}
      </Typography>

      {error && (
        <Typography color="error" gutterBottom>
          {error}
        </Typography>
      )}

      {status && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            {t('podDeployment:podDeployment.progress.status')}
          </Typography>
          <LinearProgress
            variant="determinate"
            value={calculateProgress()}
            sx={{ mb: 1 }}
          />
          <Typography>
            {t('podDeployment:podDeployment.progress.replicas', {
              available: status.availableReplicas || 0,
              total: status.replicas
            })}
          </Typography>

          <List>
            {status.conditions?.map((condition) => (
              <ListItem key={condition.type}>
                <ListItemIcon>
                  {getStatusIcon(condition)}
                </ListItemIcon>
                <ListItemText
                  primary={condition.type}
                  secondary={condition.message}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      <Typography variant="subtitle1" gutterBottom>
        {t('podDeployment:podDeployment.progress.events')}
      </Typography>
      <Paper sx={{ maxHeight: 300, overflow: 'auto' }}>
        <List>
          {events.map((event, index) => (
            <ListItem key={index}>
              <ListItemText
                primary={event.type}
                secondary={new Date(event.lastTimestamp).toLocaleString()}
              />
            </ListItem>
          ))}
        </List>
      </Paper>
    </Box>
  );
};

export default DeploymentProgress; 