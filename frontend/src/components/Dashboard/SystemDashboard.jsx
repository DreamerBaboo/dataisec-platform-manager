import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Paper, Typography, Box, CircularProgress, useTheme, Tabs, Tab, Button } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import ReactECharts from 'echarts-for-react';
import RGL, { WidthProvider } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { useTranslation } from 'react-i18next';

const ReactGridLayout = WidthProvider(RGL);

const SystemDashboard = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [clusterMetrics, setClusterMetrics] = useState({});
  const [nodeMetrics, setNodeMetrics] = useState({});
  const [selectedTab, setSelectedTab] = useState(0);
  const [layout, setLayout] = useState(() => {
    const savedLayout = localStorage.getItem('systemDashboardLayout');
    return savedLayout ? JSON.parse(savedLayout) : [
      { i: 'cpu', x: 0, y: 0, w: 6, h: 8 },
      { i: 'memory', x: 6, y: 0, w: 6, h: 8 },
      { i: 'network', x: 0, y: 8, w: 6, h: 8 },
      { i: 'storage', x: 6, y: 8, w: 6, h: 8 },
    ];
  });

  const theme = useTheme();
  const chartRefs = useRef({});

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/metrics/system', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log('Received system metrics:', data);
      setClusterMetrics(data.cluster);
      setNodeMetrics(data.nodes);
    } catch (error) {
      console.error('獲取指標失敗:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    const intervalId = setInterval(fetchMetrics, 5000);
    return () => clearInterval(intervalId);
  }, [fetchMetrics]);

  const saveLayout = (newLayout) => {
    localStorage.setItem('systemDashboardLayout', JSON.stringify(newLayout));
  };

  const chartStyle = {
    height: '100%',
    width: '100%',
  };

  const getChartOption = (data, type = 'line') => {
    if (!data) {
      return {
        xAxis: { type: 'category', data: [] },
        yAxis: { type: 'value' },
        series: [{ data: [], type: 'line' }]
      };
    }

    if (type === 'line' || type === 'bar') {
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
    } else if (type === 'pie') {
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
  };

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

  const handleRefresh = () => {
    fetchMetrics();
  };

  const currentMetrics = selectedTab === 0 ? clusterMetrics : nodeMetrics[`node${selectedTab}`];

  return (
    <Box sx={{ flexGrow: 1, color: theme.palette.text.primary }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">
          {t('systemDashboard')}
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={handleRefresh}
          disabled={loading}
          sx={{ width: '150px' }}
        >
          {loading ? t('refreshing') : t('refresh')}
        </Button>
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Tabs value={selectedTab} onChange={(e, newValue) => setSelectedTab(newValue)}>
          <Tab label={t('cluster')} />
          <Tab label={`${t('node')} 1`} />
          <Tab label={`${t('node')} 2`} />
        </Tabs>
      </Box>
      <ReactGridLayout
        className="layout"
        layout={layout}
        cols={12}
        rowHeight={30}
        width={1200}
        onLayoutChange={(newLayout) => {
          setLayout(newLayout);
          saveLayout(newLayout);
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
          {renderChart('cpu', getChartOption(currentMetrics?.cpu), t('cpuUsage'))}
        </div>
        <div key="memory" style={{width: '100%', height: '100%'}}>
          {renderChart('memory', getChartOption(currentMetrics?.memory), t('memoryUsage'))}
        </div>
        <div key="network" style={{width: '100%', height: '100%'}}>
          {renderChart('network', getChartOption(currentMetrics?.network, 'network'), t('networkUsage'))}
        </div>
        <div key="storage" style={{width: '100%', height: '100%'}}>
          {renderChart('storage', getChartOption(currentMetrics?.storage, 'pie'), t('storageUsage'))}
        </div>
      </ReactGridLayout>
    </Box>
  );
};

export default SystemDashboard;
