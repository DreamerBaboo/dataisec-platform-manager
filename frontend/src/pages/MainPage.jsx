import React, { useState, useEffect } from 'react';
import { Routes, Route, Outlet } from 'react-router-dom';
import { Box, CssBaseline, useTheme } from '@mui/material';
import TopBar from '../components/Layout/TopBar';
import SideMenu from '../components/Layout/SideMenu';
import SystemDashboard from '../components/Dashboard/SystemDashboard';
import PodDashboard from '../components/Dashboard/PodDashboard';
import PodManagement from '../components/PodManagement/PodManagement';
import CreatePod from '../components/PodManagement/CreatePod';
import EditPod from '../components/PodManagement/EditPod';
import PodDeploymentManagement from '../components/PodDeployment/PodDeploymentManagement';
import LogViewer from '../components/SystemLogs/LogViewer';
import UserProfile from '../components/UserProfile/UserProfile';
import ImageList from '../components/ImageManagement/ImageList';
import ImageUpload from '../components/ImageManagement/ImageUpload';
import { useAppTranslation } from '../hooks/useAppTranslation';
import { logger } from '../utils/logger'; // 導入 logger

function MainPage() {
  const [open, setOpen] = useState(false);
  const theme = useTheme();
  const { t, currentLanguage, changeLanguage, languages } = useAppTranslation(['navigation', 'common']);
 

  const toggleDrawer = () => {
    logger.info('Toggling drawer. Current state:', open);
    setOpen(!open);
  };

  useEffect(() => {
    logger.info('Drawer state changed to:', open);
  }, [open]);

  return (
    <Box sx={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <CssBaseline />
      <TopBar 
        open={open} 
        handleDrawerToggle={toggleDrawer}
        drawerWidth={240}
      />
      <SideMenu 
        open={open} 
        toggleDrawer={toggleDrawer}
        drawerWidth={240}
        variant="permanent"
        sx={{
          mt: '64px',
          height: 'calc(100vh - 64px)',
          '& .MuiDrawer-paper': {
            mt: '64px',
            height: 'calc(100vh - 64px)',
          }
        }}
      />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: '10px',
          width: '100%',
          height: 'calc(100% - 80px)',
          mt: '70px',
          overflow: 'auto'
        }}
      >
        <Routes>
          <Route path="/" element={<SystemDashboard />} />
          <Route path="/pod-dashboard/*" element={<PodDashboard />} />
          <Route path="/pods/*" element={<PodManagement />} />
          <Route path="/pods/create" element={<CreatePod />} />
          <Route path="/pods/edit/:id" element={<EditPod />} />
          <Route path="/logs" element={<LogViewer />} />
          <Route path="/profile" element={<UserProfile />} />
          <Route path="/images" element={<ImageList />} />
          <Route path="/images/upload" element={<ImageUpload standalone />} />
          <Route path="/pod-deployment/*" element={<PodDeploymentManagement />} />
        </Routes>
      </Box>
    </Box>
  );
}

export default MainPage;
