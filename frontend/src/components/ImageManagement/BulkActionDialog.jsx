import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  List,
  ListItem,
  ListItemText,
  CircularProgress
} from '@mui/material';

const BulkActionDialog = ({
  open,
  title,
  message,
  items,
  onConfirm,
  onClose,
  loading,
  confirmText = '確認',
  cancelText = '取消'
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Typography>{message}</Typography>
        <List dense>
          {items.map((item, index) => (
            <ListItem key={index}>
              <ListItemText 
                primary={`${item.name}:${item.tag}`}
                secondary={`ID: ${item.id}`}
              />
            </ListItem>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          {cancelText}
        </Button>
        <Button 
          onClick={onConfirm}
          color="primary"
          variant="contained"
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} /> : confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BulkActionDialog; 