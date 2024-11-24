import React from 'react';
import { Box, Toolbar, useTheme } from '@mui/material';

const Content = ({ children, drawerWidth, open }) => {
  const theme = useTheme();
  
  return (
    <Box
      component="main"
      sx={{
        flexGrow: 1,
        p: 3,
        width: { sm: `calc(100% - ${open ? drawerWidth : 56}px)` },
        ml: { sm: `${open ? drawerWidth : 56}px` },
        transition: theme.transitions.create(['width', 'margin-left'], {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.enteringScreen,
        }),
      }}
    >
      <Toolbar />
      {children}
    </Box>
  );
};

export default Content;
