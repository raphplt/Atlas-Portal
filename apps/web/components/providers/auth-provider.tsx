'use client';

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { anonymousRequest, apiRequest } from '@/lib/auth/api-client';
import { readStoredSession, writeStoredSession } from '@/lib/auth/storage';
import { SessionState } from '@/lib/auth/types';

interface LoginPayload {
  email: string;
  password: string;
}

interface AuthContextValue {
  session: SessionState | null;
  ready: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  setSession: (session: SessionState | null) => void;
  logout: () => Promise<void>;
  request: <T>(path: string, options?: { method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'; body?: unknown }) => Promise<T>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionState | null>(null);
  const [ready, setReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const stored = readStoredSession();
    setSession(stored);
    setReady(true);
  }, []);

  const updateSession = useCallback((nextSession: SessionState | null) => {
    setSession(nextSession);
    writeStoredSession(nextSession);
  }, []);

  const login = useCallback(async (payload: LoginPayload) => {
    const response = await anonymousRequest<SessionState & { workspace: SessionState['workspace'] }>(
      '/auth/login',
      'POST',
      payload,
    );
    updateSession(response);
  }, [updateSession]);

  const logout = useCallback(async () => {
    if (session?.refreshToken) {
      await anonymousRequest('/auth/logout', 'POST', { refreshToken: session.refreshToken }).catch(() => undefined);
    }

    updateSession(null);
    router.refresh();
  }, [router, session?.refreshToken, updateSession]);

  const request = useCallback(async <T,>(
    path: string,
    options: { method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'; body?: unknown } = {},
  ): Promise<T> => {
    return apiRequest<T>(path, {
      method: options.method,
      body: options.body,
      session,
      updateSession,
    });
  }, [session, updateSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      ready,
      login,
      setSession: updateSession,
      logout,
      request,
    }),
    [login, logout, ready, request, session, updateSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}
