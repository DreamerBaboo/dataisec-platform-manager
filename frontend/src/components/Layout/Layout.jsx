import React from 'react';
import { Box } from '@mui/material';
import { Outlet } from 'react-router-dom';
import SideMenu from './SideMenu';
import MainPage from '../../pages/MainPage';

const Layout = () => {
  const [open, setOpen] = React.useState(true);

  const toggleDrawer = () => {
    setOpen(!open);
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <SideMenu open={open} toggleDrawer={toggleDrawer} />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          mt: 8,
          ml: open ? '240px' : '56px',
          transition: theme => theme.transitions.create('margin', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        }}
      >
        <MainPage />
      </Box>
    </Box>
  );
};

export default Layout; 