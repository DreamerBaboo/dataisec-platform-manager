import React, { useState, useEffect, useMemo } from 'react';
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
  CircularProgress,
  Card,
  CardContent
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import SearchIcon from '@mui/icons-material/Search';
import ReactECharts from 'echarts-for-react';
import RGL, { WidthProvider } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

const ReactGridLayout = WidthProvider(RGL);

const PodDashboard = () => {
  const { t } = useTranslation();
  const [orderBy, setOrderBy] = useState('name');
  const [order, setOrder] = useState('asc');
  const [pods, setPods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    namespace: 'all',
    search: ''
  });
  const [namespaces, setNamespaces] = useState([]);
  const [metrics, setMetrics] = useState({
    totalPods: 0,
    runningPods: 0,
    totalCPU: 0,
    totalMemory: 0
  });

  // Dashboard layout state
  const [layout, setLayout] = useState([
    { i: 'totalPods', x: 0, y: 0, w: 3, h: 4, minW: 2, minH: 3 },
    { i: 'runningPods', x: 3, y: 0, w: 3, h: 4, minW: 2, minH: 3 },
    { i: 'cpuUsage', x: 6, y: 0, w: 3, h: 4, minW: 2, minH: 3 },
    { i: 'memoryUsage', x: 9, y: 0, w: 3, h: 4, minW: 2, minH: 3 },
    { i: 'statusDistribution', x: 0, y: 4, w: 6, h: 8, minW: 4, minH: 6 },
    { i: 'namespaceDistribution', x: 6, y: 4, w: 6, h: 8, minW: 4, minH: 6 }
  ]);

  // 獲取命名空間列表
  useEffect(() => {
    const fetchNamespaces = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/pods/namespaces', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        if (response.ok) {
          const data = await response.json();
          setNamespaces(data.namespaces);
        }
      } catch (error) {
        console.error('Error fetching namespaces:', error);
      }
    };
    fetchNamespaces();
  }, []);

  // 獲取 Pod 列表和指標
  useEffect(() => {
    const fetchPods = async () => {
      try {
        setLoading(true);
        const queryParams = new URLSearchParams();
        if (filters.namespace !== 'all') queryParams.append('namespace', filters.namespace);
        if (filters.search) queryParams.append('search', filters.search);

        const response = await fetch(`http://localhost:3001/api/pods?${queryParams}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          setPods(data);
          
          // 計算總體指標
          const runningPods = data.filter(pod => pod.status === 'Running').length;
          const totalCPU = data.reduce((sum, pod) => sum + (pod.metrics?.cpu || 0), 0);
          const totalMemory = data.reduce((sum, pod) => sum + (pod.metrics?.memory || 0), 0);
          
          setMetrics({
            totalPods: data.length,
            runningPods,
            totalCPU,
            totalMemory
          });
        }
      } catch (error) {
        console.error('Error fetching pods:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPods();
    const interval = setInterval(fetchPods, 30000); // 每30秒更新一次
    return () => clearInterval(interval);
  }, [filters]);

  // 指標卡片配置
  const MetricCard = ({ title, value, unit, color }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography color="textSecondary" gutterBottom>
          {title}
        </Typography>
        <Typography variant="h4" component="div" color={color}>
          {typeof value === 'number' ? value.toFixed(2) : value} {unit}
        </Typography>
      </CardContent>
    </Card>
  );

  // Pod 狀態分佈圖表配置
  const getPodStatusChartOption = () => {
    const statusCount = pods.reduce((acc, pod) => {
      acc[pod.status] = (acc[pod.status] || 0) + 1;
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

  // 命名空間分佈圖表配置
  const getNamespaceDistributionChartOption = () => {
    const namespaceCount = pods.reduce((acc, pod) => {
      acc[pod.namespace] = (acc[pod.namespace] || 0) + 1;
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

  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'running':
        return 'success';
      case 'pending':
        return 'warning';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const sortedPods = useMemo(() => {
    if (!pods) return [];
    
    const comparator = (a, b) => {
      let comparison = 0;
      switch (orderBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'namespace':
          comparison = a.namespace.localeCompare(b.namespace);
          break;
        case 'status':
          comparison = (a.status || '').localeCompare(b.status || '');
          break;
        case 'cpu':
          comparison = (a.metrics?.cpu || 0) - (b.metrics?.cpu || 0);
          break;
        case 'memory':
          comparison = (a.metrics?.memory || 0) - (b.metrics?.memory || 0);
          break;
        case 'restarts':
          comparison = (a.restarts || 0) - (b.restarts || 0);
          break;
        default:
          comparison = 0;
      }
      return order === 'desc' ? -comparison : comparison;
    };

    return [...pods].sort(comparator);
  }, [pods, order, orderBy]);

  return (
    <Box sx={{ p: 3 }}>
      {/* Dashboard Area */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <ReactGridLayout
          className="layout"
          layout={layout}
          cols={12}
          rowHeight={30}
          onLayoutChange={setLayout}
          draggableHandle=".drag-handle"
          margin={[16, 16]}
          containerPadding={[0, 0]}
          isResizable={true}
          isDraggable={true}
        >
          {/* Total Pods Card */}
          <div key="totalPods">
            <Paper sx={{ height: '100%', p: 2 }}>
              <Box className="drag-handle" sx={{ 
                cursor: 'move',
                mb: 1,
                p: 1,
                bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.800' : 'grey.100'
              }}>
                <Typography variant="subtitle1" fontWeight="medium">
                  {t('totalPods')}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100% - 48px)' }}>
                <Typography variant="h3" color="primary">
                  {metrics.totalPods}
                </Typography>
              </Box>
            </Paper>
          </div>

          {/* Running Pods Card */}
          <div key="runningPods">
            <Paper sx={{ height: '100%', p: 2 }}>
              <Box className="drag-handle" sx={{ 
                cursor: 'move',
                mb: 1,
                p: 1,
                bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.800' : 'grey.100'
              }}>
                <Typography variant="subtitle1" fontWeight="medium">
                  {t('runningPods')}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100% - 48px)' }}>
                <Typography variant="h3" color="success.main">
                  {metrics.runningPods}
                </Typography>
              </Box>
            </Paper>
          </div>

          {/* CPU Usage Chart */}
          <div key="cpuUsage">
            <Paper sx={{ height: '100%', p: 2 }}>
              <Box className="drag-handle" sx={{ 
                cursor: 'move',
                mb: 1,
                p: 1,
                bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.800' : 'grey.100'
              }}>
                <Typography variant="subtitle1" fontWeight="medium">
                  {t('cpuUsage')}
                </Typography>
              </Box>
              <Box sx={{ height: 'calc(100% - 48px)' }}>
                <Typography variant="h3" color="info.main">
                  {`${metrics.totalCPU.toFixed(2)} cores`}
                </Typography>
              </Box>
            </Paper>
          </div>

          {/* Memory Usage Chart */}
          <div key="memoryUsage">
            <Paper sx={{ height: '100%', p: 2 }}>
              <Box className="drag-handle" sx={{ 
                cursor: 'move',
                mb: 1,
                p: 1,
                bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.800' : 'grey.100'
              }}>
                <Typography variant="subtitle1" fontWeight="medium">
                  {t('memoryUsage')}
                </Typography>
              </Box>
              <Box sx={{ height: 'calc(100% - 48px)' }}>
                <Typography variant="h3" color="secondary.main">
                  {formatBytes(metrics.totalMemory)}
                </Typography>
              </Box>
            </Paper>
          </div>

          {/* Status Distribution Chart */}
          <div key="statusDistribution">
            <Paper sx={{ height: '100%', p: 2 }}>
              <Box className="drag-handle" sx={{ 
                cursor: 'move',
                mb: 1,
                p: 1,
                bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.800' : 'grey.100'
              }}>
                <Typography variant="subtitle1" fontWeight="medium">
                  {t('podStatusDistribution')}
                </Typography>
              </Box>
              <Box sx={{ height: 'calc(100% - 48px)' }}>
                <ReactECharts
                  option={getPodStatusChartOption()}
                  style={{ height: '100%' }}
                />
              </Box>
            </Paper>
          </div>

          {/* Namespace Distribution Chart */}
          <div key="namespaceDistribution">
            <Paper sx={{ height: '100%', p: 2 }}>
              <Box className="drag-handle" sx={{ 
                cursor: 'move',
                mb: 1,
                p: 1,
                bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.800' : 'grey.100'
              }}>
                <Typography variant="subtitle1" fontWeight="medium">
                  {t('podNamespaceDistribution')}
                </Typography>
              </Box>
              <Box sx={{ height: 'calc(100% - 48px)' }}>
                <ReactECharts
                  option={getNamespaceDistributionChartOption()}
                  style={{ height: '100%' }}
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
              <InputLabel>{t('namespace')}</InputLabel>
              <Select
                value={filters.namespace}
                onChange={(e) => setFilters(prev => ({ ...prev, namespace: e.target.value }))}
                label={t('namespace')}
              >
                <MenuItem value="all">{t('allNamespaces')}</MenuItem>
                {namespaces.map(ns => (
                  <MenuItem key={ns} value={ns}>{ns}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              size="small"
              placeholder={t('searchPods')}
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

      {/* Table Area */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'name'}
                  direction={orderBy === 'name' ? order : 'asc'}
                  onClick={() => handleRequestSort('name')}
                >
                  {t('podName')}
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'namespace'}
                  direction={orderBy === 'namespace' ? order : 'asc'}
                  onClick={() => handleRequestSort('namespace')}
                >
                  {t('namespace')}
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'status'}
                  direction={orderBy === 'status' ? order : 'asc'}
                  onClick={() => handleRequestSort('status')}
                >
                  {t('status')}
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={orderBy === 'cpu'}
                  direction={orderBy === 'cpu' ? order : 'asc'}
                  onClick={() => handleRequestSort('cpu')}
                >
                  {t('cpu')}
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={orderBy === 'memory'}
                  direction={orderBy === 'memory' ? order : 'asc'}
                  onClick={() => handleRequestSort('memory')}
                >
                  {t('memory')}
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={orderBy === 'restarts'}
                  direction={orderBy === 'restarts' ? order : 'asc'}
                  onClick={() => handleRequestSort('restarts')}
                >
                  {t('restarts')}
                </TableSortLabel>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedPods.map((pod) => (
              <TableRow key={`${pod.namespace}-${pod.name}`}>
                <TableCell>{pod.name}</TableCell>
                <TableCell>{pod.namespace}</TableCell>
                <TableCell>
                  <Chip
                    label={pod.status}
                    color={getStatusColor(pod.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">
                  {`${pod.metrics?.cpu?.toFixed(2) || '0.00'} cores`}
                </TableCell>
                <TableCell align="right">
                  {formatBytes(pod.metrics?.memory || 0)}
                </TableCell>
                <TableCell align="right">
                  <Chip
                    label={pod.restarts || 0}
                    color={pod.restarts > 0 ? 'warning' : 'default'}
                    size="small"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default PodDashboard;
