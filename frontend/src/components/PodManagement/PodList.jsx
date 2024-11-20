import React, { useState, useEffect } from 'react';
import { logger } from '../../utils/logger'; // 導入 loggers
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Collapse,
  IconButton,
  Typography,
  Chip,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid2,
  TextField,
  InputAdornment,
  Autocomplete,
  CircularProgress
} from '@mui/material';
import {
  KeyboardArrowDown as KeyboardArrowDownIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon
} from '@mui/icons-material';
import { useAppTranslation } from '../../hooks/useAppTranslation';
import { api } from '../../utils/api';

// 命名空間行組件
const NamespaceRow = ({ namespace, pods, onToggle, isOpen }) => {
  const { t } = useAppTranslation();
  
  // 計算命名空間的摘要信息
  const summary = {
    total: pods.length,
    running: pods.filter(pod => pod.status === 'Running').length,
    pending: pods.filter(pod => pod.status === 'Pending').length,
    failed: pods.filter(pod => pod.status === 'Failed').length
  };

  return (
    <>
      <TableRow 
        sx={{ 
          '& > *': { borderBottom: 'unset' },
          bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.800' : 'grey.100',
          cursor: 'pointer',
          '&:hover': {
            bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.700' : 'grey.200'
          }
        }}
        onClick={onToggle}
      >
        <TableCell padding="checkbox">
          <IconButton size="small">
            {isOpen ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell component="th" scope="row">
          <Typography variant="subtitle1" fontWeight="medium">
            {namespace}
          </Typography>
        </TableCell>
        <TableCell align="right">
          <Chip 
            label={`${t('podManagement:podList.total')}: ${summary.total}`}
            size="small"
            sx={{ mr: 1 }}
          />
          <Chip 
            label={`${t('podManagement:podList.running')}: ${summary.running}`}
            size="small"
            color="success"
            sx={{ mr: 1 }}
          />
          {summary.pending > 0 && (
            <Chip 
              label={`${t('podManagement:podList.pending')}: ${summary.pending}`}
              size="small"
              color="warning"
              sx={{ mr: 1 }}
            />
          )}
          {summary.failed > 0 && (
            <Chip 
              label={`${t('podManagement:podList.failed')}: ${summary.failed}`}
              size="small"
              color="error"
            />
          )}
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
          <Collapse in={isOpen} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 1 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('podName')}</TableCell>
                    <TableCell align="right">{t('podManagement:podList.status')}</TableCell>
                    <TableCell align="right">{t('podManagement:podList.cpu')}</TableCell>
                    <TableCell align="right">{t('podManagement:podList.memory')}</TableCell>
                    <TableCell align="right">{t('podManagement:podList.restarts')}</TableCell>
                    <TableCell align="right">{t('podManagement:podList.age')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pods.map((pod) => (
                    <PodRow key={pod.name} pod={pod} />
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

// 格式化字節大小
const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

// 格式化年齡
const formatAge = (startTime) => {
  const start = new Date(startTime);
  const now = new Date();
  const diff = Math.floor((now - start) / 1000);

  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
};

const PodRow = ({ pod }) => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadPodMetrics = async () => {
    try {
      setLoading(true);
      const resources = await api.get(`pods/${pod.namespace}/${pod.name}/metrics`);
      setMetrics(resources);
    } catch (error) {
      console.error('Error fetching pod metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Convert millicores to cores
  const formatCPU = (millicores) => {
    if (!millicores && millicores !== 0) return '0';
    return (millicores / 1000).toFixed(3);
  };

  return (
    <TableRow 
      key={pod.name}
      onClick={loadPodMetrics}
      sx={{ cursor: 'pointer' }}
    >
      <TableCell component="th" scope="row">
        <Tooltip title={pod.name} placement="top-start">
          <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
            {pod.name}
          </Typography>
        </Tooltip>
      </TableCell>
      <TableCell align="right">
        <Chip
          icon={
            pod.status === 'Running' ? <CheckCircleIcon /> :
            pod.status === 'Failed' ? <ErrorIcon /> :
            <WarningIcon />
          }
          label={pod.status}
          size="small"
          color={
            pod.status === 'Running' ? 'success' :
            pod.status === 'Failed' ? 'error' :
            'warning'
          }
        />
      </TableCell>
      <TableCell align="right">
        {loading ? (
          <CircularProgress size={20} />
        ) : (
          metrics ? (
            <Tooltip title={`Requests: ${formatCPU(metrics.cpu.requests)} cores, Limits: ${formatCPU(metrics.cpu.limits)} cores`}>
              <Typography variant="body2">
                {`${formatCPU(metrics.cpu.usage)} cores`}
              </Typography>
            </Tooltip>
          ) : (
            `${formatCPU(pod.metrics?.cpu || 0)} cores`
          )
        )}
      </TableCell>
      <TableCell align="right">
        {loading ? (
          <CircularProgress size={20} />
        ) : (
          metrics ? (
            <Tooltip title={`Requests: ${formatBytes(metrics.memory.requests)}, Limits: ${formatBytes(metrics.memory.limits)}`}>
              <Typography variant="body2">
                {formatBytes(metrics.memory.usage)}
              </Typography>
            </Tooltip>
          ) : (
            formatBytes(pod.metrics?.memory || 0)
          )
        )}
      </TableCell>
      <TableCell align="right">
        <Chip
          label={pod.restarts}
          size="small"
          color={pod.restarts > 0 ? 'warning' : 'default'}
        />
      </TableCell>
      <TableCell align="right">
        {formatAge(pod.startTime)}
      </TableCell>
    </TableRow>
  );
};

const PodList = () => {
  const [namespaces, setNamespaces] = useState({});
  const [openNamespace, setOpenNamespace] = useState(null);
  const [filters, setFilters] = useState({
    namespace: 'all',
    search: ''
  });
  const [availableNamespaces, setAvailableNamespaces] = useState([]);
  const { t } = useAppTranslation();

  // 獲取可用的命名空間
  const fetchNamespaces = async () => {
    try {
      const data = await api.get('pods/namespaces');
      setAvailableNamespaces(data.namespaces);
    } catch (error) {
      console.error('Error fetching namespaces:', error);
    }
  };

  useEffect(() => {
    fetchNamespaces();
  }, []);

  // 獲取 Pod 列表
  useEffect(() => {
    const fetchPods = async () => {
      try {
        const queryParams = new URLSearchParams();
        if (filters.namespace !== 'all') queryParams.append('namespace', filters.namespace);
        if (filters.search) queryParams.append('search', filters.search);

        const data = await api.get(`pods?${queryParams}`);
        
        // 按命名空間組織 pods
        const groupedPods = data.reduce((acc, pod) => {
          const ns = pod.namespace;
          if (!acc[ns]) acc[ns] = [];
          acc[ns].push(pod);
          return acc;
        }, {});

        setNamespaces(groupedPods);
      } catch (error) {
        console.error('Error fetching pods:', error);
      }
    };

    fetchPods();
    const interval = setInterval(fetchPods, 30000);
    return () => clearInterval(interval);
  }, [filters]);

  return (
    <Box sx={{ width: '100%' }}>
      {/* 過濾器部分 */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid2 container spacing={2} alignItems="center">
          <Grid2 item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel>{t('namespace')}</InputLabel>
              <Select
                value={filters.namespace}
                onChange={(e) => handleFilterChange('namespace', e.target.value)}
                label={t('namespace')}
              >
                <MenuItem value="all">{t('allNamespaces')}</MenuItem>
                {availableNamespaces.map(ns => (
                  <MenuItem key={ns} value={ns}>{ns}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid2>
          <Grid2 item xs={12} sm={6}>
            <TextField
              fullWidth
              size="small"
              placeholder={t('searchPods')}
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                )
              }}
            />
          </Grid2>
        </Grid2>
      </Paper>

      {/* Pod 列表部分 */}
      <TableContainer component={Paper}>
        <Table>
          <TableBody>
            {Object.entries(namespaces).map(([namespace, pods]) => (
              <NamespaceRow
                key={namespace}
                namespace={namespace}
                pods={pods}
                isOpen={openNamespace === namespace}
                onToggle={() => handleNamespaceToggle(namespace)}
              />
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default PodList;
