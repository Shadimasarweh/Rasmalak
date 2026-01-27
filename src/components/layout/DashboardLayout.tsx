'use client';

import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
  headerActions?: ReactNode;
}

export function DashboardLayout({
  children,
  title,
  headerActions,
}: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-brand-bg">
      {/* Sidebar - Fixed */}
      <Sidebar />

      {/* Main Content Area - Offset for sidebar */}
      <div className="lg:ml-60">
        {/* Header - Sticky */}
        <Header title={title} actions={headerActions} />

        {/* Page Content */}
        <main className="p-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

