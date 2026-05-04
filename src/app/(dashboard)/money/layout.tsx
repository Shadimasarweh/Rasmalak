'use client';

import { ReactNode } from 'react';
import { useUser } from '@/store/useStore';
import PlanTrackTimeline from '@/components/money/PlanTrackTimeline';
import FirstTimePlanWizard from '@/components/money/FirstTimePlanWizard';

/**
 * /money layout — all of Plan, Track, Compare share this shell.
 *
 * Why a shared layout:
 *   - Pinned timeline keeps the Plan -> Spend -> Compare mental model
 *     visible regardless of which tab the user is on.
 *   - The first-time wizard fires once on entry to the section, anchoring
 *     the same mental model in three forced moments before the user gets
 *     to drift.
 *
 * Page-level <h1> headers stay in each child page so back links and
 * sub-section copy remain page-local. The layout intentionally does not
 * render its own header.
 */
export default function MoneyLayout({ children }: { children: ReactNode }) {
  const user = useUser();
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-3)',
        padding: 'var(--spacing-3)',
        minHeight: 'calc(100vh - 80px)',
      }}
    >
      <PlanTrackTimeline />
      {children}
      <FirstTimePlanWizard userId={user?.id ?? null} />
    </div>
  );
}
