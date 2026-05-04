'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useIntl } from 'react-intl';
import { useLanguage } from '@/store/useStore';
import { Calendar, Receipt, GitCompare } from 'lucide-react';

/**
 * Plan -> Spend -> Compare timeline header. Drives the mental model the
 * whole /money section is built around: planning is future, tracking is
 * past, comparison is the bridge.
 *
 * Placement: pinned at the top of the /money layout. Each step is a link
 * to its tab; the active step is highlighted via the route.
 */

type Step = {
  id: 'plan' | 'spend' | 'compare';
  href: string;
  labelKey: string;
  icon: typeof Calendar;
  /** CSS variable name for the step's accent color */
  accentVar: string;
};

const STEPS: Step[] = [
  { id: 'plan', href: '/money/plan', labelKey: 'money.timeline_plan', icon: Calendar, accentVar: '--ds-plan' },
  { id: 'spend', href: '/money/track', labelKey: 'money.timeline_spend', icon: Receipt, accentVar: '--ds-actual' },
  { id: 'compare', href: '/money/compare', labelKey: 'money.timeline_compare', icon: GitCompare, accentVar: '--ds-text-heading' },
];

function isActive(pathname: string, step: Step): boolean {
  if (step.id === 'plan') return pathname.startsWith('/money/plan');
  if (step.id === 'spend') return pathname.startsWith('/money/track');
  if (step.id === 'compare') return pathname.startsWith('/money/compare');
  return false;
}

export default function PlanTrackTimeline() {
  const pathname = usePathname();
  const intl = useIntl();
  const language = useLanguage();
  const isRTL = language === 'ar';

  // Direction-aware separator glyph so Arabic gets a left-pointing arrow.
  const arrow = isRTL ? '←' : '→';

  return (
    <nav
      aria-label={intl.formatMessage({ id: 'money.section_title', defaultMessage: 'Money' })}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '10px 12px',
        background: 'var(--ds-bg-card)',
        border: '0.5px solid var(--ds-border)',
        borderRadius: '12px',
        boxShadow: 'var(--ds-shadow-card)',
        flexWrap: 'wrap',
      }}
    >
      {STEPS.map((step, idx) => {
        const active = isActive(pathname, step);
        const Icon = step.icon;
        const accent = `var(${step.accentVar})`;
        const label = intl.formatMessage({ id: step.labelKey });
        return (
          <span key={step.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <Link
              href={step.href}
              aria-current={active ? 'page' : undefined}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '999px',
                fontSize: '13px',
                fontWeight: active ? 600 : 500,
                textDecoration: 'none',
                color: active ? '#FFFFFF' : 'var(--ds-text-body)',
                background: active ? accent : 'transparent',
                border: active ? `1px solid ${accent}` : '0.5px solid var(--ds-border)',
                transition: 'background 150ms ease, color 150ms ease',
              }}
            >
              <Icon size={14} />
              {label}
            </Link>
            {idx < STEPS.length - 1 && (
              <span
                aria-hidden
                style={{ color: 'var(--ds-text-muted)', fontSize: '14px', fontWeight: 500 }}
              >
                {arrow}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
