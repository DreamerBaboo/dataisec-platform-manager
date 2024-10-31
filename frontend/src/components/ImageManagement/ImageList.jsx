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
  TextField,
  IconButton,
  Button,
  Typography,
  Checkbox,
  Toolbar,
  alpha,
  Chip,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Upload as UploadIcon,
  Delete as DeleteIcon,
  Archive as PackageIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import ImageUpload from './ImageUpload';
import ImageDetails from './ImageDetails';
import { useSnackbar } from 'notistack';

const ImageList = () => {
  const { t } = useTranslation();
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredImages, setFilteredImages] = useState([]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selected, setSelected] = useState([]);
  const [packagingStatus, setPackagingStatus] = useState({
    loading: false,
    progress: 0,
    snackbarKey: null
  });
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();

  const showNotification = (message, variant) => {
    enqueueSnackbar(message, { 
      variant,
      autoHideDuration: 3000,
      anchorOrigin: {
        vertical: 'top',
        horizontal: 'center'
      }
    });
  };

  const fetchImages = async () => {
    console.log('🔄 Starting to fetch images...');
    try {
      setLoading(true);
      setError(null);
      // 使用完整的 URL
      const response = await fetch('http://localhost:3001/api/images', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`, // 添加認證
          'Accept': 'application/json'
        }
      });
      console.log('📥 Response received:', response.status, response.statusText);
      
      if (!response.ok) {
        console.error('❌ Response not OK:', response.status, response.statusText);
        throw new Error('Failed to fetch images');
      }
      
      const data = await response.json();
      console.log('📦 Raw data received:', data);
      
      // 確保數據格式正確
      const formattedData = data.map(image => ({
        id: image.id || image.ID || '',  // 支持兩種可能的 ID 格式
        name: image.name || image.Repository || '',
        tag: image.tag || image.Tag || 'latest',
        size: image.size || 0,
        uploadDate: image.createdAt,
        status: image.status || 'available'
      }));
      
      console.log('✨ Formatted data:', formattedData);
      setImages(formattedData);
      setFilteredImages(formattedData);
    } catch (error) {
      console.error('❌ Error fetching images:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, []);

  useEffect(() => {
    const filtered = images.filter(image => 
      image.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      image.tag.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredImages(filtered);
  }, [searchTerm, images]);

  const handleRefresh = () => {
    fetchImages();
  };


  const getStatusColor = (status) => {
    switch (status) {
      case 'available':
        return 'success';
      case 'pending':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  const handleSelectAllClick = (event) => {
    if (event.target.checked) {
      const newSelected = filteredImages.map(image => image.id);
      setSelected(newSelected);
    } else {
      setSelected([]);
    }
  };

  const handleClick = (event, id) => {
    const selectedIndex = selected.indexOf(id);
    let newSelected = [];

    if (selectedIndex === -1) {
      newSelected = [...selected, id];
    } else {
      newSelected = selected.filter(item => item !== id);
    }

    setSelected(newSelected);
  };

  const isSelected = (id) => selected.indexOf(id) !== -1;

  const handleBulkDelete = async () => {
    try {
      await Promise.all(selected.map(id => fetch(`/api/images/${id}`, { method: 'DELETE' })));
      fetchImages();
      setSelected([]);
    } catch (error) {
      setError(error.message);
    }
  };

  const handlePackage = async () => {
    console.log('📦 Packaging images:', selected);
    setPackagingStatus(prev => ({ ...prev, loading: true, progress: 0 }));
    
    // 顯示開始打包的通知
    const snackbarKey = enqueueSnackbar('開始打包鏡像...', {
      variant: 'info',
      persist: true,
      anchorOrigin: {
        vertical: 'bottom',
        horizontal: 'right'
      },
      action: (key) => (
        <CircularProgress 
          size={24} 
          sx={{ color: 'white', marginLeft: 1 }} 
        />
      )
    });
    
    setPackagingStatus(prev => ({ ...prev, snackbarKey }));

    try {
      const selectedImages = filteredImages
        .filter(img => selected.includes(img.id))
        .map(img => ({
          id: img.id,
          name: img.name,
          tag: img.tag,
          fullName: `${img.name}:${img.tag}`
        }));

      // 更新通知為準備中
      closeSnackbar(snackbarKey);
      const preparingKey = enqueueSnackbar('正在準備打包文件...', {
        variant: 'info',
        persist: true,
        anchorOrigin: {
          vertical: 'bottom',
          horizontal: 'right'
        },
        action: (key) => (
          <CircularProgress 
            size={24} 
            sx={{ color: 'white', marginLeft: 1 }} 
          />
        )
      });

      const response = await fetch(`http://localhost:3001/api/images/package`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ images: selectedImages })
      });

      if (!response.ok) {
        throw new Error('Failed to package images');
      }

      // 更新通知為下載中
      closeSnackbar(preparingKey);
      const downloadingKey = enqueueSnackbar('正在下載打包文件...', {
        variant: 'info',
        persist: true,
        anchorOrigin: {
          vertical: 'bottom',
          horizontal: 'right'
        },
        action: (key) => (
          <CircularProgress 
            size={24} 
            sx={{ color: 'white', marginLeft: 1 }} 
          />
        )
      });

      // 生成當前日期字符串 YYYY-MM-DD 格式
      const today = new Date().toISOString().split('T')[0];
      const filename = `image-${today}.tar`;
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;  // 使用新的文件名格式
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // 關閉下載通知並顯示成功通知
      closeSnackbar(downloadingKey);
      enqueueSnackbar('鏡像打包完成並已下載', { 
        variant: 'success',
        autoHideDuration: 3000,
        anchorOrigin: {
          vertical: 'bottom',
          horizontal: 'right'
        }
      });
    } catch (error) {
      console.error('❌ Error packaging images:', error);
      setError(error.message);
      enqueueSnackbar('打包鏡像失敗', { 
        variant: 'error',
        autoHideDuration: 3000,
        anchorOrigin: {
          vertical: 'bottom',
          horizontal: 'right'
        }
      });
    } finally {
      setPackagingStatus({
        loading: false,
        progress: 0,
        snackbarKey: null
      });
    }
  };

  const handleViewDetails = async (imageId) => {
    console.log('🔍 Viewing details for image:', imageId);
    try {
      const response = await fetch(`http://localhost:3001/api/images/${imageId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch image details');
      }
      
      const details = await response.json();
      console.log('📦 Image details received:', details);
      setSelectedImage(details);
    } catch (error) {
      console.error('❌ Error fetching image details:', error);
      setError(error.message);
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* 搜索和刷新工具欄 */}
      <Paper sx={{ mb: 2, p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <TextField
            size="small"
            variant="outlined"
            placeholder={t('searchImages')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ flexGrow: 1 }}
          />
          <IconButton onClick={handleRefresh} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Box>
      </Paper>

      {/* 圖像列表 */}
      <Paper sx={{ width: '100%', mb: 2 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={selected.length > 0 && selected.length < filteredImages.length}
                    checked={filteredImages.length > 0 && selected.length === filteredImages.length}
                    onChange={handleSelectAllClick}
                  />
                </TableCell>
                <TableCell>{t('name')}</TableCell>
                <TableCell>{t('tag')}</TableCell>
                <TableCell>{t('size')}</TableCell>
                <TableCell>{t('uploadDate')}</TableCell>
                <TableCell>{t('status')}</TableCell>
                <TableCell align="center">{t('info')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredImages.map((image) => {
                const isItemSelected = selected.includes(image.id);
                return (
                  <TableRow
                    hover
                    onClick={(event) => handleClick(event, image.id)}
                    role="checkbox"
                    aria-checked={isItemSelected}
                    tabIndex={-1}
                    key={image.id}
                    selected={isItemSelected}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox checked={isItemSelected} />
                    </TableCell>
                    <TableCell>{image.name}</TableCell>
                    <TableCell>{image.tag}</TableCell>
                    <TableCell>{image.size}</TableCell>
                    <TableCell>{image.uploadDate}</TableCell>
                    <TableCell>
                      <Chip 
                        label={t(image.status)}
                        color={getStatusColor(image.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewDetails(image.id);
                        }}
                      >
                        <InfoIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* 操作按鈕區 */}
      <Paper sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {selected.length > 0 && (
              <>
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={handleBulkDelete}
                >
                  {t('delete')} ({selected.length})
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={packagingStatus.loading ? <CircularProgress size={20} /> : <PackageIcon />}
                  onClick={handlePackage}
                  disabled={packagingStatus.loading}
                >
                  {packagingStatus.loading ? t('packaging') : t('package')} ({selected.length})
                </Button>
              </>
            )}
          </Box>
          <Button
            variant="contained"
            color="primary"
            startIcon={<UploadIcon />}
            onClick={() => setUploadOpen(true)}
          >
            {t('upload')}
          </Button>
        </Box>
      </Paper>

      {/* 對話框 */}
      <ImageUpload
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onSuccess={() => {
          setUploadOpen(false);
          fetchImages();
        }}
      />
      
      <ImageDetails
        image={selectedImage}
        open={Boolean(selectedImage)}
        onClose={() => setSelectedImage(null)}
      />

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