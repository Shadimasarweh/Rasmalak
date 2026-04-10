'use client';

import AuthGuard from '@/components/AuthGuard';
import { OrgProvider } from '@/store/orgStore';

/**
 * CRM Route Group Layout
 * Wraps all /crm/* routes with AuthGuard and OrgProvider.
 *
 * OrgGuard and CrmShell are NOT here because:
 * - /crm/setup needs OrgProvider but NOT OrgGuard (user has no org yet)
 * - Pages that need OrgGuard + CrmShell wrap themselves or use the nested layout
 *
 * CrmProvider will be added in Phase 5 when crmStore is built.
 */
export default function CrmLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <OrgProvider>
        {children}
      </OrgProvider>
    </AuthGuard>
  );
}
