import React, { useState, useCallback, useEffect } from 'react';
import { Grid, Paper, Typography, Box } from '@mui/material';
import ReactECharts from 'echarts-for-react';
import RGL, { WidthProvider } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { useAppTranslation } from '../../hooks/useAppTranslation';
const ReactGridLayout = WidthProvider(RGL);
import { logger } from '../../utils/logger.ts'; // 導入 logger

const DEFAULT_LAYOUT = [
  { i: 'cpu', x: 0, y: 0, w: 6, h: 8, minW: 4, minH: 6 },
  { i: 'memory', x: 6, y: 0, w: 6, h: 8, minW: 4, minH: 6 },
  { i: 'network', x: 0, y: 8, w: 6, h: 8, minW: 4, minH: 6 },
  { i: 'storage', x: 6, y: 8, w: 6, h: 8, minW: 4, minH: 6 }
];

const LAYOUT_STORAGE_KEY = 'metrics-dashboard-layout';

const MetricsDisplay = ({ metrics, selectedNode, refreshing }) => {
  const { t } = useAppTranslation();
  const [layout, setLayout] = useState(() => {
    const savedLayout = localStorage.getItem(LAYOUT_STORAGE_KEY);
    return savedLayout ? JSON.parse(savedLayout) : DEFAULT_LAYOUT;
  });

  useEffect(() => {
    logger.info('MetricsDisplay received metrics:', metrics);
    logger.info('Selected node:', selectedNode);
  }, [metrics, selectedNode]);

  const handleLayoutChange = useCallback((newLayout) => {
    setLayout(newLayout);
    localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(newLayout));
  }, []);

  // Get the correct metrics based on selected node
  const getCurrentMetrics = useCallback(() => {
    if (!metrics) {
      logger.warn('No metrics data available');
      return null;
    }

    if (selectedNode === 'cluster') {
      logger.info('Getting cluster metrics:', metrics.cluster);
      return metrics.cluster;
    }

    logger.info('Getting node metrics:', metrics.nodes?.[selectedNode]);
    return metrics.nodes?.[selectedNode];
  }, [metrics, selectedNode]);

  const currentMetrics = getCurrentMetrics();

  if (!currentMetrics) {
    logger.warn('No metrics available for display');
    return (
      <Box sx={{ mt: 2 }}>
        <Typography>{t('dashboard:messages.noMetricsAvailable')}</Typography>
      </Box>
    );
  }

  logger.info('Rendering metrics:', {
    cpu: currentMetrics.cpu?.length,
    memory: currentMetrics.memory?.length,
    network: {
      tx: currentMetrics.network?.tx?.length,
      rx: currentMetrics.network?.rx?.length
    },
    storage: currentMetrics.storage
  });

  const formatValue = (value, type) => {
    if (value === undefined || value === null) return 'N/A';
    
    switch (type) {
      case 'percentage':
        return `${value.toFixed(2)}%`;
      case 'bytes':
        return formatBytes(value);
      case 'bytesPerSecond':
        return `${formatBytes(value)}/s`;
      case 'cores':
        return `${value.toFixed(1)} cores`;
      case 'gigabytes':
        return `${formatBytes(value * 1024 * 1024 * 1024)}`;
      default:
        return value.toString();
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const getChartOption = (data, title, type = 'line', options = {}) => {
    if (!data || (!Array.isArray(data) && type !== 'pie')) {
      return {
        xAxis: { type: 'category', data: [] },
        yAxis: { type: 'value' },
        series: [{ data: [], type }]
      };
    }

    if (type === 'pie') {
      const usedValue = data.used || 0;
      const totalValue = data.total || 0;
      const freeValue = totalValue - usedValue;
      const usedPercentage = ((usedValue / totalValue) * 100).toFixed(1);

      return {
        tooltip: {
          trigger: 'item',
          formatter: (params) => {
            const value = (params.value / (1024 * 1024 * 1024)).toFixed(2);
            const percentage = ((params.value / totalValue) * 100).toFixed(1);
            return `${params.name}<br/>${value} GB (${percentage}%)`;
          }
        },
        legend: {
          orient: 'horizontal',
          bottom: 'bottom',
          data: [
            `${t('dashboard:dashboard.resources.used')} (${usedPercentage}%)`,
            t('dashboard:dashboard.resources.free')
          ]
        },
        series: [{
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: true,
          itemStyle: {
            borderRadius: 10,
            borderColor: '#fff',
            borderWidth: 2
          },
          label: {
            show: true,
            formatter: (params) => {
              const gbValue = (params.value / (1024 * 1024 * 1024)).toFixed(2);
              return `${gbValue} GB`;
            }
          },
          data: [
            { 
              value: usedValue, 
              name: `${t('dashboard:dashboard.resources.used')} (${usedPercentage}%)`,
              itemStyle: { color: '#ff6b6b' }
            },
            { 
              value: freeValue, 
              name: t('dashboard:dashboard.resources.free'),
              itemStyle: { color: '#4ecdc4' }
            }
          ]
        }]
      };
    }

    // Line chart options
    const isNetwork = options.valueType === 'bytesPerSecond';
    const isMemory = options.valueType === 'gigabytes';
    const isCPU = options.valueType === 'cores';

    return {
      tooltip: {
        trigger: 'axis',
        formatter: (params) => {
          const time = new Date(params[0].axisValue).toLocaleTimeString();
          let value;
          if (isNetwork) {
            value = `${(params[0].value / (1024 * 1024)).toFixed(2)} MB/s`;
          } else if (isMemory) {
            value = `${(params[0].value / (1024 * 1024 * 1024)).toFixed(2)} GB`;
          } else if (isCPU) {
            value = `${params[0].value.toFixed(2)} cores`;
          } else {
            value = `${params[0].value.toFixed(2)}%`;
          }
          return `${time}<br/>${params[0].seriesName}: ${value}`;
        }
      },
      grid: {
        top: 60,
        left: '10%',
        right: '10%',
        bottom: 60,
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: data.map(item => item.timestamp),
        axisLabel: {
          formatter: (value) => new Date(value).toLocaleTimeString(),
          rotate: 45,
          margin: 15,
          align: 'right',
          fontSize: 11
        }
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: (value) => {
            if (isNetwork) {
              return `${(value / (1024 * 1024)).toFixed(0)} MB/s`;
            } else if (isMemory) {
              return `${(value / (1024 * 1024 * 1024)).toFixed(0)} GB`;
            } else if (isCPU) {
              return `${value.toFixed(0)} cores`;
            }
            return `${value.toFixed(0)}%`;
          }
        },
        max: isCPU ? (data[0]?.total || undefined) : undefined,  // 設置 CPU 圖表的最大值為總核心數
        min: 0
      },
      series: [{
        name: options.seriesName || title,
        data: data.map(item => item.value),
        type: type,
        smooth: true,
        areaStyle: {
          opacity: 0.3
        },
        markPoint: {
          symbol: 'pin',
          symbolSize: 35,
          emphasis: {
            scale: 1.3,
            itemStyle: {
              shadowBlur: 10,
              shadowColor: 'rgba(0,0,0,0.3)'
            },
            label: {
              fontSize: 12
            }
          },
          label: {
            formatter: (params) => {
              if (isNetwork) {
                return `${(params.value / (1024 * 1024)).toFixed(2)} MB/s`;
              } else if (isMemory) {
                return `${(params.value / (1024 * 1024 * 1024)).toFixed(2)} GB`;
              } else if (isCPU) {
                return `${params.value.toFixed(2)} cores`;
              }
              return `${params.value.toFixed(2)}%`;
            }
          },
          data: [
            { 
              type: 'max', 
              name: t('maximum'),
              label: {
                position: 'insideTop',
                distance: 5
              }
            },
            { 
              type: 'min', 
              name: t('minimum'),
              label: {
                position: 'insideBottom',
                distance: 5
              }
            }
          ]
        },
        markLine: {
          silent: true,
          symbol: ['none', 'none'],
          lineStyle: {
            color: (theme) => theme.palette.mode === 'dark' 
              ? 'rgba(255,255,255,0.3)' 
              : 'rgba(0,0,0,0.2)',
            type: 'dashed'
          },
          label: {
            color: (theme) => theme.palette.mode === 'dark'
              ? 'rgba(255,255,255,0.7)'
              : 'rgba(0,0,0,0.7)',
            formatter: (params) => {
              if (isNetwork) {
                return `${(params.value / (1024 * 1024)).toFixed(0)} MB/s`;
              } else if (isMemory) {
                return `${(params.value / (1024 * 1024 * 1024)).toFixed(0)} GB`;
              } else if (isCPU) {
                return `${params.value.toFixed(0)} cores`;
              }
              return `${params.value.toFixed(0)}%`;
            }
          },
          data: [
            { 
              type: 'average', 
              name: t('average'),
              label: {
                position: 'end'
              }
            }
          ]
        }
      }]
    };
  };

  return (
    <ReactGridLayout
      className="layout"
      layout={layout}
      cols={12}
      rowHeight={30}
      onLayoutChange={handleLayoutChange}
      draggableHandle=".drag-handle"
      margin={[16, 16]}
      containerPadding={[0, 0]}
      isResizable={true}
      isDraggable={true}
    >
      <Box key="cpu" sx={{ p: 2 }}>
        <Paper sx={{ p: 2, height: '100%' }}>
          <Box className="drag-handle" sx={{ cursor: 'move', mb: 2 }}>
            <Typography variant="h6">{t('dashboard:dashboard.cpu')}</Typography>
          </Box>
          <ReactECharts
            option={getChartOption(
              currentMetrics.cpu,
              t('dashboard:dashboard.cpu'),
              'line',
              { valueType: 'cores', seriesName: t('dashboard:dashboard.cpuUsage') }
            )}
            style={{ height: '90%', width: '100%' }}
            opts={{ renderer: 'svg' }}
          />
        </Paper>
      </Box>

      <Box key="memory" sx={{ p: 2 }}>
        <Paper sx={{ p: 2, height: '100%' }}>
          <Box className="drag-handle" sx={{ cursor: 'move', mb: 2 }}>
            <Typography variant="h6">{t('dashboard:dashboard.memory')}</Typography>
          </Box>
          <ReactECharts
            option={getChartOption(
              currentMetrics.memory,
              t('dashboard:dashboard.memory'),
              'line',
              { valueType: 'gigabytes', seriesName: t('dashboard:dashboard.memoryUsage') }
            )}
            style={{ height: '90%', width: '100%' }}
            opts={{ renderer: 'svg' }}
          />
        </Paper>
      </Box>

      <Box key="network" sx={{ p: 2 }}>
        <Paper sx={{ p: 2, height: '100%' }}>
          <Box className="drag-handle" sx={{ cursor: 'move', mb: 2 }}>
            <Typography variant="h6">{t('dashboard:dashboard.network')}</Typography>
          </Box>
          <ReactECharts
            option={getChartOption(
              currentMetrics.network?.tx,
              t('dashboard:dashboard.network'),
              'line',
              { valueType: 'bytesPerSecond', seriesName: t('dashboard:dashboard.networkTx') }
            )}
            style={{ height: '90%', width: '100%' }}
            opts={{ renderer: 'svg' }}
          />
        </Paper>
      </Box>

      <Box key="storage" sx={{ p: 2 }}>
        <Paper sx={{ p: 2, height: '100%' }}>
          <Box className="drag-handle" sx={{ cursor: 'move', mb: 2 }}>
            <Typography variant="h6">{t('dashboard:dashboard.storage')}</Typography>
          </Box>
          <ReactECharts
            option={getChartOption(
              currentMetrics.storage,
              t('dashboard:dashboard.storage'),
              'pie'
            )}
            style={{ height: '90%', width: '100%' }}
            opts={{ renderer: 'svg' }}
          />
        </Paper>
      </Box>
    </ReactGridLayout>
  );
};

// 使用 memo 並添加自定義比較函數
export default React.memo(MetricsDisplay, (prevProps, nextProps) => {
  return JSON.stringify(prevProps.metrics) === JSON.stringify(nextProps.metrics) &&
         prevProps.selectedNode === nextProps.selectedNode;
});
