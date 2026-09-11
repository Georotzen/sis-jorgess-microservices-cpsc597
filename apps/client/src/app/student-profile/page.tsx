'use client';

import { useAuthStore } from '@/store/auth';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function StudentProfilePage() {
  const user = useAuthStore((state) => state.user);

  return (
    <ProtectedRoute>
      <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <h1>Student Profile</h1>
        
        {user && (
          <div style={{
            background: '#fff',
            padding: '2rem',
            borderRadius: '8px',
            border: '1px solid #dee2e6',
            marginBottom: '2rem',
          }}>
            <h2>Personal Information</h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '2rem',
              marginTop: '1rem',
            }}>
              <div>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>Full Name</label>
                <p style={{ margin: 0, padding: '0.75rem', background: '#f8f9fa', borderRadius: '4px' }}>{user.name}</p>
              </div>
              <div>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>Email</label>
                <p style={{ margin: 0, padding: '0.75rem', background: '#f8f9fa', borderRadius: '4px' }}>{user.email}</p>
              </div>
              <div>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>User ID</label>
                <p style={{ margin: 0, padding: '0.75rem', background: '#f8f9fa', borderRadius: '4px', fontSize: '0.9rem', fontFamily: 'monospace' }}>{user.id}</p>
              </div>
              <div>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>Role</label>
                <p style={{
                  margin: 0,
                  padding: '0.75rem',
                  background: '#e7f3ff',
                  borderRadius: '4px',
                  textTransform: 'capitalize',
                  color: '#0056b3',
                }}>{user.role}</p>
              </div>
            </div>

            <div style={{ marginTop: '2rem' }}>
              <p style={{ color: '#666', fontSize: '0.9rem' }}>
                ℹ️ Additional profile fields can be fetched from the student-profile service once the API integration is complete.
              </p>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
