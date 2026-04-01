'use client';

import { useState } from 'react';
import { AuthGuard, Sidebar, Header } from '@/components';
import { TransactionProvider } from '@/store/transactionStore';
import { BudgetProvider } from '@/store/budgetStore';
import { GoalsProvider } from '@/store/goalsStore';
import { EmergencyFundProvider } from '@/store/emergencyFundStore';
import QuickAddFAB from '@/components/QuickAddFAB';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <AuthGuard>
      <TransactionProvider>
      <BudgetProvider>
      <GoalsProvider>
      <EmergencyFundProvider>
      {/* Flex container: sidebar + main content side by side */}
      <div className="flex min-h-screen w-full" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        {/* Sidebar - hidden on mobile (shows as drawer), sticky on desktop */}
        <Sidebar
          mobileOpen={mobileMenuOpen}
          onMobileClose={() => setMobileMenuOpen(false)}
        />
        
        {/* Main content fills remaining space */}
        <div className="flex-1 flex flex-col min-w-0">
          <Header onMenuToggle={() => setMobileMenuOpen(true)} />
          <main className="flex-1 overflow-auto p-3 sm:p-6">
            {children}
          </main>
        </div>
      </div>
      <QuickAddFAB />
      </EmergencyFundProvider>
      </GoalsProvider>
      </BudgetProvider>
      </TransactionProvider>
    </AuthGuard>
  );
}
