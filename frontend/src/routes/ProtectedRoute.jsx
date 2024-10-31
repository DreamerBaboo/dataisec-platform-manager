import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { usePermissions } from '../hooks/usePermissions';

const ProtectedRoute = ({ permission, children }) => {
  const { hasPermission } = usePermissions();

  if (!hasPermission(permission)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children || <Outlet />;
};

export default ProtectedRoute; 