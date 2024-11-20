import React, { useState, useCallback } from 'react';
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

const MetricsDisplay = ({ metrics, selectedNode }) => {
  const { t } = useAppTranslation();
  const [layout, setLayout] = useState(() => {
    // 從 localStorage 讀取保存的布局，如果沒有則使用默認布局
    const savedLayout = localStorage.getItem(LAYOUT_STORAGE_KEY);
    return savedLayout ? JSON.parse(savedLayout) : DEFAULT_LAYOUT;
  });

  // 當布局改變時保存到 localStorage
  const handleLayoutChange = useCallback((newLayout) => {
    setLayout(newLayout);
    localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(newLayout));
  }, []);

  // 格式化數值的輔助函數
  const formatValue = (value, type) => {
    switch (type) {
      case 'percentage':
        return `${value.toFixed(2)}%`;
      case 'bytes':
        return formatBytes(value);
      case 'bytesPerSecond':
        return `${formatBytes(value)}/s`;
      case 'cores':
        return `${value.toFixed(1)} cores`;
      case 'gigabytes':  // 新增的 case
        return `${formatBytes(value)}`;
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

  if (!metrics || !metrics[selectedNode]) {
    return (
      <Box sx={{ mt: 2 }}>
        <Typography>{t('dashboard:messages.noMetricsAvailable')}</Typography>
      </Box>
    );
  }

  const nodeMetrics = metrics[selectedNode];

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
      {['cpu', 'memory', 'network', 'storage'].map(metricType => (
        <div key={metricType}>
          <Paper 
            sx={{ 
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
            elevation={2}
          >
            <Box className="drag-handle" sx={{ 
              p: 1.5,
              cursor: 'move',
              borderBottom: 1,
              borderColor: 'divider',
              bgcolor: (theme) => theme.palette.mode === 'dark' 
                ? 'grey.800' 
                : 'grey.100',
              minHeight: '40px'
            }}>
              <Typography variant="subtitle1" fontWeight="medium">
                {t('dashboard:dashboard.resources.' + `${metricType}Usage`)}
              </Typography>
            </Box>
            <Box sx={{ 
              flex: 1, 
              p: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column'
            }}>
              <ReactECharts
                option={getChartOption(
                  metricType === 'network' ? nodeMetrics?.network?.rx : nodeMetrics?.[metricType],
                  '',
                  metricType === 'storage' ? 'pie' : 'line',
                  {
                    valueType: metricType === 'network' ? 'bytesPerSecond' : 
                             metricType === 'memory' ? 'gigabytes' :
                             metricType === 'cpu' ? 'cores' : 'percentage',
                    seriesName: metricType === 'network' ? t('dashboard:dashboard.network.receive') : t('dashboard:dashboard.resources.' + `${metricType}Usage`)
                  }
                )}
                style={{ 
                  height: '100%',
                  minHeight: '200px',
                  width: '100%'
                }}
                opts={{ 
                  renderer: 'canvas',
                  devicePixelRatio: window.devicePixelRatio,
                  width: 'auto',
                  height: 'auto'
                }}
              />
            </Box>
          </Paper>
        </div>
      ))}
    </ReactGridLayout>
  );
};

// 使用 memo 並添加自定義比較函數
export default React.memo(MetricsDisplay, (prevProps, nextProps) => {
  return JSON.stringify(prevProps.metrics) === JSON.stringify(nextProps.metrics) &&
         prevProps.selectedNode === nextProps.selectedNode;
});
