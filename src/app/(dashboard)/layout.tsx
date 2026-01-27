'use client';

import { AuthGuard, Sidebar, Header, BottomNav } from '@/components';
import { TransactionProvider } from '@/store/transactionStore';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <TransactionProvider>
      {/* Flex container: sidebar + main content side by side */}
      <div className="flex min-h-screen w-full" style={{ backgroundColor: 'var(--theme-bg-main)' }}>
        {/* Sidebar - hidden on mobile, sticky on desktop */}
        <Sidebar />
        
        {/* Main content fills remaining space */}
        <div className="flex-1 flex flex-col min-w-0">
          <Header />
          <main className="flex-1 overflow-auto p-6 pb-24 lg:pb-6">
            {children}
          </main>
        </div>
      </div>
      
      {/* Bottom Navigation - visible only on mobile */}
      <div className="lg:hidden">
        <BottomNav />
      </div>
      </TransactionProvider>
    </AuthGuard>
  );
}
