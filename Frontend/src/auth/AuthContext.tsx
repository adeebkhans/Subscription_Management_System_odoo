import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { api } from '../lib/api';
import type { LoginInput, SignupInput, User } from '../types';

type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

interface AuthContextValue {
  user: User | null;
  status: AuthStatus;
  isAuthenticated: boolean;
  login: (input: LoginInput) => Promise<User>;
  signup: (input: SignupInput) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      try {
        const current = await api.auth.me();
        if (!active) return;
        setUser(current);
        setStatus('authenticated');
        return;
      } catch {
        // Access token may have expired; try the refresh cookie next.
      }

      try {
        await api.auth.refresh();
        const current = await api.auth.me();
        if (!active) return;
        setUser(current);
        setStatus('authenticated');
        return;
      } catch {
        // No usable session.
      }

      if (active) {
        setUser(null);
        setStatus('anonymous');
      }
    }

    void bootstrap();

    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (input: LoginInput) => {
    const result = await api.auth.login(input);
    setUser(result.user);
    setStatus('authenticated');
    return result.user;
  }, []);

  const signup = useCallback(async (input: SignupInput) => {
    const result = await api.auth.signup(input);
    setUser(result.user);
    setStatus('authenticated');
    return result.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.auth.logout();
    } finally {
      setUser(null);
      setStatus('anonymous');
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const current = await api.auth.me();
      setUser(current);
      setStatus('authenticated');
      return current;
    } catch {
      setUser(null);
      setStatus('anonymous');
      return null;
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      isAuthenticated: status === 'authenticated' && user !== null,
      login,
      signup,
      logout,
      refreshUser
    }),
    [user, status, login, signup, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider');
  }
  return context;
}
