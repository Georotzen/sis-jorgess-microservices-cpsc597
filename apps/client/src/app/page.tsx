import Link from 'next/link';
import styles from './page.module.css';

export default function Home() {
  return (
    <main style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Student Information System</h1>
      <p>Welcome to the SIS Portal.</p>
      <div style={{ display: 'flex', gap: '1rem' }}>
        <Link href="/login" style={{ padding: '0.5rem 1rem', background: '#007bff', color: 'white', textDecoration: 'none', borderRadius: '4px' }}>
          Login
        </Link>
        <Link href="/dashboard" style={{ padding: '0.5rem 1rem', background: '#6c757d', color: 'white', textDecoration: 'none', borderRadius: '4px' }}>
          Dashboard
        </Link>
      </div>
    </main>
  );
}
