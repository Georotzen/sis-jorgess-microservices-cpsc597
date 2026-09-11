'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';

export default function DebugPage() {
  const [storageData, setStorageData] = useState<Record<string, string>>({});
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const isHydrated = useAuthStore((state) => state.isHydrated);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const data: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          data[key] = localStorage.getItem(key) || '';
        }
      }
      setStorageData(data);
    }
  }, []);

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', fontFamily: 'monospace' }}>
      <h1>🔍 Debug Page</h1>

      <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '8px', marginBottom: '2rem' }}>
        <h3>Auth Store State:</h3>
        <p><strong>Token:</strong> {token ? `${token.substring(0, 50)}...` : '❌ NULL'}</p>
        <p><strong>User:</strong> {user ? JSON.stringify(user) : '❌ NULL'}</p>
        <p><strong>Is Hydrated:</strong> {isHydrated ? '✅ YES' : '❌ NO'}</p>
      </div>

      <div style={{ background: '#fff3cd', padding: '1rem', borderRadius: '8px', marginBottom: '2rem' }}>
        <h3>LocalStorage Contents:</h3>
        {Object.entries(storageData).length === 0 ? (
          <p>❌ Empty localStorage</p>
        ) : (
          <ul>
            {Object.entries(storageData).map(([key, value]) => (
              <li key={key}>
                <strong>{key}:</strong> {key.includes('token') ? `${value.substring(0, 50)}...` : value}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div style={{ background: '#d4edda', padding: '1rem', borderRadius: '8px' }}>
        <p>
          <strong>Steps to debug:</strong>
        </p>
        <ol>
          <li>Open this page IMMEDIATELY after logging in</li>
          <li>Check if token is showing in "Auth Store State"</li>
          <li>Check if auth_token appears in "LocalStorage Contents"</li>
          <li>If both are NULL, the login didn't save the token properly</li>
        </ol>
      </div>
    </div>
  );
}
