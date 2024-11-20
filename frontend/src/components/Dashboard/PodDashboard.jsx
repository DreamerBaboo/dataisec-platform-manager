import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Typography,
  Chip,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  InputAdornment,
  Checkbox,
  Button
} from '@mui/material';
import { useAppTranslation } from '../../hooks/useAppTranslation';
import SearchIcon from '@mui/icons-material/Search';
import CalculateIcon from '@mui/icons-material/Calculate';
import ReactECharts from 'echarts-for-react';
import RGL, { WidthProvider } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { api, getApiUrl } from '../../utils/api';
import { logger } from '../../utils/logger.ts';  // 導入 logger

const ReactGridLayout = WidthProvider(RGL);

const DEFAULT_LAYOUT = [
  { i: 'metrics', x: 0, y: 0, w: 12, h: 4, minW: 6, minH: 4 },
  { i: 'statusChart', x: 0, y: 4, w: 6, h: 8, minW: 4, minH: 6 },
  { i: 'namespaceChart', x: 6, y: 4, w: 6, h: 8, minW: 4, minH: 6 }
];

const LAYOUT_STORAGE_KEY = 'pod-dashboard-layout';

const PodDashboard = () => {
  const { t } = useAppTranslation();
  const [pods, setPods] = useState([]);
  const [selectedPods, setSelectedPods] = useState([]);
  const [podMetrics, setPodMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    namespace: 'all',
    search: ''
  });
  const [namespaces, setNamespaces] = useState([]);
  const [layout, setLayout] = useState(() => {
    const savedLayout = localStorage.getItem(LAYOUT_STORAGE_KEY);
    return savedLayout ? JSON.parse(savedLayout) : DEFAULT_LAYOUT;
  });

  // Save layout changes
  const handleLayoutChange = useCallback((newLayout) => {
    setLayout(newLayout);
    localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(newLayout));
  }, []);

  // Fetch namespaces
  useEffect(() => {
    const fetchNamespaces = async () => {
      try {
        logger.info('開始獲取命名空間...');
        const data = await api.get('api/pods/namespaces');
        logger.info('獲取到的命名空間:', data.namespaces);
        setNamespaces(data.namespaces);
      } catch (error) {
        console.error('獲取命名空間時發生錯誤:', error);
      }
    };
    fetchNamespaces();
  }, []);

  // Fetch pods
  useEffect(() => {
    const fetchPods = async () => {
      try {
        logger.info('開始獲取 Pod 列表，過濾條件:', filters);
        setLoading(true);
        const queryParams = new URLSearchParams();
        if (filters.namespace !== 'all') queryParams.append('namespace', filters.namespace);
        if (filters.search) queryParams.append('search', filters.search);

        const endpoint = `api/pods${queryParams.toString() ? `?${queryParams}` : ''}`;
        logger.info('請求端點:', endpoint);
        
        const data = await api.get(endpoint);
        logger.info('獲取到的 Pod 數量:', data.length);
        setPods(data);
      } catch (error) {
        console.error('獲取 Pod 列表時發生錯誤:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPods();
    const interval = setInterval(fetchPods, 30000);
    return () => clearInterval(interval);
  }, [filters]);

  // Fetch metrics for selected pods
  const fetchSelectedPodsMetrics = useCallback(async () => {
    if (selectedPods.length === 0) {
      logger.info('沒有選中的 Pod，清空指標數據');
      setPodMetrics(null);
      return;
    }

    try {
      logger.info('開始獲取選中 Pod 的指標，選中的 Pod:', selectedPods);
      const data = await api.post('api/pods/calculate-resources', {
        podNames: selectedPods
      });
      logger.info('獲取到的 Pod 指標:', data);
      setPodMetrics(data);
    } catch (error) {
      console.error('獲取 Pod 指標時發生錯誤:', error);
    }
  }, [selectedPods]);

  useEffect(() => {
    fetchSelectedPodsMetrics();
  }, [selectedPods, fetchSelectedPodsMetrics]);

  // Selection handlers
  const handleSelectAllClick = (event) => {
    if (event.target.checked) {
      setSelectedPods(pods.map(pod => pod.name));
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

  // Chart configurations
  const getPodStatusChartOption = () => {
    const statusCount = pods.reduce((acc, pod) => {
      if (pod.status) {
        acc[pod.status] = (acc[pod.status] || 0) + 1;
      }
      return acc;
    }, {});

    return {
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} ({d}%)'
      },
      legend: {
        orient: 'vertical',
        left: 'left'
      },
      series: [{
        type: 'pie',
        radius: ['50%', '70%'],
        avoidLabelOverlap: true,
        label: {
          show: true,
          formatter: '{b}: {c}'
        },
        data: Object.entries(statusCount).map(([status, count]) => ({
          name: status,
          value: count,
          itemStyle: {
            color: status === 'Running' ? '#4caf50' :
                   status === 'Pending' ? '#ff9800' :
                   status === 'Failed' ? '#f44336' : '#9e9e9e'
          }
        }))
      }]
    };
  };

  const getNamespaceChartOption = () => {
    const namespaceCount = pods.reduce((acc, pod) => {
      if (pod.namespace) {
        acc[pod.namespace] = (acc[pod.namespace] || 0) + 1;
      }
      return acc;
    }, {});

    return {
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} pods'
      },
      legend: {
        type: 'scroll',
        orient: 'vertical',
        right: 10,
        top: 20,
        bottom: 20,
      },
      series: [{
        type: 'pie',
        radius: '55%',
        center: ['40%', '50%'],
        data: Object.entries(namespaceCount).map(([namespace, count], index) => ({
          name: namespace,
          value: count,
          itemStyle: {
            color: [
              '#2196f3', '#4caf50', '#ff9800', '#f44336',
              '#9c27b0', '#00bcd4', '#009688', '#e91e63',
              '#3f51b5', '#cddc39'
            ][index % 10]
          }
        })),
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        },
        label: {
          show: true,
          formatter: '{b}: {c} pods\n({d}%)'
        }
      }]
    };
  };

  // Render metrics cards
  const MetricsCards = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2, height: '100%' }}>
          <Box className="drag-handle" sx={{ 
            cursor: 'move',
            mb: 1,
            p: 1,
            bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.800' : 'grey.100'
          }}>
            <Typography variant="subtitle1" fontWeight="medium">
              {selectedPods.length > 1 ? 
                `${t('dashboard:dashboard.resources.cpu.title')} (${selectedPods.length} ${t('dashboard:podsSelected')})` : 
                t('dashboard:dashboard.resources.cpu.title')}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="h4" color="primary">
              {podMetrics ? 
                `${t('dashboard:dashboard.resources.cpu.total')} ${podMetrics.cpu.cores.toFixed(2)} ${t('dashboard:dashboard.resources.cpu.used')}` : 
                '0 cores'}
            </Typography>
          </Box>
        </Paper>
      </Grid>
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2, height: '100%' }}>
          <Box className="drag-handle" sx={{ 
            cursor: 'move',
            mb: 1,
            p: 1,
            bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.800' : 'grey.100'
          }}>
            <Typography variant="subtitle1" fontWeight="medium">
              {selectedPods.length > 1 ? 
                `${t('dashboard:dashboard.resources.memory.title')} (${selectedPods.length} ${t('dashboard:podsSelected')})` : 
                t('dashboard:dashboard.resources.memory.title')}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="h4" color="secondary">
              {podMetrics ? 
                `${podMetrics.memory.usedGB.toFixed(2)} GB` : 
                '0 GB'}
            </Typography>
          </Box>
        </Paper>
      </Grid>
    </Grid>
  );

  return (
    <Box sx={{top: '64px', left: '240px', width: '100%', minWidth: '1182px' }}>
      {/* Dashboard Area */}
      <Paper sx={{ width: '100%', height: '100%', p: 2, mb: 3 }}>
        <ReactGridLayout
          className="layout"
          layout={layout}
          cols={30}
          rowHeight={20}
          onLayoutChange={handleLayoutChange}
          draggableHandle=".drag-handle"
          margin={[16, 16]}
          containerPadding={[0, 0]}
          isResizable={true}
          isDraggable={true}
        >
          {/* Metrics Cards */}
          <div key="metrics">
            <MetricsCards />
          </div>

          {/* Status Distribution Chart */}
          <div key="statusChart">
            <Paper sx={{ height: '100%', p: 2 }}>
              <Box className="drag-handle" sx={{ 
                cursor: 'move',
                mb: 1,
                p: 1,
                bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.800' : 'grey.100'
              }}>
                <Typography variant="subtitle1" fontWeight="medium">
                  {t('dashboard:dashboard.podStatusDistribution')}
                </Typography>
              </Box>
              <Box sx={{ height: 'calc(100% - 48px)' }}>
                <ReactECharts
                  option={getPodStatusChartOption()}
                  style={{ height: '100%' }}
                  opts={{ renderer: 'canvas' }}
                />
              </Box>
            </Paper>
          </div>

          {/* Namespace Distribution Chart */}
          <div key="namespaceChart">
            <Paper sx={{ height: '100%', p: 2 }}>
              <Box className="drag-handle" sx={{ 
                cursor: 'move',
                mb: 1,
                p: 1,
                bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.800' : 'grey.100'
              }}>
                <Typography variant="subtitle1" fontWeight="medium">
                  {t('dashboard:dashboard.podNamespaceDistribution')}
                </Typography>
              </Box>
              <Box sx={{ height: 'calc(100% - 48px)' }}>
                <ReactECharts
                  option={getNamespaceChartOption()}
                  style={{ height: '100%' }}
                  opts={{ renderer: 'canvas' }}
                />
              </Box>
            </Paper>
          </div>
        </ReactGridLayout>
      </Paper>

      {/* Filters Area */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel>{t('dashboard:dashboard.namespace')}</InputLabel>
              <Select
                value={filters.namespace}
                onChange={(e) => setFilters(prev => ({ ...prev, namespace: e.target.value }))}
                label={t('dashboard:dashboard.namespace')}
              >
                <MenuItem value="all">{t('dashboard:dashboard.allNamespaces')}</MenuItem>
                {Array.isArray(namespaces) && namespaces.map(ns => (
                  <MenuItem key={ns} value={ns}>{ns}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              size="small"
              placeholder={t('dashboard:dashboard.searchPods')}
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                )
              }}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Pod List */}
      <TableContainer 
        component={Paper} 
        sx={{ 
          maxHeight: 1000,
          overflow: 'auto'
        }}
      >
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
              <TableCell sx={{ bgcolor: 'background.paper' }}>
                {t('dashboard:dashboard.podName')}
              </TableCell>
              <TableCell sx={{ bgcolor: 'background.paper' }}>
                {t('dashboard:dashboard.namespace')}
              </TableCell>
              <TableCell sx={{ bgcolor: 'background.paper' }}>
                {t('dashboard:dashboard.status')}
              </TableCell>
              <TableCell align="right" sx={{ bgcolor: 'background.paper' }}>
                {t('dashboard:dashboard.restarts')}
              </TableCell>
              <TableCell align="right" sx={{ bgcolor: 'background.paper' }}>
                {t('dashboard:dashboard.age')}
              </TableCell>
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
                <TableCell>
                  <Chip
                    label={pod.status}
                    color={pod.status === 'Running' ? 'success' :
                           pod.status === 'Pending' ? 'warning' :
                           pod.status === 'Failed' ? 'error' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">
                  <Chip
                    label={pod.restarts || 0}
                    color={pod.restarts > 0 ? 'warning' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">
                  {formatAge(pod.startTime)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
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

export default PodDashboard;
