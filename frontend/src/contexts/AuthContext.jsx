import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 模擬從後端獲取用戶信息
    const mockUser = {
      id: '1',
      username: 'admin',
      role: 'admin',
      permissions: [
        'image:view',
        'image:pull',
        'image:push',
        'image:delete',
        'image:tag',
        'image:manage'
      ]
    };
    setUser(mockUser);
    setLoading(false);
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}; 