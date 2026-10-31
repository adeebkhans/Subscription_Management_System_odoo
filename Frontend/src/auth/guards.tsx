import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { LoadingScreen } from '../pages/LoadingScreen';
import { ForbiddenPage } from '../pages/ForbiddenPage';
import type { Role } from '../types';
import { useAuth } from './AuthContext';

export function RequireAuth() {
  const { status, isAuthenticated } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <LoadingScreen />;
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}

export function PublicOnly() {
  const { status, isAuthenticated } = useAuth();

  if (status === 'loading') return <LoadingScreen />;
  if (isAuthenticated) return <Navigate to="/app" replace />;
  return <Outlet />;
}

export function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <ForbiddenPage />;
  return <>{children}</>;
}
