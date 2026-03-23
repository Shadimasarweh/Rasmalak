'use client';

import Link from 'next/link';

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        background: 'var(--color-bg-primary)',
        color: 'var(--color-text-primary)',
        textAlign: 'center',
      }}
    >
      <p
        style={{
          fontSize: '5rem',
          fontWeight: 800,
          lineHeight: 1,
          marginBottom: '0.5rem',
          color: 'var(--color-accent-growth)',
        }}
      >
        404
      </p>
      <h1
        style={{
          fontSize: '1.5rem',
          fontWeight: 600,
          marginBottom: '0.75rem',
        }}
      >
        Page not found
      </h1>
      <p
        style={{
          fontSize: '0.9375rem',
          color: 'var(--color-text-secondary)',
          maxWidth: '400px',
          marginBottom: '2rem',
          lineHeight: 1.6,
        }}
      >
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        href="/"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 24px',
          background: 'var(--color-accent-growth)',
          color: '#FFFFFF',
          fontSize: '0.875rem',
          fontWeight: 600,
          border: 'none',
          borderRadius: 'var(--radius-sm)',
          textDecoration: 'none',
        }}
      >
        Go to Dashboard
      </Link>
    </div>
  );
}
