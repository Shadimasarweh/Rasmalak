'use client';

import { OrgGuard } from '@/components/crm/OrgGuard';
import { CrmProvider } from '@/store/crmStore';
import { CrmShell } from '@/components/crm/layout/CrmShell';

/**
 * Nested CRM layout — wraps all /crm/* pages (except /crm/setup).
 * OrgGuard redirects to /crm/setup if no org exists.
 * CrmProvider loads all CRM data scoped to current org.
 * CrmShell provides the sidebar + header + content area.
 */
export default function CrmPagesLayout({ children }: { children: React.ReactNode }) {
  return (
    <OrgGuard>
      <CrmProvider>
        <CrmShell>
          {children}
        </CrmShell>
      </CrmProvider>
    </OrgGuard>
  );
}
