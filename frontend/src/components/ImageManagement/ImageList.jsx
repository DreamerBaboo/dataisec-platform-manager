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
import { useTranslation } from 'react-i18next';
import ImageUpload from './ImageUpload';
import ImageDetails from './ImageDetails';
import { useSnackbar } from 'notistack';
import RepositoryConfig from './RepositoryConfig';

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
  const [configOpen, setConfigOpen] = useState(false);
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();
  const [order, setOrder] = useState('desc');
  const [orderBy, setOrderBy] = useState('uploadDate');
  const ROW_HEIGHT = 53; // 每行的高度（根據 MUI 的默認值）
  const HEADER_HEIGHT = 56; // 表頭高度
  const ROWS_PER_PAGE = 10; // 默認顯示 10 行
  const TABLE_HEIGHT = ROW_HEIGHT * ROWS_PER_PAGE + HEADER_HEIGHT;

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

  const handleRefresh = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('http://localhost:3001/api/images', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch images');
      }
      
      const data = await response.json();
      setImages(data);
      setFilteredImages(data.filter(image => 
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

  // 清除搜索內容
  const handleClearSearch = () => {
    setSearchTerm('');
    setFilteredImages(images);
  };

  // 搜索處理
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
  };

  const isSelected = (imageName, imageTag) => {
    return selected.indexOf(`${imageName}:${imageTag}`) !== -1;
  };

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
    console.log('📦 Starting package process...');
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
      // 從選中的項目中獲取完整的鏡像信息
      const selectedImages = selected.map(imageKey => {
        const [name, tag] = imageKey.split(':');
        return {
          name,
          tag,
          fullName: imageKey
        };
      });

      console.log('📦 Images to package:', selectedImages);

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
      enqueueSnackbar(error.message || '打包鏡像失敗', { 
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

  // 使用 MUI 的排序處理函數
  const handleRequestSort = (event, property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  // 使用 MUI 的表頭組件
  const headCells = [
    { id: 'name', label: t('name') },
    { id: 'tag', label: t('tag') },
    { id: 'size', label: t('size'), numeric: true },
    { id: 'uploadDate', label: t('uploadDate') },
    { id: 'status', label: t('status') },
  ];

  // 修改格式化大小的函數
  const formatSize = (sizeString) => {
    // 如果是數字，使用標準的格式化邏輯
    if (typeof sizeString === 'number') {
      const sizes = ['B', 'KB', 'MB', 'GB'];
      if (sizeString === 0) return '0 B';
      const i = parseInt(Math.floor(Math.log(sizeString) / Math.log(1024)), 10);
      return `${Math.round(sizeString / (1024 ** i), 2)} ${sizes[i]}`;
    }

    // 如果是字符串（從倉庫獲取的格式），直接返回
    if (typeof sizeString === 'string') {
      // 處理可能的 "123MB" 或 "123 MB" 格式
      return sizeString.replace(/([0-9.]+)([A-Z]+)/, '$1 $2');
    }

    return 'Unknown size';
  };

  // 修改日期格式化數
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    
    try {
      // 處理不同的日期格式
      let date;
      if (dateString.includes('ago')) {
        // 處理 "x days ago" 格式
        const now = new Date();
        const days = parseInt(dateString.match(/\d+/)[0]);
        date = new Date(now.setDate(now.getDate() - days));
      } else if (dateString.includes('About')) {
        // 處理 "About a minute ago" 等格式
        date = new Date();
      } else {
        date = new Date(dateString);
      }

      // 檢查日期是否有效
      if (isNaN(date.getTime())) {
        console.warn('Invalid date:', dateString);
        return dateString; // 如果無法解析，返回原始字符串
      }

      // 使用 Intl.DateTimeFormat 格式化日期
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
      return dateString; // 發生錯誤時返回原始字符串
    }
  };

  // // 修改生成唯一鍵的函數
  // const generateUniqueKey = (image) => {
  //   // 使用完整的鏡像名稱（包括倉庫地址和標籤）作為唯一鍵
  //   const fullName = image.name;
  //   return fullName;  // 直接使用完整名稱作為鍵
  // };

  return (
    <Box sx={{ width: '100%' }}>
      {/* 工具欄 */}
      <Paper sx={{ mb: 2, p: 2 }}>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          gap: 2 
        }}>
          <Typography variant="h6" component="div">
            {t('imageList')} ({images.length})
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
              placeholder={t('searchImages')}
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

      {/* 表格 */}
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
                <TableCell align="center">{t('actions')}</TableCell>
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
                      {error ? t('errorLoadingImages') : t('noImagesFound')}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* 操作按鈕區 */}
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

      <RepositoryConfig 
        open={configOpen}
        onClose={handleConfigSave}
      />
    </Box>
  );
};

// MUI 的排序輔助函數
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

export default ImageList;