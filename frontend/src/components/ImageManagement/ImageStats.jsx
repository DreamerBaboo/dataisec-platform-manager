import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Tooltip
} from '@mui/material';
import StorageIcon from '@mui/icons-material/Storage';
import LayersIcon from '@mui/icons-material/Layers';
import { formatBytes } from '../../utils/formatters';

const StatCard = ({ title, value, icon, tooltip }) => (
  <Tooltip title={tooltip}>
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        {icon}
        <Box sx={{ ml: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {title}
          </Typography>
          <Typography variant="h6">
            {value}
          </Typography>
        </Box>
      </Box>
    </Paper>
  </Tooltip>
);

const ImageStats = ({ images }) => {
  const totalSize = images.reduce((acc, img) => acc + img.size, 0);
  const uniqueImages = new Set(images.map(img => img.name)).size;

  return (
    <Grid container spacing={3} sx={{ mb: 3 }}>
      <Grid item xs={12} sm={6}>
        <StatCard
          title="總鏡像數"
          value={images.length}
          icon={<StorageIcon color="primary" />}
          tooltip="包含所有標籤的鏡像總數"
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <StatCard
          title="唯一鏡像數"
          value={uniqueImages}
          icon={<LayersIcon color="primary" />}
          tooltip="不包含重複標籤的鏡像數"
        />
      </Grid>
      <Grid item xs={12}>
        <StatCard
          title="總佔用空間"
          value={formatBytes(totalSize)}
          icon={<StorageIcon color="primary" />}
          tooltip="所有鏡像佔用的總磁盤空間"
        />
      </Grid>
    </Grid>
  );
};

export default ImageStats; 