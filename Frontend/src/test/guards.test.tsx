import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../auth/AuthContext';
import { PublicOnly, RequireAuth, RequireRole } from '../auth/guards';
import type { User } from '../types';

vi.mock('../auth/AuthContext', () => ({
  useAuth: vi.fn()
}));

const mockedUseAuth = vi.mocked(useAuth);

const admin: User = {
  id: '1',
  name: 'Admin User',
  email: 'admin@example.com',
  role: 'ADMIN'
};

const customer: User = {
  id: '2',
  name: 'Customer User',
  email: 'customer@example.com',
  role: 'CUSTOMER'
};

function authValue(user: User | null, status: 'loading' | 'authenticated' | 'anonymous') {
  return {
    user,
    status,
    isAuthenticated: status === 'authenticated' && user !== null,
    login: vi.fn(),
    signup: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn()
  };
}

function renderProtectedRoute(initialPath = '/app') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route element={<RequireAuth />}>
          <Route path="/app" element={<div>Protected content</div>} />
        </Route>
        <Route path="/login" element={<div>Login screen</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('route guards', () => {
  beforeEach(() => {
    mockedUseAuth.mockReset();
  });

  it('redirects anonymous users to login', () => {
    mockedUseAuth.mockReturnValue(authValue(null, 'anonymous'));
    renderProtectedRoute();
    expect(screen.getByText('Login screen')).toBeInTheDocument();
  });

  it('renders protected content for authenticated users', () => {
    mockedUseAuth.mockReturnValue(authValue(admin, 'authenticated'));
    renderProtectedRoute();
    expect(screen.getByText('Protected content')).toBeInTheDocument();
  });

  it('keeps authenticated users out of public-only routes', () => {
    mockedUseAuth.mockReturnValue(authValue(admin, 'authenticated'));
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route element={<PublicOnly />}>
            <Route path="/login" element={<div>Login screen</div>} />
          </Route>
          <Route path="/app" element={<div>Protected content</div>} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText('Protected content')).toBeInTheDocument();
  });

  it('shows a forbidden state when the role is not allowed', () => {
    mockedUseAuth.mockReturnValue(authValue(customer, 'authenticated'));
    render(
      <MemoryRouter>
        <RequireRole roles={['ADMIN']}>
          <div>Admin only</div>
        </RequireRole>
      </MemoryRouter>
    );
    expect(screen.getByText(/do not have access/i)).toBeInTheDocument();
  });

  it('renders role-protected content when the role matches', () => {
    mockedUseAuth.mockReturnValue(authValue(admin, 'authenticated'));
    render(
      <MemoryRouter>
        <RequireRole roles={['ADMIN']}>
          <div>Admin only</div>
        </RequireRole>
      </MemoryRouter>
    );
    expect(screen.getByText('Admin only')).toBeInTheDocument();
  });
});
