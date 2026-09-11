'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';

export default function DashboardPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const logout = useAuthStore((state) => state.logout);

  return (
    <>
      <nav style={{
        background: '#333',
        padding: '1rem 2rem',
        color: 'white',
        marginBottom: '2rem',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          maxWidth: '1200px',
          margin: '0 auto',
        }}>
          <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>SIS Portal</div>
          
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

      <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <h1>Dashboard</h1>
        {user && (
          <div style={{
            background: '#f8f9fa',
            padding: '1.5rem',
            borderRadius: '8px',
            marginBottom: '2rem',
            border: '1px solid #dee2e6',
          }}>
            <h2>Welcome, {user.name}!</h2>
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>User ID:</strong> {user.id}</p>
            <p><strong>Role:</strong> <span style={{
              background: '#007bff',
              color: 'white',
              padding: '0.25rem 0.75rem',
              borderRadius: '4px',
              textTransform: 'capitalize',
            }}>{user.role}</span></p>
          </div>
        )}

        {/* DEBUG: Show token status */}
        <div style={{
          background: '#e7f3ff',
          padding: '1rem',
          borderRadius: '8px',
          marginBottom: '2rem',
          border: '1px solid #b3d9ff',
          fontSize: '0.9rem',
        }}>
          <p><strong>🔐 Token Status:</strong> {token ? '✓ Token loaded' : '✗ No token'}</p>
          {token && (
            <p style={{ fontSize: '0.8rem', color: '#666', wordBreak: 'break-all' }}>
              Token: {token.substring(0, 50)}...
            </p>
          )}
        </div>
        
        <div>
          <h2>Quick Access</h2>
          <p>Use the navigation menu above to access:</p>
          <ul style={{ lineHeight: '1.8' }}>
            <li><strong>Student Profile:</strong> View and manage your personal information</li>
            <li><strong>Enrollment:</strong> View your enrolled courses and manage registrations</li>
            <li><strong>Grades:</strong> Check your course grades and academic performance</li>
          </ul>
        </div>
      </div>
    </>
  );
}
