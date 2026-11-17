import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthUser } from '../types/index.js';
import { fetchJson } from '../api/client.js';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<AuthUser>;
  register: (email: string, pass: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  changePassword: (currentPass: string, newPass: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const res = await fetchJson<{ user: AuthUser }>('/api/auth/me');
      setUser(res.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, pass: string): Promise<AuthUser> => {
    const res = await fetchJson<{ user: AuthUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password: pass }),
    });
    setUser(res.user);
    return res.user;
  };

  const register = async (email: string, pass: string): Promise<AuthUser> => {
    const res = await fetchJson<{ user: AuthUser }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password: pass }),
    });
    setUser(res.user);
    return res.user;
  };

  const logout = async () => {
    try {
      await fetchJson('/api/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
    }
  };

  const changePassword = async (currentPass: string, newPass: string) => {
    const res = await fetchJson<{ user: AuthUser }>('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({
        currentPassword: currentPass,
        newPassword: newPass,
      }),
    });
    setUser(res.user);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        changePassword,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
