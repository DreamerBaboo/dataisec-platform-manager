import React from 'react';
import { Box, Container, Paper } from '@mui/material';
import { Outlet } from 'react-router-dom';

const ImageManagementLayout = () => {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ width: '100%' }}>
          <Outlet />
        </Box>
      </Paper>
    </Container>
  );
};

export default ImageManagementLayout; 