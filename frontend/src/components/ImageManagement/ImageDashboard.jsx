import React from 'react';
import { Grid, Paper, Box } from '@mui/material';
import ImageStats from './ImageStats';
import ImageFilter from './ImageFilter';
import RegistryHealth from './RegistryHealth';

const ImageDashboard = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Grid container spacing={3}>
        {/* 統計信息 */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <ImageStats />
          </Paper>
        </Grid>

        {/* 過濾器 */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <ImageFilter />
          </Paper>
        </Grid>

        {/* Registry 狀態 */}
        <Grid item xs={12} md={6}>
          <RegistryHealth />
        </Grid>
      </Grid>
    </Box>
  );
};

export default ImageDashboard; 