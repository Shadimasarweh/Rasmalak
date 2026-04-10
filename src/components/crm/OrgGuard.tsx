'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/store/authStore';
import { useOrg } from '@/store/orgStore';
import { Skeleton } from '@/components/ui/Skeleton';

/**
 * OrgGuard — CRM route protection.
 * Redirects to /login if unauthenticated, /crm/setup if no org.
 * Shows a skeleton matching the CRM shell shape while loading.
 */
export function OrgGuard({ children }: { children: React.ReactNode }) {
  const { user, initialized } = useAuth();
  const { currentOrg, isLoading } = useOrg();
  const router = useRouter();

  useEffect(() => {
    if (!initialized) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (!isLoading && !currentOrg) {
      router.replace('/crm/setup');
      return;
    }
  }, [initialized, user, isLoading, currentOrg, router]);

  // Show skeleton while loading OR while redirect is pending (prevents flash of null)
  if (!initialized || isLoading || !user || !currentOrg) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--ds-bg-page)' }}>
        {/* Sidebar skeleton */}
        <div
          style={{
            width: '15rem',
            background: 'var(--ds-bg-card)',
            borderInlineEnd: '0.5px solid var(--ds-border)',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}
        >
          <Skeleton width="60%" height="24px" borderRadius="8px" />
          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} width="100%" height="36px" borderRadius="8px" />
            ))}
          </div>
        </div>

        {/* Main content area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Header skeleton */}
          <div
            style={{
              height: '56px',
              background: 'var(--ds-bg-card)',
              borderBlockEnd: '0.5px solid var(--ds-border)',
              padding: '0 1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
            }}
          >
            <Skeleton width="120px" height="20px" borderRadius="6px" />
            <div style={{ flex: 1 }} />
            <Skeleton width="200px" height="32px" borderRadius="8px" />
            <Skeleton width="32px" height="32px" borderRadius="50%" />
          </div>

          {/* Content skeleton */}
          <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Skeleton width="200px" height="28px" borderRadius="8px" />
            <Skeleton width="100%" height="200px" borderRadius="16px" />
            <Skeleton width="100%" height="160px" borderRadius="16px" />
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
