import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Box, CssBaseline, useTheme } from '@mui/material';
import TopBar from '../components/Layout/TopBar';
import SideMenu from '../components/Layout/SideMenu';
import SystemDashboard from '../components/Dashboard/SystemDashboard';
import PodDashboard from '../components/Dashboard/PodDashboard';
import PodManagement from '../components/PodManagement/PodManagement';
import CreatePod from '../components/PodManagement/CreatePod';
import EditPod from '../components/PodManagement/EditPod';
import LogViewer from '../components/SystemLogs/LogViewer';
import UserProfile from '../components/UserProfile/UserProfile';
import ImageList from '../components/ImageManagement/ImageList';
import ImageUpload from '../components/ImageManagement/ImageUpload';

function MainPage() {
  const [open, setOpen] = useState(true);
  const theme = useTheme();

  const toggleDrawer = () => {
    console.log('Toggling drawer. Current state:', open);
    setOpen(!open);
  };

  useEffect(() => {
    console.log('Drawer state changed to:', open);
  }, [open]);

  return (
    <Box sx={{ display: 'contents', width: '100%', height: '100vh', overflow: 'hidden' }}>
      <CssBaseline />
      <TopBar open={open} handleDrawerToggle={toggleDrawer} />
      <SideMenu open={open} toggleDrawer={toggleDrawer} />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${open ? 240 : 56}px)` },
          ml: { sm: `${open ? 240 : 56}px` },
          mt: ['48px', '56px', '64px'],
          transition: theme.transitions.create('margin', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        <Routes>
          <Route path="/" element={<SystemDashboard />} />
          <Route path="/pod-dashboard" element={<PodDashboard />} />
          <Route path="/pods" element={<PodManagement />} />
          <Route path="/pods/create" element={<CreatePod />} />
          <Route path="/pods/edit/:id" element={<EditPod />} />
          <Route path="/logs" element={<LogViewer />} />
          <Route path="/profile" element={<UserProfile />} />
          <Route path="/images" element={<ImageList />} />
          <Route path="/images/upload" element={<ImageUpload standalone />} />
        </Routes>
      </Box>
    </Box>
  );
}

export default MainPage;
