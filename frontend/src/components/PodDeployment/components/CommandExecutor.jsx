import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  List, 
  ListItem, 
  ListItemIcon,
  Typography,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton
} from '@mui/material';
import { i18n } from '../../../i18n';
import { CheckCircle, Error, HourglassEmpty, PlayArrow, Close } from '@mui/icons-material';
import axios from 'axios';
import { useAppTranslation } from '../../../hooks/useAppTranslation';

const CommandExecutor = ({ name, version, open, onClose }) => {
  const { t } = useAppTranslation('commandExecutor');
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
        response.data.forEach((cmd, index) => {
          console.log(`命令 ${index + 1}:`, {
            title: cmd.titleKey,
            description: cmd.descriptionKey,
            type: cmd.type,
            command: cmd.command
          });
        });
        console.log('🚀 設置命令列表:', response.data);
        setCommands(response.data);
        setResults(response.data.map(() => ({ status: 'pending', output: '' })));
        setError('');
      } catch (error) {
        console.error('❌ 獲取命令失敗:', error);
        setError(error.response?.data?.details || error.message);
      } finally {
        setIsLoading(false);
      }
    };

    if (open && name && version) {
      fetchCommands();
    }
  }, [name, version, open]);

  const executeCommands = async () => {
    console.log('▶️ 開始執行命令序列');
    let hasError = false;
    
    for (let i = 0; i < commands.length; i++) {
      const { command, title, description } = commands[i];
      
      console.log(`⚡ 執行第 ${i + 1}/${commands.length} 個命令:`, {
        title,
        description,
        command
      });
      
      setResults(prev => {
        const newResults = [...prev];
        newResults[i] = { 
          status: 'running', 
          output: t('status.running'),
          startTime: new Date().toISOString()
        };
        return newResults;
      });

      try {
        const response = await axios.post('http://localhost:3001/api/execute', { command });
        
        setResults(prev => {
          const newResults = [...prev];
          newResults[i] = { 
            status: 'success', 
            output: response.data.output,
            endTime: new Date().toISOString()
          };
          return newResults;
        });
      } catch (error) {
        hasError = true;
        setResults(prev => {
          const newResults = [...prev];
          newResults[i] = { 
            status: 'error', 
            output: t('error') + `: ${error.response?.data?.error || error.message}`,
            endTime: new Date().toISOString()
          };
          return newResults;
        });
        // 不中斷執行，繼續下一個命令
      }
    }
    
    console.log('🏁 命令序列執行完成', hasError ? '(有錯誤發生)' : '(全部成功)');
  };

  console.log('Current commands:', commands);
  console.log('Translation function:', t);
  console.log('Current language:', i18n.language);

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '60vh' }
      }}
    >
      <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">{t('commandExecutor.title')} - {name} v{version}</Typography>
        <IconButton onClick={onClose}>
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {isLoading ? (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography>{t('commandExecutor.loading')}</Typography>
          </Box>
        ) : error ? (
          <Box sx={{ p: 2, color: 'error.main' }}>
            <Typography>{t('commandExecutor.error')}: {error}</Typography>
          </Box>
        ) : (
          <Box>
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
                    boxShadow: 1
                  }}
                >
                  <Box sx={{ width: '100%', p: 2 }}>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="h6" color="primary">
                        {t(cmd.titleKey)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {t(cmd.descriptionKey)}
                      </Typography>
                    </Box>

                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      mb: 1,
                      bgcolor: 'grey.50',
                      p: 1,
                      borderRadius: 1
                    }}>
                      <ListItemIcon sx={{ minWidth: 40 }}>
                        {results[index]?.status === 'success' && <CheckCircle color="success" />}
                        {results[index]?.status === 'error' && <Error color="error" />}
                        {results[index]?.status === 'running' && <HourglassEmpty color="primary" />}
                        {results[index]?.status === 'pending' && <HourglassEmpty color="disabled" />}
                      </ListItemIcon>
                      <Typography variant="body2" color="text.secondary">
                        {results[index]?.status === 'pending' && t('status.pending')}
                        {results[index]?.status === 'running' && t('status.running')}
                        {results[index]?.status === 'success' && t('status.success')}
                        {results[index]?.status === 'error' && t('status.error')}
                        {results[index]?.startTime && ` | ${t('time.start')}: ${new Date(results[index].startTime).toLocaleTimeString()}`}
                        {results[index]?.endTime && ` | ${t('time.end')}: ${new Date(results[index].endTime).toLocaleTimeString()}`}
                      </Typography>
                    </Box>

                    {results[index]?.output && (
                      <Box 
                        sx={{ 
                          p: 2,
                          bgcolor: 'grey.100',
                          borderRadius: 1,
                          whiteSpace: 'pre-wrap',
                          fontSize: '0.875rem',
                          fontFamily: 'monospace'
                        }}
                      >
                        {results[index].output}
                      </Box>
                    )}
                  </Box>
                </ListItem>
              ))}
            </List>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button 
          variant="contained" 
          color="primary"
          startIcon={<PlayArrow />}
          onClick={executeCommands} 
          disabled={commands.length === 0 || isLoading}
        >
          {t('commandExecutor.executeAll')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CommandExecutor;