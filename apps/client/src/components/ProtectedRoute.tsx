import { useAuthStore } from '@/store/auth';
import apiCall from '@/lib/api';
import { ReactNode, useEffect } from 'react';

export interface ProtectedRouteProps {
  children: ReactNode;
}

/**
 * Client-side route guard. Redirects to /login if not authenticated.
 * In production, consider also validating the JWT on the server.
 */
export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);

  useEffect(() => {
    if (!isLoading && !user) {
      // Redirect to login — we'll implement this with Next.js router
      window.location.href = '/login';
    }
  }, [user, isLoading]);

  if (isLoading) return <div>Loading...</div>;
  if (!user) return null;

  return <>{children}</>;
}
