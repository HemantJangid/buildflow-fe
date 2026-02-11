import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, requiredPermission = null, requiredAnyPermission = null, allowedRoles = [] }) => {
  const { isAuthenticated, user, loading, hasPermission, hasAnyPermission } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check permission-based access (any of the specified permissions)
  if (requiredAnyPermission && Array.isArray(requiredAnyPermission) && !hasAnyPermission(...requiredAnyPermission)) {
    return <Navigate to="/dashboard" replace />;
  }

  // Check permission-based access (single permission)
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/dashboard" replace />;
  }

  // Role-based check (when allowedRoles is specified)
  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role?.name)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;
