import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

export const usePermissions = () => {
  const { user } = useContext(AuthContext);

  const hasPermission = (permission) => {
    if (!user || !user.permissions) {
      return false;
    }

    // 如果用戶是管理員,給予所有權限
    if (user.role === 'admin') {
      return true;
    }

    // 檢查用戶是否具有特定權限
    return user.permissions.includes(permission);
  };

  return { hasPermission };
}; 