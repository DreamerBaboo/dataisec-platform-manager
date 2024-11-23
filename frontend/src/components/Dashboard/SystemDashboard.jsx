import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Tabs, Tab, CircularProgress, IconButton, Tooltip, Paper, Alert } from '@mui/material';
import { useTranslation } from 'react-i18next';
import RefreshIcon from '@mui/icons-material/Refresh';
import MetricsDisplay from './MetricsDisplay';
import { useAppTranslation } from '../../hooks/useAppTranslation';
import { api } from '../../utils/api';
import { logger } from '../../utils/logger.ts';  // 使用命名導出

const REFRESH_INTERVAL = 30000; // 30 seconds

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

  // 更新獲取節點列表的函數
  const fetchNodes = useCallback(async () => {
    try {
      setError(null);
      logger.info('Starting node list retrieval...');
      
      const data = await retryOperation(async () => {
        logger.info('Making API request to fetch nodes...');
        const response = await api.get('api/metrics/nodes');
        if (!response || !response.data || !Array.isArray(response.data)) {
          logger.error('Invalid response format:', response);
          throw new Error('Invalid response format: expected array in data field');
        }
        return response.data;
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
      setLoading(true);
      setError(null);
      
      const endpoint = selectedNode === 'cluster' 
        ? 'api/metrics/system'
        : `api/metrics/system/node/${selectedNode}`;

      const metricsData = await retryOperation(async () => {
        const response = await api.get(endpoint);
        if (!response || !response.data) {
          throw new Error('Invalid metrics response format');
        }

        // Validate metrics data structure
        const data = response.data;
        const metrics = selectedNode === 'cluster' ? data.cluster : data[selectedNode];
        
        if (!metrics || typeof metrics !== 'object') {
          throw new Error('Invalid metrics data structure');
        }

        // Validate required metric types exist
        const requiredMetrics = ['cpu', 'memory', 'network', 'storage'];
        const missingMetrics = requiredMetrics.filter(metric => !metrics[metric]);
        
        if (missingMetrics.length > 0) {
          logger.warn(`Missing metrics for ${selectedNode}:`, missingMetrics);
        }

        return data;
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
      
      // Keep existing metrics data but mark the failed node as null
      if (selectedNode === 'cluster') {
        setMetrics(prev => ({ ...prev, cluster: null }));
      } else {
        setMetrics(prev => ({
          ...prev,
          nodes: { ...prev.nodes, [selectedNode]: null }
        }));
      }
    } finally {
      setLoading(false);
    }
  }, [selectedNode]);

  // 更新自動刷新邏輯
  useEffect(() => {
    logger.info('Setting up auto refresh, page visible:', isPageVisible);
    
    const refreshData = async () => {
      try {
        logger.info('Auto refresh triggered');
        await fetchNodes();  // 先更新節點列表
        await fetchMetrics(); // 然後更新指標數據
      } catch (error) {
        logger.error('Auto refresh failed:', error);
      }
    };
    
    if (isPageVisible) {
      // 立即執行一次完整刷新
      refreshData();
      
      // 設置定時器，每30秒刷新一次
      refreshTimerRef.current = setInterval(refreshData, REFRESH_INTERVAL);

      return () => {
        if (refreshTimerRef.current) {
          logger.info('Clearing refresh timer');
          clearInterval(refreshTimerRef.current);
          refreshTimerRef.current = null;
        }
      };
    } else {
      // 頁面不可見時清除定時器
      if (refreshTimerRef.current) {
        logger.info('Clearing refresh timer due to page invisibility');
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    }
  }, [fetchNodes, fetchMetrics, isPageVisible]);

  // 更新手動刷新函數
  const handleRefresh = useCallback(async () => {
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    logger.info('Manual refresh triggered');
    try {
      setLoading(true);
      await fetchNodes();  // 先更新節點列表
      await fetchMetrics(); // 然後更新指標數據

      // 重新設置自動刷新定時器
      if (isPageVisible) {
        refreshTimerRef.current = setInterval(async () => {
          await fetchNodes();
          await fetchMetrics();
        }, REFRESH_INTERVAL);
      }
    } catch (error) {
      logger.error('Manual refresh failed:', error);
      setError('Failed to refresh metrics');
    } finally {
      setLoading(false);
    }
  }, [fetchNodes, fetchMetrics, isPageVisible]);

  return (
    <Box sx={{ width: '100%', height: '100%', minWidth: '1182px' }}>
      <Paper sx={{ width: '100%', height: '100%' }}>
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
                  disabled={loading}
                  size="small"
                  sx={{ ml: 1 }}
                >
                  <RefreshIcon />
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
            <MetricsDisplay metrics={selectedNode === 'cluster' ? metrics.cluster : metrics.nodes[selectedNode]} selectedNode={selectedNode} />
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default SystemDashboard;
