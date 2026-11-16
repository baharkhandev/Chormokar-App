'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { AdminUser, AdminAuthState } from './types';

const defaultState: AdminAuthState = {
  user: null,
  accessToken: null,
  status: 'idle',
  setAuth: () => {},
  clearAuth: async () => {},
  refreshAuth: async () => null,
};

const AuthContext = createContext<AdminAuthState>(defaultState);

let activeRefreshPromise: Promise<string | null> | null = null;
let currentAccessToken: string | null = null;

export function getClientAccessToken(): string | null {
  return currentAccessToken;
}

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [status, setStatus] = useState<AdminAuthState['status']>('idle');
  const router = useRouter();

  const setAuth = useCallback((token: string, adminUser: AdminUser) => {
    currentAccessToken = token;
    setAccessToken(token);
    setUser(adminUser);
    setStatus('authenticated');
  }, []);

  const clearAuth = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore network errors on logout
    }
    currentAccessToken = null;
    setAccessToken(null);
    setUser(null);
    setStatus('unauthenticated');
    router.push('/login');
  }, [router]);

  const refreshAuth = useCallback(async (): Promise<string | null> => {
    if (activeRefreshPromise) {
      return activeRefreshPromise;
    }

    activeRefreshPromise = (async () => {
      try {
        const response = await fetch('/api/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.accessToken && data.user) {
            currentAccessToken = data.accessToken;
            setAuth(data.accessToken, data.user);
            return data.accessToken as string;
          }
        }

        currentAccessToken = null;
        return null;
      } catch (err) {
        console.error('refreshAuth error:', err);
        return null;
      } finally {
        activeRefreshPromise = null;
      }
    })();

    return activeRefreshPromise;
  }, [setAuth]);

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      if (typeof window === 'undefined') return;

      const hasSessionCookie = document.cookie.includes('admin_session=');

      if (!hasSessionCookie) {
        if (isMounted) setStatus('unauthenticated');
        return;
      }

      if (isMounted) setStatus('loading');
      let success = false;
      try {
        const response = await fetch('/api/auth/session', {
          cache: 'no-store',
        });
        const data = await response.json().catch(() => ({}));
        if (response.ok && data.user) {
          currentAccessToken = data.accessToken || null;
          setAuth(data.accessToken || '', data.user);
          success = true;
        }
      } catch {
        // fall through to unauthenticated
      }
      if (!success && isMounted) {
        setAccessToken(null);
        setUser(null);
        setStatus('unauthenticated');
        router.push('/login');
      }
    };

    if (status === 'idle') {
      initAuth();
    }

    return () => {
      isMounted = false;
    };
  }, [status, refreshAuth, router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        status,
        setAuth,
        clearAuth,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAdminAuth() {
  return useContext(AuthContext);
}
