import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import logger from '../lib/logger';
import { ROLES } from '../lib/constants';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');

      if (token && savedUser) {
        try {
          setUser(JSON.parse(savedUser));
          // Verify token is still valid
          const response = await authAPI.getMe();
          setUser(response.data.data);
          localStorage.setItem('user', JSON.stringify(response.data.data));
        } catch (error) {
          logger.error('Auth initialization error', error);
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    const response = await authAPI.login({ email, password });
    const { token, ...userData } = response.data.data;

    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);

    return userData;
  };

  const signup = async (data) => {
    const response = await authAPI.signup(data);
    const { token, ...userData } = response.data.data;

    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);

    return userData;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  // Check if user has a specific permission
  const hasPermission = (permission) => {
    if (!user) return false;
    // Admin has all permissions
    if (user.role?.name === ROLES.ADMIN) return true;
    return user.permissions?.includes(permission);
  };

  // Check if user has any of the specified permissions
  const hasAnyPermission = (...permissions) => {
    if (!user) return false;
    if (user.role?.name === ROLES.ADMIN) return true;
    return permissions.some((p) => user.permissions?.includes(p));
  };

  // Get role name
  const getRoleName = () => user?.role?.name || '';

  const value = {
    user,
    loading,
    login,
    signup,
    logout,
    isAuthenticated: !!user,
    organizationId: user?.organizationId,
    organizationName: user?.organizationName,
    isAdmin: user?.role?.name === ROLES.ADMIN,
    isSupervisor: user?.role?.name === ROLES.SUPERVISOR,
    isWorker: user?.role?.name === ROLES.WORKER,
    isManager: user?.role?.name === ROLES.MANAGER, // custom role
    hasPermission,
    hasAnyPermission,
    getRoleName,
    permissions: user?.permissions || [],
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
