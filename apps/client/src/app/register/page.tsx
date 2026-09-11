'use client';

import apiCall from '@/lib/api';
import { FormEvent, useState } from 'react';

/**
 * Temporary registration page — for local testing only, to create a user
 * you can then log in with via /login. Field names (email, password, name)
 * match the `user` shape returned by /identity/login in page.tsx; adjust
 * to match your actual Identity service DTO if it expects different or
 * additional fields (e.g. confirmPassword, role).
 */
export default function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Public route per proxy.config.ts PUBLIC_PROXY_ROUTES —
      // no token required to hit this.
      await apiCall('/identity/register', 'POST', { fullName, email, password });
      setSuccess(true);
    } catch (err) {
      if (err instanceof Error) {
        const status = (err as any).status;
        if (status === 409) {
          setError('An account with that email already exists');
        } else if (status === 400) {
          setError(err.message || 'Invalid registration details');
        } else {
          setError(err.message);
        }
      } else {
        setError('Registration failed');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: '400px', margin: '4rem auto', padding: '2rem', border: '1px solid #ddd', borderRadius: '8px' }}>
      <h2>Register</h2>
      {error && <div style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}
      {success && (
        <div style={{ color: 'green', marginBottom: '1rem' }}>
          Account created — you can now <a href="/login">log in</a>.
        </div>
      )}
      <form onSubmit={handleRegister}>
        <div style={{ marginBottom: '1rem' }}>
          <label>Full name:</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            minLength={2}
            maxLength={100}
            style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
          />
        </div>
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
          {loading ? 'Creating account...' : 'Register'}
        </button>
      </form>
    </div>
  );
}

