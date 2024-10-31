import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  Divider,
  Checkbox,
  FormControlLabel
} from '@mui/material';
import { useTranslation } from 'react-i18next';

const ImageDelete = ({ open, onClose, image, onSuccess }) => {
  const { t } = useTranslation();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);
  const [forceDelete, setForceDelete] = useState(false);
  const [deleteHistory, setDeleteHistory] = useState([]);

  const handleDelete = async () => {
    if (!image) return;

    setDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/images/${image.id}${forceDelete ? '?force=true' : ''}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      // 添加刪除記錄
      setDeleteHistory(prev => [
        {
          timestamp: new Date().toISOString(),
          image: `${image.name}:${image.tag}`,
          status: 'success'
        },
        ...prev
      ]);

      onSuccess?.();
      setTimeout(() => {
        handleClose();
      }, 1000);
    } catch (err) {
      setError(err.message);
      // 添加失敗記錄
      setDeleteHistory(prev => [
        {
          timestamp: new Date().toISOString(),
          image: `${image.name}:${image.tag}`,
          status: 'error',
          error: err.message
        },
        ...prev
      ]);
    } finally {
      setDeleting(false);
    }
  };

  const handleClose = () => {
    if (!deleting) {
      setError(null);
      setForceDelete(false);
      onClose();
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  if (!image) return null;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Typography variant="h6" color="error">
          {t('deleteImage')}
        </Typography>
      </DialogTitle>
      <DialogContent>
        {error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : (
          <>
            <Typography variant="body1" color="error" gutterBottom>
              {t('deleteWarning')}
            </Typography>
            <Typography variant="body2" gutterBottom>
              {t('deleteConfirmation', { name: image.name, tag: image.tag })}
            </Typography>

            <Box sx={{ mt: 2 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={forceDelete}
                    onChange={(e) => setForceDelete(e.target.checked)}
                    disabled={deleting}
                  />
                }
                label={t('forceDelete')}
              />
            </Box>

            {deleteHistory.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  {t('deleteHistory')}
                </Typography>
                <Divider />
                <List dense>
                  {deleteHistory.map((record, index) => (
                    <ListItem key={index}>
                      <ListItemText
                        primary={record.image}
                        secondary={
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="caption">
                              {formatDate(record.timestamp)}
                            </Typography>
                            <Typography 
                              variant="caption" 
                              color={record.status === 'success' ? 'success.main' : 'error.main'}
                            >
                              {record.status === 'success' ? t('success') : t('failed')}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
          </>
        )}
        {deleting && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <CircularProgress size={24} />
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={deleting}>
          {t('cancel')}
        </Button>
        <Button
          onClick={handleDelete}
          variant="contained"
          color="error"
          disabled={deleting}
          startIcon={deleting && <CircularProgress size={20} />}
        >
          {deleting ? t('deleting') : t('delete')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ImageDelete; 