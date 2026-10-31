import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../auth/AuthContext';
import { LoginPage } from '../pages/auth/LoginPage';

vi.mock('../auth/AuthContext', () => ({
  useAuth: vi.fn()
}));

const mockedUseAuth = vi.mocked(useAuth);

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/app" element={<div>Dashboard screen</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('LoginPage', () => {
  const login = vi.fn();

  beforeEach(() => {
    login.mockReset();
    mockedUseAuth.mockReturnValue({
      user: null,
      status: 'anonymous',
      isAuthenticated: false,
      login,
      signup: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn()
    });
  });

  it('shows validation messages for an empty form', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText('Email is required')).toBeInTheDocument();
    expect(await screen.findByText('Password is required')).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });

  it('submits valid credentials and navigates to the workspace', async () => {
    const user = userEvent.setup();
    login.mockResolvedValue({
      id: '1',
      name: 'Admin User',
      email: 'admin@example.com',
      role: 'ADMIN'
    });
    renderLogin();

    await user.type(screen.getByLabelText(/email address/i), 'admin@example.com');
    await user.type(screen.getByLabelText(/^password/i), 'Admin@1234');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(login).toHaveBeenCalledWith({
      email: 'admin@example.com',
      password: 'Admin@1234'
    });
    expect(await screen.findByText('Dashboard screen')).toBeInTheDocument();
  });
});
