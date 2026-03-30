'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useIsAuthenticated } from '@/store/useStore';

const PUBLIC_ROUTES = ['/login', '/signup', '/forgot-password'];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const DEV_BYPASS_AUTH = process.env.NODE_ENV === 'development';

  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useIsAuthenticated();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (DEV_BYPASS_AUTH) { setIsChecking(false); return; }
    // Small delay to ensure store is hydrated
    const timer = setTimeout(() => {
      setIsChecking(false);
      const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

      if (!isAuthenticated && !isPublicRoute) {
        router.replace('/login');
      } else if (isAuthenticated && isPublicRoute) {
        router.replace('/');
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [isAuthenticated, pathname, router]);

  // Show loading while checking auth
  if (!DEV_BYPASS_AUTH && (isChecking || (!isAuthenticated && !PUBLIC_ROUTES.includes(pathname)))) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-primary)]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[var(--color-text-secondary)]">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

