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
import { useAppTranslation } from '../../hooks/useAppTranslation';



const RepositoryConfig = ({ open, onClose }) => {
  const { t } = useAppTranslation();
  const [repository, setRepository] = useState(localStorage.getItem('repositoryHost') || '');
  const [port, setPort] = useState(localStorage.getItem('repositoryPort') || '5000');

  const handleSave = () => {
    localStorage.setItem('repositoryHost', repository);
    localStorage.setItem('repositoryPort', port);
    onClose({ repository, port });
  };
  const handleClose = () => {
      onClose();
  };

  return (
    <Dialog open={open} onClose={() => onClose()} maxWidth="sm" fullWidth>
      <DialogTitle>{t('images:imageManagement.registry.title')}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label={t('images:imageManagement.registry.repository.label')}
            value={repository}
            onChange={(e) => setRepository(e.target.value)}
            fullWidth
            placeholder={t('images:imageManagement.registry.repository.placeholder')}
          />
          <TextField
            label={t('images:imageManagement.registry.port.label')}
            value={port}
            onChange={(e) => setPort(e.target.value)}
            fullWidth
            placeholder={t('images:imageManagement.registry.port.placeholder')}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => handleClose()}>{t('images:imageManagement.actions.cancel')}</Button>
        <Button onClick={handleSave} variant="contained">
          {t('images:imageManagement.actions.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RepositoryConfig; 