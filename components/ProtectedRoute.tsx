
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('admin' | 'client')[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    // Redirect to login page with the return url
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user && allowedRoles && !allowedRoles.includes(user.role)) {
    // User is logged in but doesn't have permission
    // Redirect to their appropriate dashboard
    if (user.role === 'admin') {
        return <Navigate to="/admin" replace />;
    } else {
        return <Navigate to="/portal" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
