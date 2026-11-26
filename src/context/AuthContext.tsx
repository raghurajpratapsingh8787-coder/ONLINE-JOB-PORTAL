import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { apiRequest, getInMemoryAccessToken, setInMemoryAccessToken } from '../lib/api';
import type { NotificationItem, PublicUser } from '../types';

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'success' | 'error';
}

interface AuthContextValue {
  user: PublicUser | null;
  loading: boolean;
  unreadNotifications: number;
  setUnreadNotifications: React.Dispatch<React.SetStateAction<number>>;
  login: (email: string, password: string) => Promise<PublicUser>;
  register: (payload: Record<string, unknown>) => Promise<{ user: PublicUser; emailVerificationTokenPreview?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  toast: (msg: Omit<ToastMessage, 'id'>) => void;
  toasts: ToastMessage[];
  dismissToast: (id: string) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const queryClient = useQueryClient();

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((msg: Omit<ToastMessage, 'id'>) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev.slice(-3), { ...msg, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const data = await apiRequest<{
        authenticated: boolean;
        user: PublicUser | null;
        accessToken?: string;
        unreadNotifications: number;
      }>('/api/auth/session', { skipAuthRefresh: true });
      if (data.accessToken) {
        setInMemoryAccessToken(data.accessToken);
      }
      setUser(data.user);
      setUnreadNotifications(data.unreadNotifications || 0);
    } catch {
      setUser(null);
      setUnreadNotifications(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  // Real-time Socket.IO connection when authenticated
  useEffect(() => {
    if (!user) return;
    let socket: Socket | null = null;
    try {
      socket = io('/', {
        path: '/socket.io',
        withCredentials: true,
        auth: { token: getInMemoryAccessToken() || undefined },
        reconnectionAttempts: 5,
      });

      socket.on('notification:new', (notif: NotificationItem) => {
        setUnreadNotifications((c) => c + 1);
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        toast({ title: notif.title, description: notif.message, variant: 'default' });
      });

      socket.on('message:new', () => {
        queryClient.invalidateQueries({ queryKey: ['message-threads'] });
        queryClient.invalidateQueries({ queryKey: ['messages'] });
      });
    } catch {
      // Socket connection optional fallback
    }

    return () => {
      socket?.disconnect();
    };
  }, [user, queryClient, toast]);

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiRequest<{ user: PublicUser; accessToken: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      skipAuthRefresh: true,
    });
    setInMemoryAccessToken(data.accessToken);
    setUser(data.user);
    queryClient.clear();
    void refreshUser();
    return data.user;
  }, [queryClient, refreshUser]);

  const register = useCallback(async (payload: Record<string, unknown>) => {
    const data = await apiRequest<{
      user: PublicUser;
      accessToken: string;
      emailVerificationTokenPreview?: string;
    }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
      skipAuthRefresh: true,
    });
    setInMemoryAccessToken(data.accessToken);
    setUser(data.user);
    queryClient.clear();
    return { user: data.user, emailVerificationTokenPreview: data.emailVerificationTokenPreview };
  }, [queryClient]);

  const logout = useCallback(async () => {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST', skipAuthRefresh: true });
    } catch {
      // ignore network error on logout
    }
    setInMemoryAccessToken(null);
    setUser(null);
    setUnreadNotifications(0);
    queryClient.clear();
  }, [queryClient]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        unreadNotifications,
        setUnreadNotifications,
        login,
        register,
        logout,
        refreshUser,
        toast,
        toasts,
        dismissToast,
      }}
    >
      {children}
      {/* Toast viewport */}
      <div
        aria-live="polite"
        className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto rounded-lg border px-4 py-3 shadow-lg bg-white text-slate-900 flex items-start justify-between gap-3 transition-all ${
              t.variant === 'error'
                ? 'border-red-200'
                : t.variant === 'success'
                  ? 'border-emerald-200'
                  : 'border-slate-200'
            }`}
          >
            <div className="min-w-0">
              <p
                className={`text-sm font-semibold ${
                  t.variant === 'error'
                    ? 'text-red-700'
                    : t.variant === 'success'
                      ? 'text-emerald-700'
                      : 'text-slate-900'
                }`}
              >
                {t.title}
              </p>
              {t.description && (
                <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{t.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismissToast(t.id)}
              className="text-xs text-slate-400 hover:text-slate-700 shrink-0"
              aria-label="Dismiss notification"
            >
              Close
            </button>
          </div>
        ))}
      </div>
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
