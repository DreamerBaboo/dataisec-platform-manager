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
  CircularProgress,
  Paper,
  Divider,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import { 
  CloudUpload as UploadIcon, 
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { useSnackbar } from 'notistack';
import { useAppTranslation } from '../../hooks/useAppTranslation';

const ImageUpload = ({ open, onClose, onSuccess }) => {
  const { t } = useAppTranslation();
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [extractedImages, setExtractedImages] = useState([]);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();
  const [keepOriginalImage, setKeepOriginalImage] = useState(false);

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
    maxSize: 1024 * 1024 * 10000, // 10GB
    multiple: false 
  });

  const uploadFile = async (fileInfo) => {
    console.log('📤 Starting file upload:', fileInfo.file.name);
    console.log('📊 File size:', formatFileSize(fileInfo.file.size));

    const formData = new FormData();
    formData.append('image', fileInfo.file);

    try {
      const xhr = new XMLHttpRequest();
      const uploadId = Math.random().toString(36).substr(2, 9);
      
      // 設置進度監聽器
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded * 100) / event.total);
          console.log(`📊 Upload progress: ${progress}%`);
          console.log(`📈 Uploaded: ${formatFileSize(event.loaded)} / ${formatFileSize(event.total)}`);
          
          setUploadProgress(progress);
        }
      };

      // 添加錯誤處理
      xhr.onerror = (error) => {
        console.error('❌ Network error:', error);
        throw new Error('Network error during upload');
      };

      xhr.ontimeout = () => {
        console.error('❌ Upload timeout');
        throw new Error('Upload timeout');
      };

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await new Promise((resolve, reject) => {
        xhr.open('POST', 'http://localhost:3001/api/images/upload');
        
        // 添加認證頭
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        console.log('🔐 Added authorization header');
        
        xhr.onload = () => {
          console.log('📥 Upload response received:', xhr.status);
          console.log('📄 Response headers:', xhr.getAllResponseHeaders());
          console.log('📝 Response body:', xhr.responseText);
          
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText);
              resolve(data);
            } catch (error) {
              console.error('❌ Error parsing response:', error);
              reject(new Error('Invalid response format'));
            }
          } else {
            console.error('❌ Upload failed:', {
              status: xhr.status,
              statusText: xhr.statusText,
              response: xhr.responseText
            });
            reject(new Error(`Upload failed: ${xhr.statusText || 'Unknown error'}`));
          }
        };
        
        console.log('📤 Sending request with formData:', {
          fileSize: fileInfo.file.size,
          fileName: fileInfo.file.name,
          fileType: fileInfo.file.type
        });
        
        xhr.send(formData);
      });

      console.log('✅ Upload completed:', response);
      
      // 解析上傳的鏡像文件
      console.log('🔍 Starting image extraction');
      setProcessingStatus(t('images:imageManagement.messages.extracting'));
      
      const extractResponse = await fetch('http://localhost:3001/api/images/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ filePath: response.filePath })
      });

      if (!extractResponse.ok) {
        console.error('❌ Extraction failed:', extractResponse.statusText);
        throw new Error('Failed to extract images');
      }
      
      const { images } = await extractResponse.json();
      console.log('✅ Extracted images:', images);
      
      setExtractedImages(images);
      setConfirmationOpen(true);
      setProcessingStatus('');

      enqueueSnackbar(t('images:imageManagement.messages.extractingSuccess'), {
        variant: 'success',
        anchorOrigin: { vertical: 'bottom', horizontal: 'right' }
      });
    } catch (error) {
      console.error('❌ Error during upload process:', error);
      setProcessingStatus('');
      
      let errorMessage = '上傳失敗';
      if (error.message.includes('No authentication token')) {
        errorMessage = '請先登入';
      } else if (error.message.includes('Network error')) {
        errorMessage = '網絡錯誤';
      } else if (error.message.includes('timeout')) {
        errorMessage = '上傳超時';
      }
      
      enqueueSnackbar(errorMessage, {
        variant: 'error',
        anchorOrigin: { vertical: 'bottom', horizontal: 'right' }
      });
      
      throw error;
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
      setUploadProgress(0);
      onClose();
    }
  };

  const handleConfirmLoad = async () => {
    try {
      setProcessingStatus(t('images:imageManagement.messages.reTagging'));
      const repository = localStorage.getItem('repositoryHost') || 'localhost';
      const port = localStorage.getItem('repositoryPort') || '5000';

      const response = await fetch('http://localhost:3001/api/images/retag', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          images: extractedImages,
          repository,
          port,
          keepOriginal: keepOriginalImage
        })
      });

      if (!response.ok) {
        const error = await response.json();
        if (response.status === 403) {
          throw new Error(t('images:imageManagement.messages.noPermission'));
        }
        throw new Error(error.message || t('images:imageManagement.messages.reTagError'));
      }

      const result = await response.json();
      console.log('✅ Retag results:', result);

      enqueueSnackbar(t('images:imageManagement.messages.reTagSuccess'), {
        variant: 'success',
        anchorOrigin: { vertical: 'bottom', horizontal: 'right' }
      });

      setConfirmationOpen(false);
      onSuccess();
    } catch (error) {
      console.error('❌ Error during retag process:', error);
      enqueueSnackbar(error.message || t('images:imageManagement.messages.reTagError'), {
        variant: 'error',
        anchorOrigin: { vertical: 'bottom', horizontal: 'right' }
      });
    } finally {
      setProcessingStatus('');
    }
  };

  // 確認對話框
  const ConfirmationDialog = () => (
    <Dialog 
      open={confirmationOpen} 
      onClose={() => setConfirmationOpen(false)}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <InfoIcon color="primary" />
          <Typography variant="h6">{t('images:imageManagement.messages.confirmLoad')}</Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            {t('images:imageManagement.messages.confirmLoadMessage')}
          </Typography>
          <Typography variant="body2" color="textSecondary" paragraph>
            {t('images:imageManagement.registry.repository.label')}: {localStorage.getItem('repositoryHost') || 'localhost'}:{localStorage.getItem('repositoryPort') || '5000'}
          </Typography>
        </Box>
        
        <Paper variant="outlined" sx={{ mb: 2 }}>
          <List>
            {extractedImages.map((image, index) => (
              <React.Fragment key={index}>
                <ListItem>
                  <ListItemText
                    primary={
                      <Typography variant="subtitle2">
                        {image.name}:{image.tag}
                      </Typography>
                    }
                    secondary={
                      <Typography variant="body2" color="textSecondary">
                        {t('images:imageManagement.messages.newTag')}: {`${localStorage.getItem('repositoryHost') || 'localhost'}:${localStorage.getItem('repositoryPort') || '5000'}/${image.name}:${image.tag}`}
                      </Typography>
                    }
                  />
                </ListItem>
                {index < extractedImages.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </Paper>

        <FormControlLabel
          control={
            <Checkbox
              checked={keepOriginalImage}
              onChange={(e) => setKeepOriginalImage(e.target.checked)}
              color="primary"
            />
          }
          label={
            <Typography variant="body2">
              {t('images:imageManagement.messages.keepOriginal')}
            </Typography>
          }
        />

        {processingStatus && (
          <Box sx={{ mt: 2 }}>
            <LinearProgress />
            <Typography variant="body2" color="textSecondary" align="center" sx={{ mt: 1 }}>
              {processingStatus}
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button 
          onClick={() => setConfirmationOpen(false)}
          disabled={!!processingStatus}
        >
          {t('images:imageManagement.actions.cancel')}
        </Button>
        <Button 
          onClick={handleConfirmLoad}
          variant="contained"
          disabled={!!processingStatus}
          startIcon={processingStatus ? <CircularProgress size={20} /> : null}
        >
          {processingStatus || t('images:imageManagement.actions.confirm')}
        </Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <>
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            {t('images:imageManagement.actions.upload')}
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
              {isDragActive ? t('images:imageManagement.actions.dropFilesHere') : t('images:imageManagement.actions.dragDropImage')}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {t('images:imageManagement.actions.supportedFormats')}
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
                        {uploading && (
                          <LinearProgress 
                            variant="determinate" 
                            value={uploadProgress}
                            sx={{ flexGrow: 1 }}
                          />
                        )}
                        <Typography variant="body2" color="textSecondary">
                          {formatFileSize(fileInfo.file.size)}
                          {uploading && ` - ${uploadProgress}%`}
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
            {t('images:imageManagement.actions.cancel')}
          </Button>
          <Button
            onClick={handleUpload}
            variant="contained"
            color="primary"
            disabled={files.length === 0 || uploading}
            startIcon={uploading && <CircularProgress size={20} />}
          >
            {uploading ? t('images:imageManagement.status.uploading') : t('images:imageManagement.actions.upload')}
          </Button>
        </DialogActions>
      </Dialog>
      <ConfirmationDialog />
    </>
  );
};

const formatFileSize = (bytes) => {
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 B';
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)), 10);
  return `${Math.round(bytes / (1024 ** i), 2)} ${sizes[i]}`;
};

export default ImageUpload; 