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
  Alert,
  TableSortLabel,
  InputAdornment
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Upload as UploadIcon,
  Delete as DeleteIcon,
  Archive as PackageIcon,
  Info as InfoIcon,
  Settings as SettingsIcon,
  Search as SearchIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import { useAppTranslation } from '../../hooks/useAppTranslation';
import ImageUpload from './ImageUpload';
import ImageDetails from './ImageDetails';
import { useSnackbar } from 'notistack';
import RepositoryConfig from './RepositoryConfig';
import { api, getApiUrl } from '../../utils/api';
import { logger } from '../../utils/logger.ts';  // 導入 logger

const ImageList = () => {
  const { t } = useAppTranslation("imageManagement");
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
  const [configOpen, setConfigOpen] = useState(false);
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();
  const [order, setOrder] = useState('desc');
  const [orderBy, setOrderBy] = useState('uploadDate');

  const fetchImages = async () => {
    logger.info('🔄 Starting to fetch images...');
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(getApiUrl('api/images/list'), {  
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch images: ${response.statusText}`);
      }

      const data = await response.json();
      logger.info('📥 Response received:', data);
      
      // 確保數據格式正確
      const formattedData = (Array.isArray(data) ? data : []).map(image => ({
        id: image.ID || `${image.Repository}-${image.Tag}`,
        name: image.Repository,
        tag: image.Tag,
        size: image.Size,
        created: image.Created,
        repository: image.Repository,
        status: image.status || 'active'
      }));
      
      logger.info('📦 Formatted data:', formattedData);
      setImages(formattedData);
      
    } catch (error) {
      console.error('❌ Error fetching images:', error);
      setError(error.message || '獲取鏡像列表失敗');
      setImages([]);
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

  const handleRefresh = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(getApiUrl('api/images/list'), {  
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch images: ${response.statusText}`);
      }

      const data = await response.json();
      logger.info('📥 Response received:', data);
      
      // 確保數據格式正確
      const formattedData = (Array.isArray(data) ? data : []).map(image => ({
        id: image.ID || `${image.Repository}-${image.Tag}`,
        name: image.Repository,
        tag: image.Tag,
        size: image.Size,
        created: image.Created,
        repository: image.Repository,
        status: image.status || 'active'
      }));
      
      logger.info('📦 Formatted data:', formattedData);
      setImages(formattedData);
      
    } catch (error) {
      console.error('❌ Error fetching images:', error);
      setError(error.message || '獲取鏡像列表失敗');
      setImages([]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setFilteredImages(images);
  };

  const handleSearch = (value) => {
    setSearchTerm(value);
    if (!value.trim()) {
      setFilteredImages(images);
      return;
    }
    const filtered = images.filter(image => 
      image.name.toLowerCase().includes(value.toLowerCase()) ||
      image.tag.toLowerCase().includes(value.toLowerCase())
    );
    setFilteredImages(filtered);
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
      const newSelected = filteredImages.map(image => `${image.name}:${image.tag}`);
      setSelected(newSelected);
    } else {
      setSelected([]);
    }
  };

  const handleClick = (event, imageName, imageTag) => {
    const imageKey = `${imageName}:${imageTag}`;
    const selectedIndex = selected.indexOf(imageKey);
    let newSelected = [];

    if (selectedIndex === -1) {
      newSelected = [...selected, imageKey];
    } else {
      newSelected = selected.filter(id => id !== imageKey);
    }

    setSelected(newSelected);
    logger.info('👉 Selected images:', newSelected);
  };

  const isSelected = (imageName, imageTag) => {
    return selected.indexOf(`${imageName}:${imageTag}`) !== -1;
  };

  const handleBulkDelete = async () => {
    try {
      logger.info('🗑️ Starting bulk delete for images:', selected);
      
      const response = await fetch(getApiUrl('api/images/delete'), {
        method: 'DELETE',  
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ images: selected })
      });

      if (!response.ok) {
        throw new Error(`Delete failed: ${response.statusText}`);
      }

      const result = await response.json();
      logger.info('✅ Delete result:', result);

      const hasErrors = result.results?.some(r => r.status === 'error');
      
      if (hasErrors) {
        enqueueSnackbar(t('imageManagement:message.partialDeleteFailed'), {
          variant: 'warning',
          anchorOrigin: { vertical: 'bottom', horizontal: 'right' }
        });
      } else {
        enqueueSnackbar(t('imageManagement:message.deleteSuccess'), {
          variant: 'success',
          anchorOrigin: { vertical: 'bottom', horizontal: 'right' }
        });
      }

      fetchImages();
      setSelected([]);
    } catch (error) {
      console.error('❌ Error deleting images:', error);
      enqueueSnackbar(error.message || t('imageManagement:message.deleteFailed'), {
        variant: 'error',
        anchorOrigin: { vertical: 'bottom', horizontal: 'right' }
      });
    }
  };

  const handlePackage = async () => {
    logger.info('📦 開始打包映像檔...');
    setPackagingStatus(prev => ({ ...prev, loading: true, progress: 0 }));
    
    const snackbarKey = enqueueSnackbar(t('imageManagement:message.packageStart'), {
      variant: 'info',
      persist: true,
      anchorOrigin: { vertical: 'bottom', horizontal: 'right' },
      action: (key) => (
        <CircularProgress size={24} sx={{ color: 'white', marginLeft: 1 }} />
      )
    });
    
    try {
      const selectedImages = selected.map(imageKey => {
        const [name, tag] = imageKey.split(':');
        return { name, tag, fullName: imageKey };
      });

      // 使用 fetch 直接處理二進制數據
      const response = await fetch(getApiUrl('api/images/package'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ images: selectedImages })
      });

      if (!response.ok) {
        throw new Error(`打包失敗: ${response.statusText}`);
      }

      // 處理下載
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const filename = `docker-images-${new Date().toISOString().slice(0,10)}.tar`;
      
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      closeSnackbar(snackbarKey);
      enqueueSnackbar(t('imageManagement:message.packageSuccess'), {
        variant: 'success',
        autoHideDuration: 3000
      });
    } catch (error) {
      logger.error('❌ 打包映像檔失敗:', error);
      enqueueSnackbar(t('imageManagement:message.packageFailed'), {
        variant: 'error',
        autoHideDuration: 3000
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
    logger.info('🔍 Viewing details for image:', imageId);
    try {
      const details = await api.get(`api/images/${imageId}`);
      logger.info('📦 Image details received:', details);
      setSelectedImage(details);
    } catch (error) {
      console.error('❌ Error fetching image details:', error);
      setError(error.message);
    }
  };

  const handleConfigSave = ({ repository, port }) => {
    setConfigOpen(false);
    enqueueSnackbar('倉庫設定已更新', {
      variant: 'success',
      anchorOrigin: { vertical: 'bottom', horizontal: 'right' }
    });
  };

  const handleRequestSort = (event, property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const headCells = [
    { id: 'name', label: t('imageManagement:table.name') },
    { id: 'tag', label: t('imageManagement:table.tag') },
    { id: 'size', label: t('imageManagement:table.size'), numeric: true },
    { id: 'uploadDate', label: t('imageManagement:table.uploadDate') },
    { id: 'status', label: t('imageManagement:table.status') },
  ];

  const formatSize = (sizeString) => {
    if (typeof sizeString === 'number') {
      const sizes = ['B', 'KB', 'MB', 'GB'];
      if (sizeString === 0) return '0 B';
      const i = parseInt(Math.floor(Math.log(sizeString) / Math.log(1024)), 10);
      return `${Math.round(sizeString / (1024 ** i), 2)} ${sizes[i]}`;
    }

    if (typeof sizeString === 'string') {
      return sizeString.replace(/([0-9.]+)([A-Z]+)/, '$1 $2');
    }

    return 'Unknown size';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    
    try {
      let date;
      if (dateString.includes('ago')) {
        const now = new Date();
        const days = parseInt(dateString.match(/\d+/)[0]);
        date = new Date(now.setDate(now.getDate() - days));
      } else if (dateString.includes('About')) {
        date = new Date();
      } else {
        date = new Date(dateString);
      }

      if (isNaN(date.getTime())) {
        console.warn('Invalid date:', dateString);
        return dateString;
      }

      return new Intl.DateTimeFormat('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).format(date);
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString;
    }
  };

  return (
    <Box sx={{ 
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: 2
    }}>
      <Paper sx={{ 
        flex: 1,  // 讓 Paper 填充剩餘空間
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden' // 防止整個 Paper 滾動
      }}>
        <Toolbar
          sx={{
            pl: { sm: 2 },
            pr: { xs: 1, sm: 1 }
          }}
        >
          <Typography
            sx={{ flex: '1 1 100%' }}
            variant="h6"
            component="div"
          >
            {t('imageManagement:common.imageList')}
            {selected.length > 0 && (
              <Typography
                sx={{ ml: 2 }}
                color="inherit"
                variant="subtitle1"
                component="span"
              >
                {selected.length} {t('common:selected')}
              </Typography>
            )}
          </Typography>
          <TextField
            size="small"
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder={t('imageManagement:message.searchImages')}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
              endAdornment: searchTerm && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={handleClearSearch}>
                    <ClearIcon />
                  </IconButton>
                </InputAdornment>
              )
            }}
            sx={{ width: 300, mr: 2 }}
          />
          <IconButton onClick={handleRefresh} disabled={loading}>
            <RefreshIcon />
          </IconButton>
          <IconButton onClick={() => setConfigOpen(true)}>
            <SettingsIcon />
          </IconButton>
        </Toolbar>

        <TableContainer sx={{ 
          flex: 1,
          overflow: 'auto', // 使表格容器可滾動
          '&::-webkit-scrollbar': {
            width: '0.4em',
            height: '0.4em',
          },
          '&::-webkit-scrollbar-track': {
            background: '#f1f1f1',
          },
          '&::-webkit-scrollbar-thumb': {
            background: '#888',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: '#555',
          },
        }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={selected.length > 0 && selected.length < filteredImages.length}
                    checked={filteredImages.length > 0 && selected.length === filteredImages.length}
                    onChange={handleSelectAllClick}
                  />
                </TableCell>
                {headCells.map((headCell) => (
                  <TableCell
                    key={headCell.id}
                    align={headCell.numeric ? 'right' : 'left'}
                    sortDirection={orderBy === headCell.id ? order : false}
                  >
                    <TableSortLabel
                      active={orderBy === headCell.id}
                      direction={orderBy === headCell.id ? order : 'asc'}
                      onClick={(event) => handleRequestSort(event, headCell.id)}
                    >
                      {headCell.label}
                    </TableSortLabel>
                  </TableCell>
                ))}
                <TableCell align="center">{t('imageManagement:actions.close')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {stableSort(filteredImages, getComparator(order, orderBy))
                .map((image) => {
                  const isItemSelected = isSelected(image.name, image.tag);
                  const uniqueKey = `${image.name}:${image.tag}`;
                  
                  return (
                    <TableRow
                      hover
                      onClick={(event) => handleClick(event, image.name, image.tag)}
                      role="checkbox"
                      aria-checked={isItemSelected}
                      tabIndex={-1}
                      key={uniqueKey}
                      selected={isItemSelected}
                    >
                      <TableCell padding="checkbox">
                        <Checkbox checked={isItemSelected} />
                      </TableCell>
                      <TableCell>{image.name}</TableCell>
                      <TableCell>{image.tag}</TableCell>
                      <TableCell align="right">{formatSize(image.size)}</TableCell>
                      <TableCell>
                        {formatDate(image.createdAt || image.uploadDate)}
                      </TableCell>
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
              {filteredImages.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography color="textSecondary">
                      {error ? t('imageManagement:errorLoadingImages') : t('imageManagement:message.noImagesFound')}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Paper sx={{ 
        p: 2,
        position: 'sticky',
        bottom: 0,
        backgroundColor: 'background.paper',
        zIndex: 1
      }}>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          gap: 2
        }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {selected.length > 0 && (
              <>
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={handleBulkDelete}
                >
                  {t('imageManagement:actions.delete')} ({selected.length})
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={packagingStatus.loading ? <CircularProgress size={20} /> : <PackageIcon />}
                  onClick={handlePackage}
                  disabled={packagingStatus.loading}
                >
                  {packagingStatus.loading ? t('imageManagement:actions.packaging') : t('imageManagement:actions.package')} ({selected.length})
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
            {t('imageManagement:actions.upload')}
          </Button>
        </Box>
      </Paper>

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
            {t('imageManagement:message.noImagesFound')}
          </Typography>
        </Box>
      )}

      <RepositoryConfig 
        open={configOpen}
        onClose={handleConfigSave}
      />
    </Box>
  );
};
export default ImageList;

function descendingComparator(a, b, orderBy) {
  if (orderBy === 'size') {
    return b.size - a.size;
  }
  if (orderBy === 'uploadDate') {
    return new Date(b.uploadDate) - new Date(a.uploadDate);
  }
  if (b[orderBy] < a[orderBy]) {
    return -1;
  }
  if (b[orderBy] > a[orderBy]) {
    return 1;
  }
  return 0;
}

function getComparator(order, orderBy) {
  return order === 'desc'
    ? (a, b) => descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy);
}

function stableSort(array, comparator) {
  const stabilizedThis = array.map((el, index) => [el, index]);
  stabilizedThis.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) return order;
    return a[1] - b[1];
  });
  return stabilizedThis.map((el) => el[0]);
}
