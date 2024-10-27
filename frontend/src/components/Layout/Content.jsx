import React from 'react';
import { Box, Toolbar } from '@mui/material';

const Content = ({ children, drawerWidth }) => {
  return (
    <Box
      component="main"
      sx={{
        flexGrow: 1,
        p: 3,
        width: { sm: `calc(100% - ${drawerWidth}px)` },
        ml: { sm: `${drawerWidth}px` },
      }}
    >
      <Toolbar />
      {children}
    </Box>
  );
};

export default Content;
