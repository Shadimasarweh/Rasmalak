'use client';

import { AuthGuard, Sidebar, Header } from '@/components';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      {/* Flex container: sidebar + main content side by side */}
      <div className="flex min-h-screen w-full bg-[var(--color-bg-primary)]">
        {/* Sidebar takes its width, does not overlap */}
        <Sidebar />
        
        {/* Main content fills remaining space */}
        <div className="flex-1 flex flex-col min-w-0">
          <Header />
          <main className="flex-1 overflow-auto dashboard-main">
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
