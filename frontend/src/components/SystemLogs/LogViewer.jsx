import React, { useState, useEffect } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { Typography, Box, Paper, TextField } from '@mui/material';
import axios from 'axios';
import { useAppTranslation } from '../../hooks/useAppTranslation';

const LogViewer = () => {
  const { t } = useAppTranslation(['monitoring', 'common']);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const response = await axios.get('http://localhost:3001/logs', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const formattedLogs = response.data.map((log, index) => ({
        id: index,
        timestamp: log._source['@timestamp'],
        level: log._source.level,
        message: log._source.message,
        source: log._source.source,
      }));
      setLogs(formattedLogs);
      setLoading(false);
    } catch (error) {
      console.error('獲取日誌失敗:', error);
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log =>
    log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.source.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns = [
    { field: 'timestamp', headerName: t('monitoring:monitoring.logs.fields.timestamp'), width: 200 },
    { field: 'level', headerName: t('monitoring:monitoring.logs.fields.level'), width: 100 },
    { field: 'message', headerName: t('monitoring:monitoring.logs.fields.message'), width: 500 },
    { field: 'source', headerName: t('monitoring:monitoring.logs.fields.source'), width: 200 },
  ];

  return (
    <Box sx={{ height: 600, width: '100%' }}>
      <Typography variant="h4" gutterBottom>
        {t('monitoring:monitoring.logs.title')}
      </Typography>
      <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
        <TextField
          fullWidth
          label={t('monitoring:monitoring.logs.search')}
          variant="outlined"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </Paper>
      <DataGrid
        rows={filteredLogs}
        columns={columns}
        pageSize={10}
        rowsPerPageOptions={[10]}
        disableSelectionOnClick
        loading={loading}
      />
    </Box>
  );
};

export default LogViewer;
