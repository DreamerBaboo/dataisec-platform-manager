import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Tabs, Tab, CircularProgress, IconButton, Tooltip, Paper, Alert } from '@mui/material';
import { useTranslation } from 'react-i18next';
import RefreshIcon from '@mui/icons-material/Refresh';
import MetricsDisplay from './MetricsDisplay';
import { useAppTranslation } from '../../hooks/useAppTranslation';
import { api } from '../../utils/api';
import { logger } from '../../utils/logger.ts';  // 使用命名導出

const REFRESH_INTERVAL = 60000; // 60 seconds

// 添加重試配置
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000;

const SystemDashboard = () => {
  const [metrics, setMetrics] = useState({
    cluster: null,
    nodes: {}
  });
  const [nodes, setNodes] = useState([]);
  const [selectedNode, setSelectedNode] = useState('cluster');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const refreshTimerRef = useRef(null);
  const { t } = useAppTranslation();
  const [error, setError] = useState(null);

  // 檢查頁面是否活躍
  const usePageVisibility = () => {
    const [isVisible, setIsVisible] = useState(!document.hidden);

    useEffect(() => {
      const handleVisibilityChange = () => {
        setIsVisible(!document.hidden);
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }, []);

    return isVisible;
  };

  const isPageVisible = usePageVisibility();

  // 添加重試邏輯的輔助函數
  const retryOperation = async (operation, attempts = RETRY_ATTEMPTS) => {
    for (let i = 0; i < attempts; i++) {
      try {
        return await operation();
      } catch (error) {
        if (i === attempts - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      }
    }
  };

  // 獲取節點列表
  const fetchNodes = useCallback(async () => {
    try {
      setError(null);
      logger.info('Starting node list retrieval...');
      
      const data = await retryOperation(async () => {
        logger.info('Making API request to fetch nodes...');
        const nodes = await api.get('api/k8s/nodes');
        logger.info('Response data:', nodes);
        
        if (!Array.isArray(nodes)) {
          logger.error('Invalid response format:', nodes);
          throw new Error('Invalid response format: expected array of nodes');
        }
        
        return nodes;
      });

      logger.info('Raw node data received:', data);
      const nodeNames = data.map(node => node.name).filter(Boolean);
      logger.info('Processed node names:', nodeNames);
      
      const allNodes = ['cluster', ...nodeNames];
      logger.info('Final node list (including cluster):', allNodes);
      setNodes(allNodes);
      
      // 如果當前選擇的節點不在新的節點列表中，切換到 cluster
      if (selectedNode !== 'cluster' && !nodeNames.includes(selectedNode)) {
        logger.warn(`Selected node ${selectedNode} no longer exists, switching to cluster view`);
        setSelectedNode('cluster');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      logger.error('Node list retrieval failed:', errorMessage);
      console.error('獲取節點列表失敗:', error);
      setError(`獲取節點列表失敗: ${errorMessage}`);
      setNodes(['cluster']);
      setSelectedNode('cluster');
    }
  }, [selectedNode]);

  // 更新獲取指標數據的函數
  const fetchMetrics = useCallback(async () => {
    if (!selectedNode) return;

    try {
      setRefreshing(true);
      setError(null);
      
      const endpoint = selectedNode === 'cluster' 
        ? 'api/metrics/system'
        : `api/metrics/system/node/${selectedNode}`;

      const metricsData = await retryOperation(async () => {
        const response = await api.get(endpoint);
        if (!response) {
          throw new Error('No response received from server');
        }
        return response;
      });

      setMetrics(prev => ({
        ...prev,
        [selectedNode === 'cluster' ? 'cluster' : 'nodes']: selectedNode === 'cluster' 
          ? metricsData 
          : { ...prev.nodes, [selectedNode]: metricsData[selectedNode] }
      }));

      setLastUpdate(new Date());
    } catch (error) {
      console.error('獲取指標數據失敗:', error);
      const errorMessage = error.response?.data?.message || error.message;
      setError(`獲取指標數據失敗: ${errorMessage}`);
    } finally {
      setRefreshing(false);
      if (loading) setLoading(false);
    }
  }, [selectedNode, loading]);

  // 更新自動刷新邏輯
  useEffect(() => {
    const refreshData = async () => {
      try {
        await fetchNodes();
        await fetchMetrics();
      } catch (error) {
        logger.error('Auto refresh failed:', error);
      }
    };
    
    if (isPageVisible) {
      refreshData();
      refreshTimerRef.current = setInterval(refreshData, REFRESH_INTERVAL);

      return () => {
        if (refreshTimerRef.current) {
          clearInterval(refreshTimerRef.current);
          refreshTimerRef.current = null;
        }
      };
    } else {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    }
  }, [isPageVisible, fetchNodes, fetchMetrics]);

  // 更新手動刷新函數
  const handleRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await fetchNodes();
      await fetchMetrics();
    } catch (error) {
      logger.error('Manual refresh failed:', error);
      const errorMessage = error.response?.data?.message || error.message;
      setError(`刷新失敗: ${errorMessage}`);
    } finally {
      setRefreshing(false);
    }
  }, [fetchNodes, fetchMetrics]);

  // 獲取當前選擇節點的指標數據
  const getCurrentMetrics = useCallback(() => {
    if (selectedNode === 'cluster') {
      return metrics.cluster;
    }
    return metrics.nodes[selectedNode];
  }, [selectedNode, metrics]);

  return (
    <Box sx={{ width: '94vw', height: '100%' }}>
      <Paper sx={{ width: '100%', height: '100%', p: 0 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          p: 2,
          borderBottom: 1,
          borderColor: 'divider'
        }}>
          <Box sx={{ flex: 1 }}>
            <Tabs
              value={selectedNode}
              onChange={(e, newValue) => setSelectedNode(newValue)}
              variant="scrollable"
              scrollButtons="auto"
            >
              {nodes.map((node) => (
                <Tab
                  key={node}
                  value={node}
                  label={node === 'cluster' ? t('dashboard:common.cluster') : node}
                />
              ))}
            </Tabs>
          </Box>
          
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            ml: 2,
            minWidth: 'fit-content' 
          }}>
            {lastUpdate && (
              <Box sx={{ 
                mr: 2, 
                fontSize: '0.875rem', 
                color: 'text.secondary',
                whiteSpace: 'nowrap'
              }}>
                {t('dashboard:common.lastUpdate')}: {lastUpdate.toLocaleTimeString()}
              </Box>
            )}
            <Tooltip title={t('common:common.refresh')}>
              <span>
                <IconButton 
                  onClick={handleRefresh}
                  disabled={refreshing}
                  size="small"
                  sx={{ ml: 1 }}
                >
                  <RefreshIcon sx={{ 
                    animation: refreshing ? 'spin 1s linear infinite' : 'none',
                    '@keyframes spin': {
                      '0%': { transform: 'rotate(0deg)' },
                      '100%': { transform: 'rotate(360deg)' }
                    }
                  }} />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ p: 2 }}>
            <MetricsDisplay 
              metrics={getCurrentMetrics()} 
              selectedNode={selectedNode} 
              refreshing={refreshing}
            />
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default SystemDashboard;
