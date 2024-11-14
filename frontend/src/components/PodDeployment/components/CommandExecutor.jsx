import React, { useState } from 'react';
import { Box, TextField, Button, Typography, Paper } from '@mui/material';
import axios from 'axios';

const CommandExecutor = () => {
  const [command, setCommand] = useState('');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  const executeCommand = async () => {
    try {
      setError('');
      const response = await axios.post('/api/helm/execute', {
        command
      });
      setResult(response.data.stdout || response.data.stderr);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <TextField
        fullWidth
        label="輸入命令"
        value={command}
        onChange={(e) => setCommand(e.target.value)}
        sx={{ mb: 2 }}
      />
      <Button 
        variant="contained" 
        onClick={executeCommand}
        sx={{ mb: 2 }}
      >
        執行
      </Button>
      
      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}
      
      {result && (
        <Paper sx={{ p: 2, backgroundColor: 'grey.900' }}>
          <Typography 
            component="pre"
            sx={{ 
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              color: 'common.white'
            }}
          >
            {result}
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default CommandExecutor;
