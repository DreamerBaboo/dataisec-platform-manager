import React, { useState, useEffect, useRef } from 'react';
import { Paper, Typography, Box, CircularProgress, FormControl, InputLabel, Select, MenuItem, useTheme } from '@mui/material';
import ReactECharts from 'echarts-for-react';
import axios from 'axios';
import RGL, { WidthProvider } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { useAppTranslation } from '../../hooks/useAppTranslation';
import { getApiUrl } from '../../utils/api';

const ReactGridLayout = WidthProvider(RGL);

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [systemMetrics, setSystemMetrics] = useState({});
  const [podMetrics, setPodMetrics] = useState({});
  const [selectedPod, setSelectedPod] = useState('');
  const [pods, setPods] = useState([]);
  const [layout, setLayout] = useState([
    { i: 'cpu', x: 0, y: 0, w: 6, h: 2 },
    { i: 'memory', x: 6, y: 0, w: 6, h: 2 },
    { i: 'network', x: 0, y: 2, w: 6, h: 2 },
    { i: 'storage', x: 6, y: 2, w: 6, h: 2 },
    { i: 'podMetrics', x: 0, y: 4, w: 12, h: 3 },
  ]);

  const theme = useTheme();
  const chartRefs = useRef({});

  const { t } = useAppTranslation();

  useEffect(() => {
    fetchMetrics();
    fetchPods();
  }, []);

  useEffect(() => {
    const resizeCharts = () => {
      Object.values(chartRefs.current).forEach(chart => {
        if (chart) {
          chart.getEchartsInstance().resize();
        }
      });
    };

    window.addEventListener('resize', resizeCharts);
    return () => window.removeEventListener('resize', resizeCharts);
  }, []);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const response = await axios.get(getApiUrl('api//metrics'), {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setSystemMetrics(response.data.system);
      setPodMetrics(response.data.pods);
      setLoading(false);
    } catch (error) {
      console.error('獲取指標失敗:', error);
      setLoading(false);
    }
  };

  const fetchPods = async () => {
    try {
      const response = await axios.get(getApiUrl('api/pods'), {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setPods(response.data);
    } catch (error) {
      console.error('獲取 Pod 列表失敗:', error);
    }
  };

  const handlePodChange = (event) => {
    setSelectedPod(event.target.value);
  };

  const chartStyle = {
    height: '100%',
    width: '100%',
  };

  const paperStyle = {
    padding: '12px',
    height: '100%',
    backgroundColor: theme.palette.background.paper,
  };

  const getChartOption = (title, data, type = 'line') => ({
    title: { text: title, textStyle: { color: theme.palette.text.primary } },
    tooltip: { trigger: 'axis' },
    xAxis: { 
      type: 'category', 
      data: data?.map(item => item.timestamp),
      axisLabel: { color: theme.palette.text.secondary }
    },
    yAxis: { 
      type: 'value', 
      axisLabel: { color: theme.palette.text.secondary }
    },
    series: [{
      data: data?.map(item => item.value),
      type: type,
      smooth: true,
      areaStyle: type === 'line' ? {} : undefined,
      itemStyle: {
        color: theme.palette.primary.main
      }
    }]
  });

  const renderChart = (chartId, option) => (
    <Paper elevation={3} sx={paperStyle}>
      <ReactECharts
        option={option}
        style={chartStyle}
        ref={(e) => { if (e) chartRefs.current[chartId] = e; }}
        opts={{ renderer: 'svg' }}
        lazyUpdate={true}
      />
    </Paper>
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 64px)' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, color: theme.palette.text.primary }}>
      <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
        {t('dashboard:dashboard.title')}
      </Typography>
      <ReactGridLayout
        className="layout"
        layout={layout}
        cols={12}
        rowHeight={150}
        width={1200}  // 您可能需要調整這個值或使用動態寬度
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
      >
        <div key="cpu" style={{width: '100%', height: '100%'}}>
          <div className="drag-handle" style={{ cursor: 'move', padding: '5px', background: theme.palette.primary.main, color: theme.palette.primary.contrastText }}>CPU 使用率</div>
          {renderChart('cpu', getChartOption('CPU 使用率', systemMetrics.cpu))}
        </div>
        <div key="memory" style={{width: '100%', height: '100%'}}>
          <div className="drag-handle" style={{ cursor: 'move', padding: '5px', background: theme.palette.primary.main, color: theme.palette.primary.contrastText }}>內存使用率</div>
          {renderChart('memory', getChartOption('內存使用率', systemMetrics.memory))}
        </div>
        <div key="network" style={{width: '100%', height: '100%'}}>
          <div className="drag-handle" style={{ cursor: 'move', padding: '5px', background: theme.palette.primary.main, color: theme.palette.primary.contrastText }}>網絡使用率</div>
          {renderChart('network', getChartOption('網絡使用率', systemMetrics.network, 'bar'))}
        </div>
        <div key="storage" style={{width: '100%', height: '100%'}}>
          <div className="drag-handle" style={{ cursor: 'move', padding: '5px', background: theme.palette.primary.main, color: theme.palette.primary.contrastText }}>存儲使用率</div>
          {renderChart('storage', getChartOption('存儲使用率', [
            { value: systemMetrics.storage?.used, name: '已使用' },
            { value: systemMetrics.storage?.free, name: '可用' }
          ], 'pie'))}
        </div>
        <div key="podMetrics" style={{width: '100%', height: '100%'}}>
          <div className="drag-handle" style={{ cursor: 'move', padding: '5px', background: theme.palette.primary.main, color: theme.palette.primary.contrastText }}>Pod 指標</div>
          <Paper elevation={3} sx={paperStyle}>
            <FormControl fullWidth sx={{ mb: 1 }}>
              <InputLabel id="pod-select-label">選擇 Pod</InputLabel>
              <Select
                labelId="pod-select-label"
                value={selectedPod}
                label="選擇 Pod"
                onChange={handlePodChange}
              >
                {pods.map((pod) => (
                  <MenuItem key={pod.metadata.uid} value={pod.metadata.name}>
                    {pod.metadata.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {selectedPod && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {renderChart('podCpu', getChartOption('Pod CPU 使用率', podMetrics[selectedPod]?.cpu))}
                {renderChart('podMemory', getChartOption('Pod 內存使用率', podMetrics[selectedPod]?.memory))}
              </Box>
            )}
          </Paper>
        </div>
      </ReactGridLayout>
    </Box>
  );
};

export default Dashboard;
