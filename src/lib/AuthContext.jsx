import React, { createContext, useContext, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const AuthContext = createContext({
  user: null,
  isLoadingAuth: false,
  isLoadingPublicSettings: false,
  authError: null,
  navigateToLogin: () => {},
  logout: () => {},
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (base44?.auth?.me) {
          const userData = await base44.auth.me();
          setUser(userData);
        }
      } catch (err) {
        // public access allowed
      }
    };
    checkAuth();
  }, []);

  const navigateToLogin = () => {
    if (base44?.auth?.redirectToLogin) {
      base44.auth.redirectToLogin();
    }
  };

  const logout = async () => {
    if (base44?.auth?.logout) {
      await base44.auth.logout();
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoadingAuth,
        isLoadingPublicSettings,
        authError,
        navigateToLogin,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
