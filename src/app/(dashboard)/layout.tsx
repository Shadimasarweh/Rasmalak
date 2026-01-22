'use client';

import { AuthGuard, Sidebar, Header, BottomNav } from '@/components';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      {/* Flex container: sidebar + main content side by side */}
      <div className="flex min-h-screen w-full bg-transparent">
        {/* Sidebar - hidden on mobile, sticky on desktop */}
        <Sidebar />
        
        {/* Main content fills remaining space */}
        <div className="flex-1 flex flex-col min-w-0">
          <Header />
          <main className="flex-1 overflow-auto dashboard-main pb-24 lg:pb-0">
            {children}
          </main>
        </div>
      </div>
      
      {/* Bottom Navigation - visible only on mobile */}
      <div className="lg:hidden">
        <BottomNav />
      </div>
    </AuthGuard>
  );
}
