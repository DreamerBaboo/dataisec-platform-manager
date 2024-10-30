import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  CircularProgress,
  Alert
} from '@mui/material';
import { imageService } from '../../services/imageService';
import { validateImageName, validateTag } from '../../utils/docker';

const ImagePush = ({ open, onClose, image }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tag, setTag] = useState(image?.tag || 'latest');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateTag(tag)) {
      setError('無效的標籤格式');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await imageService.pushImage(image.name, tag);
      onClose();
    } catch (error) {
      console.error('Failed to push image:', error);
      setError('推送鏡像失敗');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>推送鏡像</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="鏡像名稱"
              value={image?.name || ''}
              disabled
              fullWidth
            />
            <TextField
              label="標籤"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              required
              fullWidth
              error={!!error}
              helperText={error}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>取消</Button>
          <Button 
            type="submit" 
            variant="contained"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : '推送'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default ImagePush; 