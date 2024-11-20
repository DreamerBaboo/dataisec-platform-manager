import React, { useState, useEffect } from 'react';
import { logger } from '../../utils/logger'; // 導入 logger
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  CircularProgress,
  Box,
  Alert
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useAppTranslation } from '../../hooks/useAppTranslation';
import axios from 'axios';
import PodDeploymentManagement from './PodDeploymentManagement';

const DeploymentList = ({ onSelect, selectedDeployment }) => {
  const { t } = useAppTranslation();
  const [deployments, setDeployments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDeployments = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/pod-deployments', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setDeployments(response.data.items || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeployments();
  }, []);

  const handleDelete = async (name, namespace) => {
    try {
      await axios.delete(`/api/pod-deployments/${name}?namespace=${namespace}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchDeployments();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" m={3}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Paper>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t('podDeployment:podDeployment.table.name')}</TableCell>
              <TableCell>{t('podDeployment:podDeployment.table.namespace')}</TableCell>
              <TableCell>{t('podDeployment:podDeployment.table.replicas')}</TableCell>
              <TableCell>{t('podDeployment:podDeployment.table.status')}</TableCell>
              <TableCell>{t('podDeployment:podDeployment.table.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {deployments.map((deployment) => (
              <TableRow 
                key={`${deployment.metadata.namespace}-${deployment.metadata.name}`}
                selected={selectedDeployment?.metadata.name === deployment.metadata.name}
              >
                <TableCell>{deployment.metadata.name}</TableCell>
                <TableCell>{deployment.metadata.namespace}</TableCell>
                <TableCell>
                  {deployment.spec.replicas} / {deployment.status.replicas}
                </TableCell>
                <TableCell>{deployment.status.conditions?.[0]?.type}</TableCell>
                <TableCell>
                  <Tooltip title={t('podDeployment:podDeployment.actions.edit')}>
                    <IconButton onClick={() => onSelect(deployment)}>
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t('podDeployment:podDeployment.actions.delete')}>
                    <IconButton 
                      onClick={() => handleDelete(
                        deployment.metadata.name,
                        deployment.metadata.namespace
                      )}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default DeploymentList; 