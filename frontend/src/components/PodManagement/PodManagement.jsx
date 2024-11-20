import React, { useState, useEffect } from 'react';
import { logger } from '../../utils/logger.ts';  // 導入 logger
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Typography,
  Button,
  CircularProgress
} from '@mui/material';
import { useAppTranslation } from '../../hooks/useAppTranslation';
import { getApiUrl } from '../../utils/api';

const PodManagement = () => {
  const { t } = useAppTranslation();
  const [pods, setPods] = useState([]);
  const [selectedPods, setSelectedPods] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPods = async () => {
      try {
        setLoading(true);
        const response = await fetch(getApiUrl('api/pods'), {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        if (response.ok) {
          const data = await response.json();
          // Filter out any invalid pod data
          const validPods = data.filter(pod => pod && pod.name && pod.namespace);
          setPods(validPods);
        }
      } catch (error) {
        console.error('Error fetching pods:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPods();
    const interval = setInterval(fetchPods, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectAllClick = (event) => {
    if (event.target.checked) {
      const newSelected = pods.map(pod => pod.name);
      setSelectedPods(newSelected);
    } else {
      setSelectedPods([]);
    }
  };

  const handlePodSelect = (podName) => {
    setSelectedPods(prev => {
      if (prev.includes(podName)) {
        return prev.filter(name => name !== podName);
      } else {
        return [...prev, podName];
      }
    });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        {t('podManagement:pods.management.title')}
      </Typography>
      <TableContainer component={Paper} sx={{ maxHeight: 400, overflow: 'auto' }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox" sx={{ bgcolor: 'background.paper' }}>
                <Checkbox
                  indeterminate={selectedPods.length > 0 && selectedPods.length < pods.length}
                  checked={pods.length > 0 && selectedPods.length === pods.length}
                  onChange={handleSelectAllClick}
                />
              </TableCell>
              <TableCell sx={{ bgcolor: 'background.paper' }}>{t('podManagement:pods.table.name')}</TableCell>
              <TableCell sx={{ bgcolor: 'background.paper' }}>{t('podManagement:pods.table.namespace')}</TableCell>
              <TableCell sx={{ bgcolor: 'background.paper' }}>{t('podManagement:pods.table.status')}</TableCell>
              <TableCell align="right" sx={{ bgcolor: 'background.paper' }}>{t('podManagement:pods.table.restarts')}</TableCell>
              <TableCell align="right" sx={{ bgcolor: 'background.paper' }}>{t('podManagement:pods.table.age')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pods.map((pod) => (
              <TableRow 
                key={`${pod.namespace}-${pod.name}`}
                selected={selectedPods.includes(pod.name)}
                hover
                onClick={() => handlePodSelect(pod.name)}
                sx={{ cursor: 'pointer' }}
              >
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedPods.includes(pod.name)}
                    onChange={(e) => {
                      e.stopPropagation();
                      handlePodSelect(pod.name);
                    }}
                  />
                </TableCell>
                <TableCell>{pod.name}</TableCell>
                <TableCell>{pod.namespace}</TableCell>
                <TableCell>{pod.status}</TableCell>
                <TableCell align="right">{pod.restarts || 0}</TableCell>
                <TableCell align="right">{formatAge(pod.startTime)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {selectedPods.length > 0 && (
        <Button
          variant="contained"
          color="primary"
          sx={{ mt: 2 }}
          onClick={() => logger.info('Selected Pods:', selectedPods)}
        >
          {t('podManagement:actions.performAction')} ({selectedPods.length})
        </Button>
      )}
    </Box>
  );
};

// Helper function to format age
const formatAge = (startTime) => {
  if (!startTime) return '-';
  const start = new Date(startTime);
  const now = new Date();
  const diff = Math.floor((now - start) / 1000);

  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
};

export default PodManagement;
