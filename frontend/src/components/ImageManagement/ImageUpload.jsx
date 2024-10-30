import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  LinearProgress,
  IconButton,
  Alert,
  List,
  ListItem,
  ListItemText,
  //ListItemSecondary,
  CircularProgress
} from '@mui/material';
import { 
  CloudUpload as UploadIcon, 
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useDropzone } from 'react-dropzone';

const ImageUpload = ({ open, onClose, onSuccess, standalone = false }) => {
  const { t } = useTranslation();
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [error, setError] = useState(null);

  const onDrop = useCallback((acceptedFiles) => {
    setFiles(prev => [...prev, ...acceptedFiles.map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      status: 'pending',
      progress: 0
    }))]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/x-tar': ['.tar'],
      'application/gzip': ['.gz', '.tgz']
    },
    maxSize: 1024 * 1024 * 1000, // 1GB
    multiple: true
  });

  const uploadFile = async (fileInfo) => {
    console.log('📤 Uploading file:', fileInfo);
    const formData = new FormData();
    formData.append('image', fileInfo.file);

    try {
      const response = await fetch('/api/images/upload', {
        method: 'POST',
        body: formData,
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          console.log('📊 Upload progress:', progress);
          setUploadProgress(prev => ({
            ...prev,
            [fileInfo.id]: progress
          }));
        }
      });

      console.log('📥 Upload response:', response.status, response.statusText);
      if (!response.ok) throw new Error(`Upload failed: ${response.statusText}`);

      const data = await response.json();
      console.log('✅ Upload successful:', data);

      setFiles(prev => prev.map(f => 
        f.id === fileInfo.id ? { ...f, status: 'success' } : f
      ));
    } catch (err) {
      console.error('❌ Upload error:', err);
      setFiles(prev => prev.map(f => 
        f.id === fileInfo.id ? { ...f, status: 'error', error: err.message } : f
      ));
      setError(err.message);
    }
  };

  const handleUpload = async () => {
    setUploading(true);
    setError(null);

    try {
      await Promise.all(files.map(uploadFile));
      onSuccess?.();
    } catch (err) {
      setError(t('uploadError'));
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveFile = (fileId) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const handleClose = () => {
    if (!uploading) {
      setFiles([]);
      setError(null);
      setUploadProgress({});
      onClose();
    }
  };

  if (standalone) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          {t('uploadImage')}
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <Box
          {...getRootProps()}
          sx={{
            border: '2px dashed',
            borderColor: isDragActive ? 'primary.main' : 'grey.300',
            borderRadius: 2,
            p: 3,
            textAlign: 'center',
            cursor: 'pointer',
            bgcolor: isDragActive ? 'action.hover' : 'background.paper',
            '&:hover': {
              bgcolor: 'action.hover',
              borderColor: 'primary.main'
            }
          }}
        >
          <input {...getInputProps()} />
          <UploadIcon sx={{ fontSize: 48, color: 'action.active', mb: 1 }} />
          <Typography variant="body1" gutterBottom>
            {isDragActive ? t('dropFilesHere') : t('dragDropImage')}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {t('supportedFormats')}
          </Typography>
        </Box>

        {files.length > 0 && (
          <List sx={{ mt: 2 }}>
            {files.map((fileInfo) => (
              <ListItem
                key={fileInfo.id}
                secondaryAction={
                  !uploading && (
                    <IconButton 
                      edge="end" 
                      onClick={() => handleRemoveFile(fileInfo.id)}
                    >
                      <CloseIcon />
                    </IconButton>
                  )
                }
              >
                <ListItemText
                  primary={fileInfo.file.name}
                  secondary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {fileInfo.status === 'success' ? (
                        <CheckCircleIcon color="success" />
                      ) : fileInfo.status === 'error' ? (
                        <ErrorIcon color="error" />
                      ) : uploading ? (
                        <LinearProgress 
                          variant="determinate" 
                          value={uploadProgress[fileInfo.id] || 0}
                          sx={{ flexGrow: 1 }}
                        />
                      ) : null}
                      <Typography variant="body2" color="textSecondary">
                        {formatFileSize(fileInfo.file.size)}
                      </Typography>
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}

        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <Button
            onClick={handleUpload}
            variant="contained"
            color="primary"
            disabled={files.length === 0 || uploading}
            startIcon={uploading && <CircularProgress size={20} />}
          >
            {uploading ? t('uploading') : t('upload')}
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          {t('uploadImage')}
          <IconButton onClick={handleClose} size="small" disabled={uploading}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <Box
          {...getRootProps()}
          sx={{
            border: '2px dashed',
            borderColor: isDragActive ? 'primary.main' : 'grey.300',
            borderRadius: 2,
            p: 3,
            textAlign: 'center',
            cursor: 'pointer',
            bgcolor: isDragActive ? 'action.hover' : 'background.paper',
            '&:hover': {
              bgcolor: 'action.hover',
              borderColor: 'primary.main'
            }
          }}
        >
          <input {...getInputProps()} />
          <UploadIcon sx={{ fontSize: 48, color: 'action.active', mb: 1 }} />
          <Typography variant="body1" gutterBottom>
            {isDragActive ? t('dropFilesHere') : t('dragDropImage')}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {t('supportedFormats')}
          </Typography>
        </Box>

        {files.length > 0 && (
          <List sx={{ mt: 2 }}>
            {files.map((fileInfo) => (
              <ListItem
                key={fileInfo.id}
                secondaryAction={
                  !uploading && (
                    <IconButton 
                      edge="end" 
                      onClick={() => handleRemoveFile(fileInfo.id)}
                    >
                      <CloseIcon />
                    </IconButton>
                  )
                }
              >
                <ListItemText
                  primary={fileInfo.file.name}
                  secondary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {fileInfo.status === 'success' ? (
                        <CheckCircleIcon color="success" />
                      ) : fileInfo.status === 'error' ? (
                        <ErrorIcon color="error" />
                      ) : uploading ? (
                        <LinearProgress 
                          variant="determinate" 
                          value={uploadProgress[fileInfo.id] || 0}
                          sx={{ flexGrow: 1 }}
                        />
                      ) : null}
                      <Typography variant="body2" color="textSecondary">
                        {formatFileSize(fileInfo.file.size)}
                      </Typography>
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={uploading}>
          {t('cancel')}
        </Button>
        <Button
          onClick={handleUpload}
          variant="contained"
          color="primary"
          disabled={files.length === 0 || uploading}
          startIcon={uploading && <CircularProgress size={20} />}
        >
          {uploading ? t('uploading') : t('upload')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const formatFileSize = (bytes) => {
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 B';
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)), 10);
  return `${Math.round(bytes / (1024 ** i), 2)} ${sizes[i]}`;
};

export default ImageUpload; 