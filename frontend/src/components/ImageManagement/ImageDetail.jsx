import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Divider
} from '@mui/material';
import { imageService } from '../../services/imageService';
import { formatBytes, formatDate } from '../../utils/formatters';

const ImageDetail = ({ image }) => {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (image) {
      fetchImageDetail();
    }
  }, [image]);

  const fetchImageDetail = async () => {
    try {
      const response = await imageService.getImageDetail(image.name);
      setDetail(response.data);
    } catch (error) {
      console.error('Failed to fetch image detail:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <CircularProgress />;
  }

  if (!detail) {
    return <Typography color="error">無法獲取鏡像詳情</Typography>;
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        鏡像詳情
      </Typography>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          基本信息
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableBody>
              <TableRow>
                <TableCell component="th">ID</TableCell>
                <TableCell>{detail.Id}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell component="th">創建時間</TableCell>
                <TableCell>{formatDate(detail.Created)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell component="th">大小</TableCell>
                <TableCell>{formatBytes(detail.Size)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell component="th">架構</TableCell>
                <TableCell>{detail.Architecture}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell component="th">操作系統</TableCell>
                <TableCell>{detail.Os}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          層信息
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>層ID</TableCell>
                <TableCell>大小</TableCell>
                <TableCell>創建時間</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {detail.RootFS?.Layers?.map((layer, index) => (
                <TableRow key={layer}>
                  <TableCell>{layer.substring(7, 19)}</TableCell>
                  <TableCell>{formatBytes(detail.Size)}</TableCell>
                  <TableCell>{formatDate(detail.Created)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          配置信息
        </Typography>
        <Box component="pre" sx={{ 
          p: 2, 
          bgcolor: 'grey.100',
          borderRadius: 1,
          overflow: 'auto'
        }}>
          {JSON.stringify(detail.Config, null, 2)}
        </Box>
      </Paper>
    </Box>
  );
};

export default ImageDetail; 