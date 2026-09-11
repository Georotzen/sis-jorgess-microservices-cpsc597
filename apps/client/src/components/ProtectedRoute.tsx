'use client';

import { useEffect } from 'react';
import { initKeycloak } from '../lib/auth/keycloak-init';
import { useAuthStore, useAuthHydrate } from '@/store/auth';
import { ReactNode } from 'react';
import LoginPage from '@/app/login/page';

export interface ProtectedRouteProps {
  children: ReactNode;
}

/**
 * Client-side route guard. Redirects to /login if not authenticated.
 * In production, consider also validating the JWT on the server.
 */
export default function ProtectedRoute({ children }: ProtectedRouteProps) {

  const isHydrated = useAuthHydrate();
  const token = useAuthStore((s) => s.token);

   useEffect(() => {
    initKeycloak();
  }, []);
  
    if (!isHydrated) {
      return <div>Loading authentication ...</div>;
    }

    if (!token) {
      return <LoginPage />;
    }
/*
    if (!isLoading && !user) {
      // Redirect to login
      window.location.href = '/login/';
    } else if (user) {
      setShouldRender(true);
    }
  }, [user, isLoading, isHydrated]);

  if (!isHydrated || isLoading || !shouldRender) return <div>Loading...</div>;
*/
  return <>{children}</>;
}

