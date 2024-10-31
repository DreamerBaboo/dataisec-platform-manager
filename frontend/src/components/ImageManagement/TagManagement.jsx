import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography
} from '@mui/material';
import { imageService } from '../../services/imageService';

const TagManagement = ({ open, image, onClose, onSuccess }) => {
  const [newTag, setNewTag] = useState('');
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      await imageService.tagImage(image.name, newTag);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to tag image:', error);
      setError('標籤創建失敗');
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>
        管理鏡像標籤
      </DialogTitle>
      <DialogContent>
        <Typography variant="subtitle1" gutterBottom>
          鏡像: {image?.name}
        </Typography>
        <Typography variant="subtitle2" gutterBottom>
          當前標籤: {image?.tag}
        </Typography>
        
        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="新標籤"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            margin="normal"
            required
            error={!!error}
            helperText={error}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button onClick={handleSubmit} variant="contained">
          確認
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TagManagement; 