import React, { useState } from 'react';
import { 
  Box, 
  TextField, 
  Button, 
  Typography, 
  Paper,
  ToggleButtonGroup,
  ToggleButton
} from '@mui/material';
import axios from 'axios';

const CommandExecutor = () => {
  const [command, setCommand] = useState('');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [commandType, setCommandType] = useState('kubectl');
  const [loading, setLoading] = useState(false);

  const handleCommandTypeChange = (event, newType) => {
    if (newType !== null) {
      setCommandType(newType);
      setCommand('');
      setResult('');
      setError('');
    }
  };

  const executeCommand = async () => {
    try {
      setLoading(true);
      setError('');
      setResult('');
      
      const endpoint = commandType === 'kubectl' ? '/api/k8s/execute' : '/api/helm/execute';
      const response = await axios.post(endpoint, {
        command
      });
      
      const output = response.data.stdout || response.data.stderr || '';
      setResult(typeof output === 'string' ? output : JSON.stringify(output, null, 2));
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <ToggleButtonGroup
        value={commandType}
        exclusive
        onChange={handleCommandTypeChange}
        sx={{ mb: 2 }}
      >
        <ToggleButton value="kubectl" disabled={loading}>
          kubectl
        </ToggleButton>
        <ToggleButton value="helm" disabled={loading}>
          helm
        </ToggleButton>
      </ToggleButtonGroup>

      <TextField
        fullWidth
        label={`輸入 ${commandType} 命令`}
        value={command}
        onChange={(e) => setCommand(e.target.value)}
        disabled={loading}
        sx={{ mb: 2 }}
      />
      <Button 
        variant="contained" 
        onClick={executeCommand}
        disabled={loading || !command.trim()}
        sx={{ mb: 2 }}
      >
        {loading ? '執行中...' : '執行'}
      </Button>
      
      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}
      
      {(result || loading) && (
        <Paper sx={{ p: 2, backgroundColor: 'grey.900', minHeight: '100px' }}>
          <Typography 
            component="pre"
            sx={{ 
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              color: 'common.white',
              fontFamily: 'monospace'
            }}
          >
            {loading ? '執行命令中...' : result}
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default CommandExecutor; 