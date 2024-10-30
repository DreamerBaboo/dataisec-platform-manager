import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { IMAGE_PERMISSIONS } from '../config/permissions';
import ProtectedRoute from './ProtectedRoute';

// 導入組件
import ImageDashboard from '../components/ImageManagement/ImageDashboard';
import ImageList from '../components/ImageManagement/ImageList';
import TagManagement from '../components/ImageManagement/TagManagement';
import ImageFilter from '../components/ImageManagement/ImageFilter';
import RegistryManagement from '../components/ImageManagement/RegistryManagement';
import RegistryHealth from '../components/ImageManagement/RegistryHealth';

const AppRoutes = () => {
  return (
    <Routes>
      {/* 鏡像管理路由 */}
      <Route path="/images" element={<ProtectedRoute permission={IMAGE_PERMISSIONS.VIEW} />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<ImageDashboard />} />
        <Route path="list" element={<ImageList />} />
        <Route 
          path="tags" 
          element={
            <ProtectedRoute permission={IMAGE_PERMISSIONS.TAG}>
              <TagManagement />
            </ProtectedRoute>
          } 
        />
        <Route path="filter" element={<ImageFilter />} />
        <Route 
          path="registry" 
          element={
            <ProtectedRoute permission={IMAGE_PERMISSIONS.MANAGE}>
              <RegistryManagement />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="health" 
          element={
            <ProtectedRoute permission={IMAGE_PERMISSIONS.MANAGE}>
              <RegistryHealth />
            </ProtectedRoute>
          } 
        />
      </Route>
    </Routes>
  );
};

export default AppRoutes; 