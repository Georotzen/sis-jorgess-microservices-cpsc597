'use client';

import { useAuthStore } from '@/store/auth';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  return (
    <ProtectedRoute>
      <div style={{ padding: '2rem' }}>
        <h1>Dashboard</h1>
        {user && <p>Welcome, {user.name}!</p>}
        <button
          onClick={() => {
            logout();
            window.location.href = '/';
          }}
          style={{ padding: '0.5rem 1rem', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Logout
        </button>
      </div>
    </ProtectedRoute>
  );
}
