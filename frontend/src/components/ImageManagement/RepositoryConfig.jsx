import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box
} from '@mui/material';

const RepositoryConfig = ({ open, onClose }) => {
  const [repository, setRepository] = useState(localStorage.getItem('repositoryHost') || '');
  const [port, setPort] = useState(localStorage.getItem('repositoryPort') || '5000');

  const handleSave = () => {
    localStorage.setItem('repositoryHost', repository);
    localStorage.setItem('repositoryPort', port);
    onClose({ repository, port });
  };

  return (
    <Dialog open={open} onClose={() => onClose()} maxWidth="sm" fullWidth>
      <DialogTitle>倉庫設定</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label="倉庫地址"
            value={repository}
            onChange={(e) => setRepository(e.target.value)}
            fullWidth
            placeholder="例如: localhost"
          />
          <TextField
            label="倉庫端口"
            value={port}
            onChange={(e) => setPort(e.target.value)}
            fullWidth
            placeholder="例如: 5000"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClose()}>取消</Button>
        <Button onClick={handleSave} variant="contained">
          保存
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RepositoryConfig; 