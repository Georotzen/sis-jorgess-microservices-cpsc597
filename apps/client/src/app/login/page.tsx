'use client';

import { useAuthStore } from '@/store/auth';
import apiCall from '@/lib/api';
import { FormEvent, useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setUser = useAuthStore((state) => state.setUser);
  const setToken = useAuthStore((state) => state.setToken);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Call the Identity service via the Gateway (relative path)
      // The Gateway proxies this to the Identity microservice
      const response = (await apiCall('/login', 'POST', { email, password })) as {
        token: string;
        user: { id: string; email: string; name: string; role: string };
      };
      
      // Response includes user data and token
      setToken(response.token);
      setUser(response.user);

      // Redirect to dashboard (small delay to ensure state updates)
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 100);
    } catch (err) {
      if (err instanceof Error) {
        const status = (err as any).status;
        if (status === 401) {
          setError('Invalid email or password');
        } else {
          setError(err.message);
        }
      } else {
        setError('Login failed');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: '400px', margin: '4rem auto', padding: '2rem', border: '1px solid #ddd', borderRadius: '8px' }}>
      <h2>Login</h2>
      {error && <div style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}
      <form onSubmit={handleLogin}>
        <div style={{ marginBottom: '1rem' }}>
          <label>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
          />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label>Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
          />
        </div>
        <button type="submit" disabled={loading} style={{ width: '100%', padding: '0.5rem', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
}
