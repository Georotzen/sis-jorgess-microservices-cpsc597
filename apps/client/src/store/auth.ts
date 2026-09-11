'use client';

import { create } from 'zustand';
import { useEffect, useState } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthStore {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  isHydrated: boolean;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: null,
  isLoading: false,
  error: null,
  isHydrated: false,
  setUser: (user) => {
    set({ user });
    if (user) {
      localStorage.setItem('auth_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('auth_user');
    }
  },
  setToken: (token) => {
    set({ token });
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  },
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  logout: () => {
    set({ user: null, token: null, error: null });
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_token');
  },
  hydrate: () => {
    if (typeof window !== 'undefined') {
      const user = localStorage.getItem('auth_user');
      const token = localStorage.getItem('auth_token');
      set({
        user: user ? JSON.parse(user) : null,
        token,
        isHydrated: true,
      });
    }
  },
}));

// Hook to hydrate store on app load
export function useAuthHydrate() {
  const isHydratedInStore = useAuthStore((state) => state.isHydrated);
  const hydrate = useAuthStore((state) => state.hydrate);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Hydrate immediately when component mounts
    hydrate();
    setIsClient(true);
  }, [hydrate]);

  // Return true only when both client-side AND store is hydrated
  return isClient && isHydratedInStore;
}
