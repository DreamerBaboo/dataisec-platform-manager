import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Dashboard from './Dashboard';
import PodManagement from './PodManagement/PodManagement';
import PodDeploymentManagement from './PodDeployment/PodDeploymentManagement';
import ImageManagement from './ImageManagement/ImageManagement';
import LogViewer from './LogViewer/LogViewer';
import Profile from './Profile/Profile';

const MainPage = () => {
  return (
    <Routes>
      <Route index element={<Dashboard />} />
      <Route path="pod-dashboard" element={<PodDashboard />} />
      <Route path="pods" element={<PodManagement />} />
      <Route path="pod-deployment/*" element={<PodDeploymentManagement />} />
      <Route path="images" element={<ImageManagement />} />
      <Route path="logs" element={<LogViewer />} />
      <Route path="profile" element={<Profile />} />
    </Routes>
  );
};

export default MainPage; 