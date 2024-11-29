import React, { useState, useCallback, useEffect } from 'react';
import { Grid, Paper, Typography, Box, CircularProgress } from '@mui/material';
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
  
  // 修改 useEffect，只在有新數據時更新
  useEffect(() => {
    logger.info('MetricsDisplay received raw metrics:', metrics);
    logger.info('Selected node:', selectedNode);

    if (!metrics) {
      // 只在首次載入時（processedMetrics 為 null）才清除數據
      if (!processedMetrics) {
        logger.warn('No metrics data available');
        setProcessedMetrics(null);
      }
      return;
    }

    // 檢查數據結構
    if (selectedNode === 'cluster') {
      if (!metrics.cluster) {
        logger.warn('No cluster metrics found in:', metrics);
        // 同樣，只在首次載入時才清除數據
        if (!processedMetrics) {
          setProcessedMetrics(null);
        }
        return;
      }
      logger.info('Processing cluster metrics:', metrics.cluster);
      setProcessedMetrics(metrics.cluster);
    } else {
      // 對於節點指標，直接檢查節點名稱
      if (!metrics[selectedNode]) {
        logger.warn(`No metrics found for node ${selectedNode} in:`, metrics);
        // 同樣，只在首次載入時才清除數據
        if (!processedMetrics) {
          setProcessedMetrics(null);
        }
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

  // 修改載入狀態的顯示邏輯
  if (!processedMetrics) {
    // 只在完全沒有數據時顯示載入狀態
    return (
      <Box 
        sx={{ 
          mt: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '400px'
        }}
      >
        <CircularProgress size={40} sx={{ mb: 2 }} />
        <Typography color="textSecondary">
          {t('dashboard:messages.loadingMetrics')}
        </Typography>
        <Typography variant="caption" color="textSecondary" sx={{ mt: 1 }}>
          {t('dashboard:messages.selectedNode', { node: selectedNode })}
        </Typography>
      </Box>
    );
  }

  // 如果正在刷新，顯示一個小的載入指示器，但保持圖表顯示
  const refreshingIndicator = refreshing && (
    <Box 
      sx={{ 
        position: 'fixed',
        top: '70px',
        right: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        bgcolor: 'background.paper',
        p: 1,
        borderRadius: 1,
        boxShadow: 1,
        zIndex: 1000
      }}
    >
      <CircularProgress size={20} />
      <Typography variant="caption" color="textSecondary">
        {t('dashboard:messages.refreshingMetrics')}
      </Typography>
    </Box>
  );

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

  // 修改計算最大值的輔助函數
  const calculateMaxValue = (data, buffer = 1.25) => {
    if (!Array.isArray(data)) return 0;
    const maxValue = Math.max(...data.map(item => item.value));
    
    // 處理小數值的情況
    if (maxValue > 0 && maxValue < 1) {
      // 對於小於 1 的值，使用更小的刻度
      const scale = Math.ceil(-Math.log10(maxValue)); // 計算需要的小數位數
      const step = Math.pow(10, -scale); // 計算合適的步長
      return Math.ceil(maxValue * Math.pow(10, scale)) * step * buffer;
    }
    
    return maxValue * buffer;
  };

  // 分離圓餅圖的配置邏輯
  const getPieChartOption = (data) => {
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
  };

  // 修改 getChartOption 函數
  const getChartOption = (data, title, type = 'line', options = {}) => {
    if (!data) return {};

    // 如果是圓餅圖，使用專門的配置
    if (type === 'pie') {
      return getPieChartOption(data);
    }

    // 確保數據是數組
    if (!Array.isArray(data)) {
      console.error('Line chart data must be an array:', data);
      return {};
    }

    const isNetwork = options.valueType === 'bytesPerSecond';
    const isMemory = options.valueType === 'gigabytes';
    const isCPU = options.valueType === 'cores';

    // 計算 Y 軸最大值和最小值
    const yAxisMax = calculateMaxValue(data);
    const maxValue = Math.max(...data.map(item => item.value));
    
    // 根據數據範圍決定刻度間隔
    let interval;
    if (maxValue > 0 && maxValue < 1) {
      const scale = Math.ceil(-Math.log10(maxValue));
      interval = Math.pow(10, -scale) / 4; // 使用更細的刻度
    } else {
      interval = yAxisMax / 5; // 默認分5個刻度
    }

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
        left: '12%',
        right: '4%',
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
        max: yAxisMax,
        min: 0,
        interval: interval,
        minInterval: 0.0001,
        axisLabel: {
          formatter: (value) => {
            if (isNetwork) {
              return `${(value / (1024 * 1024)).toFixed(2)} MB/s`;
            } else if (isMemory) {
              return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`;
            } else if (isCPU) {
              return value < 1 ? `${value.toFixed(2)} cores` : `${value.toFixed(1)} cores`;
            }
            return `${value.toFixed(1)}%`;
          },
          margin: 16,
          padding: [0, 10, 0, 0],
          hideOverlap: true,
          rotate: 0,
        },
        splitLine: {
          show: true,
          lineStyle: {
            type: 'dashed',
            opacity: 0.3
          }
        },
        splitNumber: 5,
        axisTick: {
          show: true,
          alignWithLabel: true,
          length: 5,
        },
        nameGap: 35,
      },
      series: [{
        name: options.seriesName || title,
        data: data.map(item => item.value),
        type: 'line',
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

  // 添加網路相關的翻譯常量
  const NETWORK_TRANSLATIONS = {
    tx: {
      label: t('dashboard:dashboard.networkTx', 'Network TX'),
      tooltip: t('dashboard:dashboard.networkTxTooltip', 'Network Transmit Rate'),
    },
    rx: {
      label: t('dashboard:dashboard.networkRx', 'Network RX'),
      tooltip: t('dashboard:dashboard.networkRxTooltip', 'Network Receive Rate'),
    },
    bytesPerSecond: t('dashboard:dashboard.bytesPerSecond', 'MB/s'),
    networkTraffic: t('dashboard:dashboard.networkTraffic', 'Network Traffic'),
  };

  // 修改 getNetworkChartOption 函數
  const getNetworkChartOption = (networkData) => {
    if (!networkData) return {};

    // 計算發送和接收數據的最大值
    const txData = networkData?.tx?.map(item => item.value) || [];
    const rxData = networkData?.rx?.map(item => item.value) || [];
    const maxValue = Math.max(...txData, ...rxData);
    const yAxisMax = maxValue * 1.25;

    // 計算合適的刻度間隔
    let interval;
    if (maxValue > 0 && maxValue < 1024 * 1024) { // 小於 1MB
      interval = Math.pow(2, Math.floor(Math.log2(maxValue))) / 4;
    } else {
      interval = yAxisMax / 5;
    }

    return {
      tooltip: {
        trigger: 'axis',
        formatter: (params) => {
          const time = new Date(params[0].axisValue).toLocaleTimeString();
          return `${time}<br/>${params.map(param => {
            const value = (param.value / (1024 * 1024)).toFixed(2);
            const label = param.seriesName === NETWORK_TRANSLATIONS.tx.label 
              ? NETWORK_TRANSLATIONS.tx.tooltip 
              : NETWORK_TRANSLATIONS.rx.tooltip;
            return `${label}: ${value} ${NETWORK_TRANSLATIONS.bytesPerSecond}`;
          }).join('<br/>')}`;
        }
      },
      legend: {
        data: [NETWORK_TRANSLATIONS.tx.label, NETWORK_TRANSLATIONS.rx.label],
        bottom: 0
      },
      grid: {
        top: 30,
        left: '12%',
        right: '4%',
        bottom: 60,
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: networkData?.tx.map(item => item.timestamp),
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
        max: yAxisMax,
        min: 0,
        interval: interval,
        minInterval: 1024,
        axisLabel: {
          formatter: (value) => {
            const inMB = value / (1024 * 1024);
            if (inMB < 0.1) {
              return `${(value / 1024).toFixed(1)} KB/s`;
            }
            return `${inMB.toFixed(1)} MB/s`;
          },
          margin: 16,
          padding: [0, 10, 0, 0],
          hideOverlap: true,
          rotate: 0,
        },
        splitLine: {
          show: true,
          lineStyle: {
            type: 'dashed',
            opacity: 0.3
          }
        },
        splitNumber: 5,
        axisTick: {
          show: true,
          alignWithLabel: true,
          length: 5,
        },
        nameGap: 35,
      },
      series: [
        {
          name: NETWORK_TRANSLATIONS.tx.label,
          data: networkData?.tx.map(item => item.value),
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
          name: NETWORK_TRANSLATIONS.rx.label,
          data: networkData?.rx.map(item => item.value),
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
    };
  };

  // 添加所有圖表相關的翻譯常量
  const CHART_TRANSLATIONS = {
    cpu: {
      title: t('dashboard:dashboard.resources.cpu.title'),
      tooltip: t('dashboard:dashboard.resources.cpuUsage'),
      label: t('dashboard:dashboard.resources.cpu.used'),
      total: t('dashboard:dashboard.resources.cpu.total'),
      available: t('dashboard:dashboard.resources.cpu.available'),
      unit: 'cores'
    },
    memory: {
      title: t('dashboard:dashboard.resources.memory.title'),
      tooltip: t('dashboard:dashboard.resources.memoryUsage'),
      label: t('dashboard:dashboard.resources.memory.used'),
      total: t('dashboard:dashboard.resources.memory.total'),
      available: t('dashboard:dashboard.resources.memory.available'),
      unit: 'GB'
    },
    storage: {
      title: t('dashboard:dashboard.resources.storage.title'),
      used: t('dashboard:dashboard.resources.storage.used'),
      free: t('dashboard:dashboard.resources.storage.free'),
      total: t('dashboard:dashboard.resources.storage.total'),
      available: t('dashboard:dashboard.resources.storage.available')
    },
    common: {
      maximum: t('dashboard:common.maximum'),
      minimum: t('dashboard:common.minimum'),
      average: t('dashboard:common.average')
    }
  };

  return (
    <>
      {refreshingIndicator}
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
              <Typography variant="h6">{CHART_TRANSLATIONS.cpu.title}</Typography>
            </Box>
            <ReactECharts
              option={getChartOption(
                processedMetrics.cpu,
                CHART_TRANSLATIONS.cpu.title,
                'line',
                { valueType: 'cores', seriesName: CHART_TRANSLATIONS.cpu.tooltip }
              )}
              style={{ height: '90%', width: '100%' }}
              opts={{ renderer: 'svg' }}
            />
          </Paper>
        </Box>

        <Box key="memory" sx={{ p: 2 }}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Box className="drag-handle" sx={{ cursor: 'move', mb: 2 }}>
              <Typography variant="h6">{CHART_TRANSLATIONS.memory.title}</Typography>
            </Box>
            <ReactECharts
              option={getChartOption(
                processedMetrics.memory,
                CHART_TRANSLATIONS.memory.title,
                'line',
                { valueType: 'gigabytes', seriesName: CHART_TRANSLATIONS.memory.tooltip }
              )}
              style={{ height: '90%', width: '100%' }}
              opts={{ renderer: 'svg' }}
            />
          </Paper>
        </Box>

        <Box key="network" sx={{ p: 2 }}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Box className="drag-handle" sx={{ cursor: 'move', mb: 2 }}>
              <Typography variant="h6">{NETWORK_TRANSLATIONS.networkTraffic}</Typography>
            </Box>
            <ReactECharts
              option={getNetworkChartOption(processedMetrics.network)}
              style={{ height: '90%', width: '100%' }}
              opts={{ renderer: 'svg' }}
            />
          </Paper>
        </Box>

        <Box key="storage" sx={{ p: 2 }}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Box className="drag-handle" sx={{ cursor: 'move', mb: 2 }}>
              <Typography variant="h6">{CHART_TRANSLATIONS.storage.title}</Typography>
            </Box>
            <ReactECharts
              option={getChartOption(
                processedMetrics.storage,
                CHART_TRANSLATIONS.storage.title,
                'pie'
              )}
              style={{ height: '90%', width: '100%' }}
              opts={{ renderer: 'svg' }}
            />
          </Paper>
        </Box>
      </ReactGridLayout>
    </>
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
