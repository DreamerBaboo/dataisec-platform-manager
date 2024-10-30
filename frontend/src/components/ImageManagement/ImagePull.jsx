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

const ImagePull = ({ open, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    tag: 'latest'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await imageService.pullImage(formData.name, formData.tag);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to pull image:', error);
      setError('拉取鏡像失敗');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>拉取鏡像</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="鏡像名稱"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              fullWidth
            />
            <TextField
              label="標籤"
              name="tag"
              value={formData.tag}
              onChange={handleChange}
              required
              fullWidth
            />
            {error && (
              <Alert severity="error">{error}</Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>取消</Button>
          <Button 
            type="submit" 
            variant="contained"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : '拉取'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default ImagePull; 