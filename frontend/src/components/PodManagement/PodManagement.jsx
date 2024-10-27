import React, { useState, useEffect } from 'react';
import { Box, Typography, Tabs, Tab, Button } from '@mui/material';
import PodList from './PodList';
import PodForm from './PodForm';
import axios from 'axios';

function PodManagement() {
  const [tabValue, setTabValue] = useState(0);
  const [pods, setPods] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPods();
  }, []);

  const fetchPods = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:3001/pods', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setPods(response.data);
      setLoading(false);
    } catch (error) {
      console.error('獲取 Pod 列表失敗:', error);
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="h4" gutterBottom>
        Pod 管理
      </Typography>
      <Tabs value={tabValue} onChange={handleTabChange}>
        <Tab label="Pod 列表" />
        <Tab label="創建新 Pod" />
      </Tabs>
      <Box sx={{ mt: 2 }}>
        {tabValue === 0 && <PodList pods={pods} loading={loading} onRefresh={fetchPods} />}
        {tabValue === 1 && <PodForm onSubmit={fetchPods} />}
      </Box>
    </Box>
  );
}

export default PodManagement;
