import React from 'react';
import { Grid2, Paper, Box } from '@mui/material';
import ImageStats from './ImageStats';
import ImageFilter from './ImageFilter';
import RegistryHealth from './RegistryHealth';

const ImageDashboard = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Grid2 container spacing={3}>
        {/* 統計信息 */}
        <Grid2 item xs={12}>
          <Paper sx={{ p: 2 }}>
            <ImageStats />
          </Paper>
        </Grid2>

        {/* 過濾器 */}
        <Grid2 item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <ImageFilter />
          </Paper>
        </Grid2>

        {/* Registry 狀態 */}
        <Grid2 item xs={12} md={6}>
          <RegistryHealth />
        </Grid2>
      </Grid2>
    </Box>
  );
};

export default ImageDashboard; 