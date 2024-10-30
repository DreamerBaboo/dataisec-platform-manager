import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  IconButton,
  Chip,
  Tooltip,
  CircularProgress,
  TextField,
  TablePagination,
  Toolbar,
  Button,
  Alert,
  Snackbar
} from '@mui/material';
import { 
  Delete as DeleteIcon,
  Info as InfoIcon,
  GetApp as InstallIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon 
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import ImageDetails from './ImageDetails';
import ImageUpload from './ImageUpload';
import ImageInstall from './ImageInstall';
import ImageDelete from './ImageDelete';

const ImageList = () => {
  const { t } = useTranslation();
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // 分頁
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // 搜索
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredImages, setFilteredImages] = useState([]);
  
  // 對話框控制
  const [selectedImage, setSelectedImage] = useState(null);
  const [openDetails, setOpenDetails] = useState(false);
  const [openUpload, setOpenUpload] = useState(false);
  const [openInstall, setOpenInstall] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);

  // 批量選擇
  const [selected, setSelected] = useState([]);

  // 通知
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  useEffect(() => {
    const abortController = new AbortController();
    
    const fetchData = async () => {
      console.log('🔄 Starting to fetch images...');
      try {
        setLoading(true);
        setError(null);
        const response = await fetch('/api/images', {
          signal: abortController.signal
        });
        console.log('📥 Response received:', response.status, response.statusText);
        
        if (!response.ok) {
          console.error('❌ Response not OK:', response.status, response.statusText);
          throw new Error('Failed to fetch images');
        }
        
        const data = await response.json();
        console.log('📦 Raw data received:', data);
        
        // 確保數據格式正確
        const formattedData = data.map(image => {
          console.log('🔍 Processing image:', image);
          return {
            id: image.id || '',
            name: image.name || '',
            tag: image.tag || 'latest',
            size: image.size || 0,
            uploadDate: image.createdAt || new Date().toISOString(),
            status: image.status || 'available'
          };
        });
        
        console.log('✅ Formatted data:', formattedData);
        setImages(formattedData);
      } catch (err) {
        console.error('❌ Error fetching images:', err);
        if (!abortController.signal.aborted) {
          handleError(err);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false);
          console.log('🏁 Fetch completed');
        }
      }
    };

    console.log('🚀 Initial fetch triggered');
    fetchData();

    return () => {
      console.log('🛑 Cleanup: aborting fetch');
      abortController.abort();
    };
  }, []);

  useEffect(() => {
    console.log('🔍 Filtering images with term:', searchTerm);
    filterImages();
  }, [searchTerm, images]);

  const filterImages = () => {
    console.log('📊 Current images:', images);
    const filtered = images.filter(image => 
      image.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      image.tag.toLowerCase().includes(searchTerm.toLowerCase())
    );
    console.log('🎯 Filtered results:', filtered);
    setFilteredImages(filtered);
  };

  const handleRefresh = () => {
    console.log('🔄 Manual refresh triggered');
    fetchImages();
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const showNotification = (message, severity = 'success') => {
    console.log('📢 Showing notification:', {
      message,
      severity
    });
    setSnackbar({
      open: true,
      message,
      severity
    });
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  // 其他原有的功能保持不變...
  const formatSize = (bytes) => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)), 10);
    return `${Math.round(bytes / (1024 ** i), 2)} ${sizes[i]}`;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'available': return 'success';
      case 'installing': return 'warning';
      case 'failed': return 'error';
      default: return 'default';
    }
  };

  const handleError = (error) => {
    console.error('🚨 ImageList Error:', {
      message: error.message,
      stack: error.stack,
      type: error.name
    });
    setError(error.message || 'An unexpected error occurred');
    showNotification(error.message || 'An unexpected error occurred', 'error');
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Toolbar sx={{ pl: { sm: 2 }, pr: { xs: 1, sm: 1 } }}>
        <Typography variant="h4" sx={{ flex: '1 1 100%' }}>
          {t('dockerImages')}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            size="small"
            placeholder={t('search')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1 }} />
            }}
          />
          <Button
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
          >
            {t('refresh')}
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => setOpenUpload(true)}
          >
            {t('upload')}
          </Button>
        </Box>
      </Toolbar>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t('name')}</TableCell>
              <TableCell>{t('tag')}</TableCell>
              <TableCell>{t('size')}</TableCell>
              <TableCell>{t('uploadDate')}</TableCell>
              <TableCell>{t('status')}</TableCell>
              <TableCell align="right">{t('actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {!loading && filteredImages
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((image) => (
                <TableRow key={image.id || `${image.name}-${image.tag}`}>
                  <TableCell>{image.name}</TableCell>
                  <TableCell>{image.tag}</TableCell>
                  <TableCell>{formatSize(image.size)}</TableCell>
                  <TableCell>{formatDate(image.uploadDate)}</TableCell>
                  <TableCell>
                    <Chip 
                      label={t(image.status)}
                      color={getStatusColor(image.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title={t('install')}>
                      <IconButton 
                        size="small" 
                        color="primary"
                        disabled={image.status === 'installing'}
                        onClick={() => {
                          setSelectedImage(image);
                          setOpenInstall(true);
                        }}
                      >
                        <InstallIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={t('details')}>
                      <IconButton 
                        size="small" 
                        color="info"
                        onClick={() => {
                          setSelectedImage(image);
                          setOpenDetails(true);
                        }}
                      >
                        <InfoIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={t('delete')}>
                      <IconButton 
                        size="small" 
                        color="error"
                        disabled={image.status === 'installing'}
                        onClick={() => {
                          setSelectedImage(image);
                          setOpenDelete(true);
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
            ))}
            {loading && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <CircularProgress size={24} />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={filteredImages.length}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={[5, 10, 25, 50]}
      />

      <ImageDetails
        open={openDetails}
        onClose={() => setOpenDetails(false)}
        image={selectedImage}
      />

      <ImageUpload
        open={openUpload}
        onClose={() => setOpenUpload(false)}
        onSuccess={() => {
          fetchImages();
          showNotification(t('uploadSuccess'));
        }}
      />

      <ImageInstall
        open={openInstall}
        onClose={() => setOpenInstall(false)}
        image={selectedImage}
        onSuccess={() => {
          fetchImages();
          showNotification(t('installSuccess'));
        }}
      />

      <ImageDelete
        open={openDelete}
        onClose={() => setOpenDelete(false)}
        image={selectedImage}
        onSuccess={() => {
          fetchImages();
          showNotification(t('deleteSuccess'));
        }}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {!loading && !error && images.length === 0 && (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="textSecondary">
            {t('noImagesFound')}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default ImageList;