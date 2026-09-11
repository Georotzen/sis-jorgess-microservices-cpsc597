'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';

export default function Navigation() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  return (
    <nav style={{
      background: '#333',
      padding: '1rem 2rem',
      color: 'white',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        maxWidth: '1200px',
        margin: '0 auto',
      }}>
        <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
          SIS Portal
        </div>
        
        <div style={{ display: 'flex', gap: '2rem' }}>
          <button onClick={() => router.push('/dashboard/')} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>Dashboard</button>
          <button onClick={() => router.push('/student-profile/')} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>Student Profile</button>
          <button onClick={() => router.push('/enrollment/')} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>Enrollment</button>
          <button onClick={() => router.push('/grades/')} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>Grades</button>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {user && <span>{user.email}</span>}
          <button
            onClick={() => {
              logout();
              router.push('/login/');
            }}
            style={{
              padding: '0.5rem 1rem',
              background: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
