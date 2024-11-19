import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Tabs, Tab, CircularProgress, IconButton, Tooltip, Paper, Alert } from '@mui/material';
import { useTranslation } from 'react-i18next';
import RefreshIcon from '@mui/icons-material/Refresh';
import MetricsDisplay from './MetricsDisplay';
import { useAppTranslation } from '../../hooks/useAppTranslation';
import { api } from '../../utils/api';

const REFRESH_INTERVAL = 30000; // 30 seconds

const SystemDashboard = () => {
  const [metrics, setMetrics] = useState(null);
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

  // 獲取節點列表
  const fetchNodes = useCallback(async () => {
    try {
      setError(null);
      console.log('Fetching nodes...');
      const data = await api.get('api/metrics/nodes');
      console.log('Fetched nodes data:', data);
      
      if (!Array.isArray(data)) {
        throw new Error('Invalid response format: expected array');
      }
      
      setNodes(['cluster', ...data.map(node => node.name)]);
    } catch (error) {
      console.error('獲取節點列表失敗:', error);
      setError(`獲取節點列表失敗: ${error.message}`);
      setNodes(['cluster']);
    }
  }, []);

  // 獲取指標數據
  const fetchMetrics = useCallback(async () => {
    if (!selectedNode) return;

    try {
      setLoading(true);
      setError(null);
      
      const endpoint = selectedNode === 'cluster' 
        ? 'api/metrics/system'
        : `api/metrics/system/node/${selectedNode}`;

      console.log('Fetching metrics...', endpoint);
      const data = await api.get(endpoint);
      console.log('Fetched metrics data:', data);
      
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response format: expected object');
      }
      
      setMetrics(data);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('獲取指標數據失敗:', error);
      setError(`獲取指標數據失敗: ${error.message}`);
      setMetrics(null);
    } finally {
      setLoading(false);
    }
  }, [selectedNode]);

  // 手動刷新
  const handleRefresh = useCallback(() => {
    console.log('Manual refresh triggered');
    fetchMetrics();
  }, [fetchMetrics]);

  // 設置自動刷新
  useEffect(() => {
    console.log('Setting up auto refresh, page visible:', isPageVisible);
    
    if (isPageVisible) {
      // 立即執行一次
      fetchMetrics();
      
      // 設置定時器
      refreshTimerRef.current = setInterval(() => {
        console.log('Auto refresh triggered');
        fetchMetrics();
      }, REFRESH_INTERVAL);

      return () => {
        if (refreshTimerRef.current) {
          console.log('Clearing refresh timer');
          clearInterval(refreshTimerRef.current);
        }
      };
    } else {
      // 頁面不可見時清除定時器
      if (refreshTimerRef.current) {
        console.log('Clearing refresh timer due to page invisibility');
        clearInterval(refreshTimerRef.current);
      }
    }
  }, [fetchMetrics, isPageVisible]);

  // 初始化加載
  useEffect(() => {
    fetchNodes();
  }, [fetchNodes]);

  // 當選擇的節點改變時更新指標
  useEffect(() => {
    if (selectedNode) {
      fetchMetrics();
    }
  }, [selectedNode, fetchMetrics]);

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
            <MetricsDisplay metrics={metrics} selectedNode={selectedNode} />
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default SystemDashboard;
