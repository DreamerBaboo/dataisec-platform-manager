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
import { getApiUrl } from '../../config/api';
import axios from 'axios';

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
  const ROW_HEIGHT = 53; // 每行的高度（根據 MUI 的默認值）
  const HEADER_HEIGHT = 56; // 表頭高度
  const ROWS_PER_PAGE = 10; // 默認顯示 10 行
  const TABLE_HEIGHT = ROW_HEIGHT * ROWS_PER_PAGE + HEADER_HEIGHT;

  const fetchImages = async () => {
    console.log('🔄 Starting to fetch images...');
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get(getApiUrl('images'), {
        headers: { 
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Accept': 'application/json'
        }
      });
      
      console.log('📥 Response received:', response.status);
      
      // 確保數據格式正確
      const data = Array.isArray(response.data) ? response.data : [];
      const formattedData = data.map(image => ({
        id: image.id || `${image.name}-${image.tag}`,
        name: image.name,
        tag: image.tag,
        size: image.size,
        created: image.created,
        repository: image.repository,
        status: image.status || 'active'
      }));
      
      console.log('📦 Formatted data:', formattedData);
      setImages(formattedData);
      
    } catch (error) {
      console.error('❌ Error fetching images:', error.response || error);
      setError(error.response?.data?.message || error.message || '獲取鏡像列表失敗');
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
      const response = await fetch(getApiUrl('api/images'), {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch images');
      }
      
      const data = await response.json();
      const validData = Array.isArray(data) ? data : [];
      setImages(validData);
      setFilteredImages(validData.filter(image => 
        image.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        image.tag.toLowerCase().includes(searchTerm.toLowerCase())
      ));
    } catch (error) {
      console.error('Error fetching images:', error);
      setError(error.message);
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
    console.log('👉 Selected images:', newSelected);
  };

  const isSelected = (imageName, imageTag) => {
    return selected.indexOf(`${imageName}:${imageTag}`) !== -1;
  };

  const handleBulkDelete = async () => {
    try {
      console.log('🗑️ Starting bulk delete for images:', selected);
      
      const response = await fetch('http://localhost:3001/api/images/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          images: selected
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || t('imageManagement:message.deleteFailed'));
      }

      const result = await response.json();
      console.log('✅ Delete result:', result);

      const hasErrors = result.results.some(r => r.status === 'error');
      
      if (hasErrors) {
        enqueueSnackbar(t('imageManagement:message.partialDeleteFailed'), {
          variant: 'warning',
          anchorOrigin: {
            vertical: 'bottom',
            horizontal: 'right'
          }
        });
      } else {
        enqueueSnackbar(t('imageManagement:message.deleteSuccess'), {
          variant: 'success',
          anchorOrigin: {
            vertical: 'bottom',
            horizontal: 'right'
          }
        });
      }

      fetchImages();
      setSelected([]);
    } catch (error) {
      console.error('❌ Error deleting images:', error);
      enqueueSnackbar(error.message || t('imageManagement:message.deleteFailed'), {
        variant: 'error',
        anchorOrigin: {
          vertical: 'bottom',
          horizontal: 'right'
        }
      });
    }
  };

  const handlePackage = async () => {
    console.log('📦 Starting package process...');
    setPackagingStatus(prev => ({ ...prev, loading: true, progress: 0 }));
    
    const snackbarKey = enqueueSnackbar(t('imageManagement:message.packageStart'), {
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
      const selectedImages = selected.map(imageKey => {
        const [name, tag] = imageKey.split(':');
        return {
          name,
          tag,
          fullName: imageKey
        };
      });

      console.log('📦 Images to package:', selectedImages);

      closeSnackbar(snackbarKey);
      const preparingKey = enqueueSnackbar(t('imageManagement:message.preparing'), {
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

      const response = await fetch('http://localhost:3001/api/images/package', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ images: selectedImages })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to package images');
      }

      closeSnackbar(preparingKey);
      const downloadingKey = enqueueSnackbar(t('imageManagement.message.downloading'), {
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

      const today = new Date().toISOString().split('T')[0];
      const filename = `images-${today}.tar`;
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      closeSnackbar(downloadingKey);
        enqueueSnackbar(t('imageManagement.message.downloadSuccess'), { 
        variant: 'success',
        autoHideDuration: 3000,
        anchorOrigin: {
          vertical: 'bottom',
          horizontal: 'right'
        }
      });
    } catch (error) {
      console.error('❌ Error packaging images:', error);
      enqueueSnackbar(error.message || t('imageManagement.message.packageFailed'), { 
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
    <Box sx={{ width: '100%' }}>
      <Paper sx={{ mb: 2, p: 2 }}>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          gap: 2 
        }}>
          <Typography variant="h6" component="div">
            {t('imageManagement:common.imageList')} ({images.length})
          </Typography>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center',
            gap: 1,
            flex: 1,
            maxWidth: 500,
            ml: 2
          }}>
            <TextField
              size="small"
              placeholder={t('imageManagement:message.searchImages')}
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              sx={{ flex: 1 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
                endAdornment: searchTerm && (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={handleClearSearch}
                      edge="end"
                    >
                      <ClearIcon />
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
            <IconButton onClick={() => setConfigOpen(true)}>
              <SettingsIcon />
            </IconButton>
            <IconButton onClick={handleRefresh} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Box>
        </Box>
      </Paper>

      <Paper sx={{ width: '100%', mb: 3 }}>
        <TableContainer sx={{ maxHeight: TABLE_HEIGHT }}>
          <Table stickyHeader>
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

      <Paper sx={{ p: 2, mt: 2 }}>
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
