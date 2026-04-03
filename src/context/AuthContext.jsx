import { createContext, useCallback, useContext, useMemo, useState, useEffect } from 'react';
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

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }, []);

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
  }, [logout]);

  const login = useCallback(async (email, password) => {
    const response = await authAPI.login({ email, password });
    const { token, ...userData } = response.data.data;

    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);

    return userData;
  }, []);

  const signup = useCallback(async (data) => {
    const response = await authAPI.signup(data);
    const { token, ...userData } = response.data.data;

    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);

    return userData;
  }, []);

  const hasPermission = useCallback(
    (permission) => {
      if (!user) return false;
      if (user.role?.name === ROLES.ADMIN) return true;
      return user.permissions?.includes(permission);
    },
    [user]
  );

  const hasAnyPermission = useCallback(
    (...permissions) => {
      if (!user) return false;
      if (user.role?.name === ROLES.ADMIN) return true;
      return permissions.some((p) => user.permissions?.includes(p));
    },
    [user]
  );

  const getRoleName = useCallback(() => user?.role?.name || '', [user]);

  const value = useMemo(
    () => ({
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
      isManager: user?.role?.name === ROLES.MANAGER,
      hasPermission,
      hasAnyPermission,
      getRoleName,
      permissions: user?.permissions || [],
    }),
    [
      user,
      loading,
      login,
      signup,
      logout,
      hasPermission,
      hasAnyPermission,
      getRoleName,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
