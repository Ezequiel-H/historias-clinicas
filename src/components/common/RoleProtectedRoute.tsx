import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { CircularProgress, Box } from '@mui/material';

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('admin' | 'doctor' | 'investigador_principal')[];
  blockedRoles?: ('admin' | 'doctor' | 'investigador_principal')[];
}

/**
 * Component that protects routes based on user roles.
 * If allowedRoles is specified, only those roles can access.
 * If blockedRoles is specified, those roles are blocked.
 * Doctors are automatically redirected to their dashboard if they try to access blocked routes.
 */
export const RoleProtectedRoute: React.FC<RoleProtectedRouteProps> = ({
  children,
  allowedRoles,
  blockedRoles,
}) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check if role is blocked
  if (blockedRoles && blockedRoles.includes(user.role)) {
    // Redirect doctors to their dashboard
    if (user.role === 'doctor') {
      return <Navigate to="/doctor/dashboard" replace />;
    }
    // For other blocked roles, redirect to dashboard
    return <Navigate to="/dashboard" replace />;
  }

  // Check if role is allowed
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect doctors to their dashboard
    if (user.role === 'doctor') {
      return <Navigate to="/doctor/dashboard" replace />;
    }
    // For other roles, redirect to dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

