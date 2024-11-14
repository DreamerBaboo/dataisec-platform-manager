import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  List, 
  ListItem, 
  ListItemIcon,
  Typography,
  Paper 
} from '@mui/material';
import { CheckCircle, Error, HourglassEmpty, PlayArrow } from '@mui/icons-material';
import axios from 'axios';

const CommandExecutor = ({ name, version }) => {
  const [commands, setCommands] = useState([]);
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCommands = async () => {
      try {
        setIsLoading(true);
        console.log('🚀 開始獲取命令列表:', { name, version });
        
        const response = await axios.get('http://localhost:3001/api/commands', {
          params: { name, version }
        });
        
        console.log('📥 收到命令列表:', response.data);
        console.log('📂 部署配置:', {
          deploymentName: name,
          version: version,
          commandCount: response.data.length
        });

        setCommands(response.data);
        setResults(response.data.map(() => ({ status: 'pending', output: '' })));
        setError('');
      } catch (error) {
        console.error('❌ 獲取命令失敗:', error);
        console.error('錯誤詳情:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status
        });
        setError(error.response?.data?.details || error.message);
      } finally {
        setIsLoading(false);
        console.log('🏁 命令獲取流程結束');
      }
    };

    if (name && version) {
      console.log('🔄 檢測到 name 和 version 更新，重新獲取命令');
      fetchCommands();
    }
  }, [name, version]);

  const executeCommands = async () => {
    console.log('▶️ 開始執行命令序列');
    
    for (let i = 0; i < commands.length; i++) {
      const { command, title } = commands[i];
      
      console.log(`⚡ 執行第 ${i + 1}/${commands.length} 個命令:`, {
        title,
        command
      });
      
      // 更新當前命令狀態為執行中
      setResults(prev => {
        const newResults = [...prev];
        newResults[i] = { status: 'running', output: '' };
        return newResults;
      });

      try {
        console.log('📡 發送命令到後端');
        const response = await axios.post('http://localhost:3001/api/execute', { command });
        
        console.log('✅ 命令執行成功:', {
          command,
          output: response.data.output
        });
        
        // 更新命令執行結果
        setResults(prev => {
          const newResults = [...prev];
          newResults[i] = { 
            status: 'success', 
            output: response.data.output 
          };
          return newResults;
        });
      } catch (error) {
        console.error('❌ 命令執行失敗:', {
          command,
          error: error.message,
          response: error.response?.data
        });
        
        // 更新錯誤狀態
        setResults(prev => {
          const newResults = [...prev];
          newResults[i] = { 
            status: 'error', 
            output: error.response?.data?.error || error.message 
          };
          return newResults;
        });
        break;
      }
    }
    
    console.log('🏁 命令序列執行完成');
  };

  if (isLoading) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography>載入命令中...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2, color: 'error.main' }}>
        <Typography>錯誤: {error}</Typography>
      </Box>
    );
  }

  return (
    <Paper elevation={2} sx={{ p: 2, m: 2 }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          部署命令執行器
        </Typography>
        <Button 
          variant="contained" 
          color="primary"
          startIcon={<PlayArrow />}
          onClick={executeCommands} 
          disabled={commands.length === 0}
          sx={{ mb: 2 }}
        >
          執行所有命令
        </Button>
      </Box>

      {commands.length > 0 ? (
        <List sx={{ width: '100%' }}>
          {commands.map((cmd, index) => (
            <ListItem 
              key={index}
              sx={{ 
                flexDirection: 'column', 
                alignItems: 'flex-start',
                mb: 2,
                bgcolor: 'background.paper',
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'divider'
              }}
            >
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                width: '100%',
                mb: 1 
              }}>
                <ListItemIcon sx={{ minWidth: 40 }}>
                  {results[index]?.status === 'success' && <CheckCircle color="success" />}
                  {results[index]?.status === 'error' && <Error color="error" />}
                  {results[index]?.status === 'running' && <HourglassEmpty color="primary" />}
                  {results[index]?.status === 'pending' && <HourglassEmpty color="disabled" />}
                </ListItemIcon>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                  {cmd.title}
                </Typography>
              </Box>
              
              <Box sx={{ pl: 5, width: '100%' }}>
                <Box 
                  component="pre" 
                  sx={{ 
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    p: 1,
                    bgcolor: 'grey.100',
                    borderRadius: 1,
                    fontSize: '0.875rem',
                    width: '100%'
                  }}
                >
                  <Typography component="code" sx={{ display: 'block' }}>
                    {cmd.command}
                  </Typography>
                  {results[index]?.output && (
                    <Typography 
                      component="code" 
                      sx={{ 
                        display: 'block',
                        mt: 1,
                        pt: 1,
                        borderTop: '1px dashed',
                        borderColor: 'divider',
                        color: results[index].status === 'error' ? 'error.main' : 'success.main'
                      }}
                    >
                      {results[index].output}
                    </Typography>
                  )}
                </Box>
              </Box>
            </ListItem>
          ))}
        </List>
      ) : (
        <Typography color="text.secondary" sx={{ textAlign: 'center' }}>
          沒有可執行的命令
        </Typography>
      )}
    </Paper>
  );
};

export default CommandExecutor;