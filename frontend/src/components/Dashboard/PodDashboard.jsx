import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Paper, Typography, Box, CircularProgress, FormControl, InputLabel, Select, MenuItem, useTheme, Button, TextField, Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel } from '@mui/material';
import ReactECharts from 'echarts-for-react';
import { useTranslation } from 'react-i18next';
import RefreshIcon from '@mui/icons-material/Refresh';
import RGL, { WidthProvider } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

const ReactGridLayout = WidthProvider(RGL);

const PodDashboard = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [podMetrics, setPodMetrics] = useState({});
  const [selectedPod, setSelectedPod] = useState(null);
  const [pods, setPods] = useState([]);
  const [filteredPods, setFilteredPods] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNamespace, setSelectedNamespace] = useState('');
  const [selectedPodType, setSelectedPodType] = useState('');
  const [orderBy, setOrderBy] = useState('name');
  const [order, setOrder] = useState('asc');
  const [layout, setLayout] = useState([
    { i: 'cpu', x: 0, y: 0, w: 6, h: 8 },
    { i: 'memory', x: 6, y: 0, w: 6, h: 8 },
    { i: 'network', x: 0, y: 8, w: 6, h: 8 },
    { i: 'storage', x: 6, y: 8, w: 6, h: 8 },
  ]);

  const theme = useTheme();
  const chartRefs = useRef({});

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      await Promise.all([fetchPodMetrics(), fetchPods()]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const intervalId = setInterval(fetchData, 5000);
    return () => clearInterval(intervalId);
  }, [fetchData]);

  useEffect(() => {
    filterPods();
  }, [pods, searchTerm, selectedNamespace, selectedPodType]);

  const fetchPodMetrics = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/metrics/pods', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setPodMetrics(data);
    } catch (error) {
      console.error(t('fetchPodMetricsError'), error);
    }
  };

  const fetchPods = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/pods', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setPods(data);
    } catch (error) {
      console.error(t('fetchPodsError'), error);
    }
  };

  const filterPods = () => {
    if (!pods.length) return;
    let filtered = pods;
    if (searchTerm) {
      filtered = filtered.filter(pod => pod.metadata.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    if (selectedNamespace) {
      filtered = filtered.filter(pod => pod.metadata.namespace === selectedNamespace);
    }
    if (selectedPodType) {
      filtered = filtered.filter(pod => pod.type === selectedPodType);
    }
    setFilteredPods(filtered);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const handlePodSelection = (pod) => {
    setSelectedPod(pod);
  };

  const chartStyle = {
    height: '100%',
    width: '100%',
  };

  const getChartOption = (title, data, type = 'line') => {
    if (!data) {
      return {
        xAxis: { type: 'category', data: [] },
        yAxis: { type: 'value' },
        series: [{ data: [], type: 'line' }]
      };
    }

    if (type === 'pie') {
      return {
        tooltip: { trigger: 'item' },
        series: [{
          type: 'pie',
          data: [
            { value: data.used, name: t('used') },
            { value: data.free, name: t('available') }
          ],
          itemStyle: {
            color: (params) => params.name === t('used') ? theme.palette.primary.main : theme.palette.secondary.main
          }
        }]
      };
    } else if (type === 'network') {
      return {
        tooltip: { trigger: 'axis' },
        xAxis: { 
          type: 'category', 
          data: data.tx.map(item => item.timestamp),
          axisLabel: { color: theme.palette.text.secondary }
        },
        yAxis: { 
          type: 'value', 
          axisLabel: { color: theme.palette.text.secondary }
        },
        series: [
          {
            name: t('send'),
            data: data.tx.map(item => item.value),
            type: 'line',
            smooth: true,
            itemStyle: { color: theme.palette.success.main }
          },
          {
            name: t('receive'),
            data: data.rx.map(item => item.value),
            type: 'line',
            smooth: true,
            itemStyle: { color: theme.palette.error.main }
          }
        ]
      };
    }

    return {
      tooltip: { trigger: 'axis' },
      xAxis: { 
        type: 'category', 
        data: data.map(item => item.timestamp),
        axisLabel: { color: theme.palette.text.secondary }
      },
      yAxis: { 
        type: 'value', 
        axisLabel: { color: theme.palette.text.secondary }
      },
      series: [{
        data: data.map(item => item.value),
        type: type,
        smooth: true,
        itemStyle: { color: theme.palette.primary.main }
      }]
    };
  };

  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const sortedPods = React.useMemo(() => {
    const comparator = (a, b) => {
      if (orderBy === 'name') {
        return order === 'asc'
          ? a.metadata.name.localeCompare(b.metadata.name)
          : b.metadata.name.localeCompare(a.metadata.name);
      }
      if (orderBy === 'type') {
        return order === 'asc'
          ? a.type.localeCompare(b.type)
          : b.type.localeCompare(a.type);
      }
      if (orderBy === 'namespace') {
        return order === 'asc'
          ? a.metadata.namespace.localeCompare(b.metadata.namespace)
          : b.metadata.namespace.localeCompare(a.metadata.namespace);
      }
      return 0;
    };
    return [...filteredPods].sort(comparator);
  }, [filteredPods, order, orderBy]);

  const renderChart = (chartId, option, title) => (
    <Paper elevation={3} sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Box sx={{ p: 1, background: theme.palette.primary.main, color: theme.palette.primary.contrastText, cursor: 'move' }} className="drag-handle">
        {title}
      </Box>
      <Box sx={{ flexGrow: 1, position: 'relative' }}>
        <ReactECharts
          option={option}
          style={chartStyle}
          ref={(e) => { if (e) chartRefs.current[chartId] = e; }}
          opts={{ renderer: 'svg' }}
          lazyUpdate={true}
        />
      </Box>
    </Paper>
  );

  return (
    <Box sx={{ flexGrow: 1, color: theme.palette.text.primary }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">
          {t('podDashboard')}
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={handleRefresh}
          disabled={loading}
        >
          {loading ? t('refreshing') : t('refresh')}
        </Button>
      </Box>

      {/* Pod 指標圖表部分 */}
      <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          {t('podMetrics')} {selectedPod && `- ${selectedPod.metadata.name}`}
        </Typography>
        <ReactGridLayout
          className="layout"
          layout={layout}
          cols={12}
          rowHeight={30}
          width={1200}
          onLayoutChange={(newLayout) => {
            setLayout(newLayout);
            setTimeout(() => {
              Object.values(chartRefs.current).forEach(chart => {
                if (chart) {
                  chart.getEchartsInstance().resize();
                }
              });
            }, 0);
          }}
          draggableHandle=".drag-handle"
          margin={[16, 16]}
          containerPadding={[0, 0]}
          isResizable={true}
          isBounded={true}
        >
          <div key="cpu" style={{width: '100%', height: '100%'}}>
            {renderChart('cpu', getChartOption(t('podCpuUsage'), podMetrics[selectedPod?.metadata?.name]?.cpu), t('podCpuUsage'))}
          </div>
          <div key="memory" style={{width: '100%', height: '100%'}}>
            {renderChart('memory', getChartOption(t('podMemoryUsage'), podMetrics[selectedPod?.metadata?.name]?.memory), t('podMemoryUsage'))}
          </div>
          <div key="network" style={{width: '100%', height: '100%'}}>
            {renderChart('network', getChartOption(t('podNetworkUsage'), podMetrics[selectedPod?.metadata?.name]?.network, 'network'), t('podNetworkUsage'))}
          </div>
          <div key="storage" style={{width: '100%', height: '100%'}}>
            {renderChart('storage', getChartOption(t('podStorageUsage'), podMetrics[selectedPod?.metadata?.name]?.storage, 'pie'), t('podStorageUsage'))}
          </div>
        </ReactGridLayout>
      </Paper>

      {/* Pod 列表部分 */}
      <Paper elevation={3} sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          {t('podList')}
        </Typography>
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label={t('searchPods')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <InputLabel>{t('namespace')}</InputLabel>
              <Select
                value={selectedNamespace}
                label={t('namespace')}
                onChange={(e) => setSelectedNamespace(e.target.value)}
              >
                <MenuItem value="">{t('all')}</MenuItem>
                {/* Add namespace options */}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <InputLabel>{t('podType')}</InputLabel>
              <Select
                value={selectedPodType}
                label={t('podType')}
                onChange={(e) => setSelectedPodType(e.target.value)}
              >
                <MenuItem value="">{t('all')}</MenuItem>
                <MenuItem value="statefulset">{t('statefulSet')}</MenuItem>
                <MenuItem value="daemonset">{t('daemonSet')}</MenuItem>
                <MenuItem value="deployment">{t('deployment')}</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
        {loading ? (
          <CircularProgress />
        ) : (
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
                      active={orderBy === 'type'}
                      direction={orderBy === 'type' ? order : 'asc'}
                      onClick={() => handleRequestSort('type')}
                    >
                      {t('podType')}
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
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedPods.map((pod) => (
                  <TableRow
                    key={pod.metadata.uid || pod.id} // Use a unique identifier for the key
                    onClick={() => handlePodSelection(pod)}
                    sx={{
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: theme.palette.action.hover,
                      },
                      ...(selectedPod && selectedPod.metadata.uid === pod.metadata.uid
                        ? { backgroundColor: theme.palette.action.selected }
                        : {}),
                    }}
                  >
                    <TableCell>{pod.metadata.name}</TableCell>
                    <TableCell>{pod.type}</TableCell>
                    <TableCell>{pod.metadata.namespace}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        {sortedPods.length === 0 && !loading && (
          <Typography>{t('noPodData')}</Typography>
        )}
      </Paper>
    </Box>
  );
};

export default PodDashboard;
