import React, { createContext, useState, useEffect } from 'react';
import AuthAPI from '../api/authAPI';
import { getToken } from '../utils/tokenStorage';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Check if user is authenticated on initial load
  useEffect(() => {
    const initAuth = async () => {
      const token = getToken();
      if (token) {
        try {
          const userData = await AuthAPI.getCurrentUser();
          setUser(userData);
        } catch (err) {
          console.error('Failed to get current user:', err);
          setError('Session expired. Please login again.');
        }
      }
      setLoading(false);
    };
    
    initAuth();
  }, []);
  
  // Login function
  const login = async (credentials) => {
    try {
      setLoading(true);
      setError(null);
      const { user } = await AuthAPI.login(credentials);
      setUser(user);
      return user;
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  // Logout function
  const logout = async () => {
    try {
      setLoading(true);
      await AuthAPI.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      setLoading(false);
    }
  };
  
  // Check if user has specific role
  const hasRole = (role) => {
    return user && user.role === role;
  };
  
  // Check if user is authenticated
  const isAuthenticated = () => {
    return !!user;
  };
  
  const contextValue = {
    user,
    loading,
    error,
    login,
    logout,
    hasRole,
    isAuthenticated
  };
  
  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
