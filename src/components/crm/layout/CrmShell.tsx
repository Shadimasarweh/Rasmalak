'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { CrmSidebar } from './CrmSidebar';
import { CrmHeader } from './CrmHeader';

/**
 * CrmShell — combines CrmSidebar + CrmHeader + main content area.
 * Manages mobile sidebar open/close state.
 */
export function CrmShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--ds-bg-page)' }}>
      <CrmSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <CrmHeader onMenuToggle={() => setSidebarOpen(prev => !prev)} />

        <main
          className="crm-main"
          style={{
            flex: 1,
            padding: '1.5rem',
            overflowY: 'auto',
          }}
        >
          {children}
        </main>
      </div>

      {/* Responsive padding */}
      <style>{`
        @media (min-width: 768px) {
          .crm-main {
            padding: 2rem !important;
          }
        }
      `}</style>
    </div>
  );
}
