'use client';

import { useEffect, useState } from 'react';
import { useAuthStore, useAuthHydrate } from '@/store/auth';
import ProtectedRoute from '@/components/ProtectedRoute';
import { apiCallWithAuth } from '@/lib/api';

interface Enrollment {
  id: string;
  courseCode: string;
  courseName: string;
  status: string;
  enrolledAt: string;
}

export default function EnrollmentPage() {
  const user = useAuthStore((state) => state.user);
  const isHydrated = useAuthHydrate();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEnrollments = async () => {
      // Wait for hydration before fetching
      if (!isHydrated || !user) {
        console.log('[Enrollment] Waiting for hydration. isHydrated:', isHydrated, 'user:', user);
        return;
      }
      try {
        setLoading(true);
        console.log('[Enrollment] Fetching enrollments with user:', user);
        // Call the enrollment service via the Gateway
        const data = await apiCallWithAuth('/enrollment/', 'GET');
        setEnrollments(Array.isArray(data) ? data : []);
      } catch (err) {
        // For now, silently fail and show placeholder
        setError(err instanceof Error ? err.message : 'Failed to load enrollments');
        setEnrollments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEnrollments();
  }, [user, isHydrated]);

  return (
    <ProtectedRoute>
      <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <h1>Enrollment</h1>

        {loading && (
          <div style={{ padding: '2rem', background: '#f8f9fa', borderRadius: '8px', textAlign: 'center' }}>
            <p>Loading enrollments...</p>
          </div>
        )}

        {!loading && error && (
          <div style={{
            padding: '1.5rem',
            background: '#fff3cd',
            border: '1px solid #ffc107',
            borderRadius: '8px',
            marginBottom: '2rem',
          }}>
            <p style={{ margin: 0, color: '#856404' }}>
              ℹ️ Enrollment service is not yet available. Integration coming soon.
            </p>
          </div>
        )}

        {!loading && enrollments.length > 0 && (
          <div style={{
            background: '#fff',
            border: '1px solid #dee2e6',
            borderRadius: '8px',
            overflow: 'hidden',
          }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
            }}>
              <thead>
                <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold' }}>Course Code</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold' }}>Course Name</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold' }}>Status</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold' }}>Enrolled Date</th>
                </tr>
              </thead>
              <tbody>
                {enrollments.map((enrollment) => (
                  <tr key={enrollment.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                    <td style={{ padding: '1rem' }}>{enrollment.courseCode}</td>
                    <td style={{ padding: '1rem' }}>{enrollment.courseName}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        background: enrollment.status === 'active' ? '#d4edda' : '#e2e3e5',
                        color: enrollment.status === 'active' ? '#155724' : '#383d41',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '4px',
                        textTransform: 'capitalize',
                      }}>
                        {enrollment.status}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.9rem', color: '#666' }}>
                      {new Date(enrollment.enrolledAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && enrollments.length === 0 && !error && (
          <div style={{
            padding: '2rem',
            background: '#f8f9fa',
            borderRadius: '8px',
            textAlign: 'center',
            border: '1px solid #dee2e6',
          }}>
            <p style={{ color: '#666' }}>No enrollments found. You are not currently enrolled in any courses.</p>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

