'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import ProtectedRoute from '@/components/ProtectedRoute';
import { apiCallWithAuth } from '@/lib/api';

interface Grade {
  id: string;
  courseCode: string;
  courseName: string;
  grade: string;
  gradePoints: number;
  credits: number;
  term: string;
}

export default function GradesPage() {
  const user = useAuthStore((state) => state.user);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGrades = async () => {
      if (!user) return;
      try {
        setLoading(true);
        // Call the grades service via the Gateway
        const data = await apiCallWithAuth('/grades/', 'GET');
        setGrades(Array.isArray(data) ? data : []);
      } catch (err) {
        // For now, silently fail and show placeholder
        setError(err instanceof Error ? err.message : 'Failed to load grades');
        setGrades([]);
      } finally {
        setLoading(false);
      }
    };

    fetchGrades();
  }, [user]);

  const calculateGPA = () => {
    if (grades.length === 0) return 0;
    const totalPoints = grades.reduce((sum, g) => sum + (g.gradePoints * g.credits), 0);
    const totalCredits = grades.reduce((sum, g) => sum + g.credits, 0);
    return totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : '0.00';
  };

  return (
    <ProtectedRoute>
      <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <h1>Grades</h1>

        {loading && (
          <div style={{ padding: '2rem', background: '#f8f9fa', borderRadius: '8px', textAlign: 'center' }}>
            <p>Loading grades...</p>
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
              ℹ️ Grades service is not yet available. Integration coming soon.
            </p>
          </div>
        )}

        {!loading && grades.length > 0 && (
          <>
            <div style={{
              background: '#e7f3ff',
              padding: '1.5rem',
              borderRadius: '8px',
              marginBottom: '2rem',
              border: '1px solid #b3d9ff',
            }}>
              <h3 style={{ margin: '0 0 0.5rem 0' }}>Cumulative GPA</h3>
              <p style={{
                margin: 0,
                fontSize: '2rem',
                fontWeight: 'bold',
                color: '#0056b3',
              }}>
                {calculateGPA()}
              </p>
            </div>

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
                    <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 'bold' }}>Grade</th>
                    <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 'bold' }}>Credits</th>
                    <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 'bold' }}>Term</th>
                  </tr>
                </thead>
                <tbody>
                  {grades.map((grade) => (
                    <tr key={grade.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                      <td style={{ padding: '1rem' }}>{grade.courseCode}</td>
                      <td style={{ padding: '1rem' }}>{grade.courseName}</td>
                      <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 'bold' }}>
                        <span style={{
                          background: '#e7f3ff',
                          color: '#0056b3',
                          padding: '0.5rem 0.75rem',
                          borderRadius: '4px',
                          fontFamily: 'monospace',
                        }}>
                          {grade.grade}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>{grade.credits}</td>
                      <td style={{ padding: '1rem', textAlign: 'center', fontSize: '0.9rem', color: '#666' }}>
                        {grade.term}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {!loading && grades.length === 0 && !error && (
          <div style={{
            padding: '2rem',
            background: '#f8f9fa',
            borderRadius: '8px',
            textAlign: 'center',
            border: '1px solid #dee2e6',
          }}>
            <p style={{ color: '#666' }}>No grades available yet. Check back after your courses are graded.</p>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
