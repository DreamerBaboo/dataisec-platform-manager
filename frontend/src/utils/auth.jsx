import React, { createContext, useContext, useState } from 'react';
import api from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const login = async (username, password) => {
    try {
      console.info('Attempting login to:', api.getBaseUrl()); // Debug log
      const response = await api.post('api/auth/login', {
        username,
        password
      });
      
      if (response.token) {
        localStorage.setItem('token', response.token);
        setUser(response.user);
        return response;
      }
      throw new Error('Login failed');
    } catch (error) {
      console.error('Login error details:', {
        message: error.message,
        status: error.status,
        stack: error.stack
      });
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const value = {
    user,
    login,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
