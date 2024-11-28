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

  // 使用 state 來追蹤處理後的指標
  const [processedMetrics, setProcessedMetrics] = useState(null);

  // 當原始指標數據變化時處理數據
  useEffect(() => {
    logger.info('MetricsDisplay received raw metrics:', metrics);
    logger.info('Selected node:', selectedNode);

    if (!metrics) {
      logger.warn('No metrics data available');
      setProcessedMetrics(null);
      return;
    }

    // 檢查數據結構
    if (selectedNode === 'cluster') {
      if (!metrics.cluster) {
        logger.warn('No cluster metrics found in:', metrics);
        setProcessedMetrics(null);
        return;
      }
      logger.info('Processing cluster metrics:', metrics.cluster);
      setProcessedMetrics(metrics.cluster);
    } else {
      // 對於節點指標，直接檢查節點名稱
      if (!metrics[selectedNode]) {
        logger.warn(`No metrics found for node ${selectedNode} in:`, metrics);
        setProcessedMetrics(null);
        return;
      }
      logger.info(`Processing node metrics for ${selectedNode}:`, metrics[selectedNode]);
      setProcessedMetrics(metrics[selectedNode]);
    }
  }, [metrics, selectedNode]);

  const handleLayoutChange = useCallback((newLayout) => {
    setLayout(newLayout);
    localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(newLayout));
  }, []);

  // 添加更詳細的數據驗證
  const validateMetrics = (data) => {
    if (!data) return false;
    
    const hasValidCpu = Array.isArray(data.cpu) && data.cpu.length > 0;
    const hasValidMemory = Array.isArray(data.memory) && data.memory.length > 0;
    const hasValidNetwork = data.network && 
                          Array.isArray(data.network.tx) && 
                          Array.isArray(data.network.rx);
    const hasValidStorage = data.storage && 
                          typeof data.storage.total === 'number' && 
                          typeof data.storage.used === 'number';

    logger.info('Metrics validation result:', {
      hasValidCpu,
      hasValidMemory,
      hasValidNetwork,
      hasValidStorage,
      data
    });

    return hasValidCpu && hasValidMemory && hasValidNetwork && hasValidStorage;
  };

  // 如果沒有處理後的指標，顯示加載狀態
  if (!processedMetrics) {
    return (
      <Box sx={{ mt: 2 }}>
        <Typography>{t('dashboard:messages.noMetricsAvailable')}</Typography>
      </Box>
    );
  }

  // 驗證數據結構
  if (!validateMetrics(processedMetrics)) {
    logger.error('Invalid metrics structure:', processedMetrics);
    return (
      <Box sx={{ mt: 2 }}>
        <Typography color="error">
          {t('dashboard:messages.invalidMetricsFormat')}
        </Typography>
        <Typography variant="caption" color="textSecondary">
          {`Selected node: ${selectedNode}`}
        </Typography>
      </Box>
    );
  }

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
              processedMetrics.cpu,
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
              processedMetrics.memory,
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
            option={{
              tooltip: {
                trigger: 'axis',
                formatter: (params) => {
                  const time = new Date(params[0].axisValue).toLocaleTimeString();
                  return `${time}<br/>${params.map(param => 
                    `${param.seriesName}: ${(param.value / (1024 * 1024)).toFixed(2)} MB/s`
                  ).join('<br/>')}`;
                }
              },
              legend: {
                data: [t('dashboard:dashboard.networkTx'), t('dashboard:dashboard.networkRx')],
                bottom: 0
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
                data: processedMetrics.network?.tx.map(item => item.timestamp),
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
                  formatter: (value) => `${(value / (1024 * 1024)).toFixed(0)} MB/s`
                }
              },
              series: [
                {
                  name: t('dashboard:dashboard.networkTx'),
                  data: processedMetrics.network?.tx.map(item => item.value),
                  type: 'line',
                  smooth: true,
                  areaStyle: {
                    opacity: 0.3
                  },
                  itemStyle: {
                    color: '#ff6b6b'
                  }
                },
                {
                  name: t('dashboard:dashboard.networkRx'),
                  data: processedMetrics.network?.rx.map(item => item.value),
                  type: 'line',
                  smooth: true,
                  areaStyle: {
                    opacity: 0.3
                  },
                  itemStyle: {
                    color: '#4ecdc4'
                  }
                }
              ]
            }}
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
              processedMetrics.storage,
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

// 改進 memo 比較函數
export default React.memo(MetricsDisplay, (prevProps, nextProps) => {
  const hasMetricsChanged = JSON.stringify(prevProps.metrics) !== JSON.stringify(nextProps.metrics);
  const hasNodeChanged = prevProps.selectedNode !== nextProps.selectedNode;
  const hasRefreshingChanged = prevProps.refreshing !== nextProps.refreshing;

  logger.info('MetricsDisplay props comparison:', {
    hasMetricsChanged,
    hasNodeChanged,
    hasRefreshingChanged,
    prevNode: prevProps.selectedNode,
    nextNode: nextProps.selectedNode,
    prevMetricsKeys: Object.keys(prevProps.metrics || {}),
    nextMetricsKeys: Object.keys(nextProps.metrics || {}),
    selectedNodeMetrics: nextProps.metrics?.[nextProps.selectedNode]
  });

  return !hasMetricsChanged && !hasNodeChanged && !hasRefreshingChanged;
});
