'use client';

/**
 * Spending personality card (B1 — شخصيتك المالية).
 *
 * Shows the engine's archetype WITH the data points that produced it —
 * never a naked label (the evidence is the credibility mechanic; <2 mapped
 * datapoints → the card doesn't render). No gold accent: an archetype is
 * identity, not achievement, and all four must feel equally OK.
 */

import { useMemo } from 'react';
import { useIntl } from 'react-intl';
import { ClipboardList, Zap, CalendarRange, Shield, Share2 } from 'lucide-react';
import { AI_FEATURES } from '@/ai/config';
import { usePredictiveState } from '@/lib/predictive/PredictiveProvider';
import { useLanguage } from '@/store/useStore';
import { showSuccess } from '@/store/toastStore';
import type { Archetype, ArchetypeEvidence } from '@/ai/deterministic/behaviorProfile';

const ARCHETYPE_ICONS: Record<Archetype, typeof ClipboardList> = {
  planner: ClipboardList,
  impulsive: Zap,
  seasonal: CalendarRange,
  cautious: Shield,
};

export default function SpendingPersonalityCard({ fullWidth = false }: { fullWidth?: boolean }) {
  const intl = useIntl();
  const language = useLanguage();
  const { state } = usePredictiveState();
  const isRTL = language === 'ar';

  const archetype = state?.archetype.archetype ?? null;

  // Evidence signal ids map to i18n keys here; unknown kinds drop silently
  // so a newer engine never breaks an older client.
  const evidenceLines = useMemo(() => {
    if (!state?.archetype.evidence) return [];
    const lines: string[] = [];
    for (const ev of state.archetype.evidence as ArchetypeEvidence[]) {
      const line = formatEvidence(ev, intl);
      if (line) lines.push(line);
    }
    return lines;
  }, [state, intl]);

  if (!AI_FEATURES.personalityCard || !state || !state.meta.hasMinimumHistory) return null;
  if (!archetype || evidenceLines.length < 2) return null;

  const Icon = ARCHETYPE_ICONS[archetype];
  const archetypeName = intl.formatMessage(
    {
      id: 'dashboard.personality_archetype',
      defaultMessage:
        '{archetype, select, planner {The Planner} impulsive {The Spontaneous} seasonal {The Seasonal} cautious {The Cautious} other {—}}',
    },
    { archetype },
  );

  const share = async () => {
    const text = intl.formatMessage(
      { id: 'dashboard.personality_share_text', defaultMessage: 'My money personality on Rasmalak: {archetype} — {evidence}' },
      { archetype: archetypeName, evidence: evidenceLines[0] },
    );
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ text });
        return;
      }
      await navigator.clipboard.writeText(text);
      showSuccess(intl.formatMessage({ id: 'dashboard.personality_share_copied', defaultMessage: 'Copied to clipboard' }));
    } catch {
      // Share cancelled — nothing to report.
    }
  };

  return (
    <div
      className={`ds-card ${fullWidth ? 'ds-col-12' : 'ds-col-4'}`}
      style={{ animation: 'fadeIn 300ms ease-out', direction: isRTL ? 'rtl' : 'ltr' }}
    >
      <div className="ds-section-header" style={{ marginBottom: 'var(--spacing-3)' }}>
        <h2 className="ds-title-card">
          {intl.formatMessage({ id: 'dashboard.personality_title', defaultMessage: 'Your money personality' })}
        </h2>
        <button
          type="button"
          onClick={share}
          className="ds-link-action"
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          <Share2 style={{ width: '14px', height: '14px' }} />
          {intl.formatMessage({ id: 'dashboard.personality_share', defaultMessage: 'Share' })}
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)', marginBottom: 'var(--spacing-3)' }}>
        <div
          className="ds-icon-box"
          style={{ background: 'var(--color-primary-light)', color: 'var(--ds-primary)' }}
        >
          <Icon style={{ width: '22px', height: '22px' }} />
        </div>
        <div>
          <div className="ds-metric-sm" style={{ color: 'var(--ds-text-heading)' }}>{archetypeName}</div>
          <p className="ds-supporting">
            {intl.formatMessage(
              {
                id: 'dashboard.personality_archetype_desc',
                defaultMessage:
                  '{archetype, select, planner {You plan it, then you stick to it.} impulsive {Money moves fast once it arrives.} seasonal {Your months each have their own shape.} cautious {You keep a healthy distance from the edge.} other {}}',
              },
              { archetype },
            )}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
        {evidenceLines.map((line, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--spacing-2)' }}>
            <span
              aria-hidden
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: 'var(--ds-primary)',
                marginTop: '7px',
                flexShrink: 0,
              }}
            />
            <p className="ds-supporting">{line}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatEvidence(ev: ArchetypeEvidence, intl: ReturnType<typeof useIntl>): string | null {
  const pct = (v: number) => intl.formatNumber(Math.round(v * 100));
  switch (ev.signal) {
    case 'adherence_streak':
      return intl.formatMessage(
        { id: 'dashboard.personality_evidence_streak', defaultMessage: '{count, plural, one {# month} other {# months}} in a row within budget' },
        { count: Number(ev.value) },
      );
    case 'impulse_index':
      return intl.formatMessage(
        { id: 'dashboard.personality_evidence_impulse', defaultMessage: '{percent}% of your flexible spending happens within 72h of payday' },
        { percent: pct(Number(ev.value)) },
      );
    case 'spend_timing':
      return intl.formatMessage(
        {
          id: 'dashboard.personality_evidence_timing',
          defaultMessage:
            '{profile, select, front_loader {Most spending lands early in your cycle} back_loader {Most spending lands late in your cycle} other {Your spending is spread evenly through the cycle}}',
        },
        { profile: String(ev.value) },
      );
    case 'small_txn_freq':
      return intl.formatMessage(
        { id: 'dashboard.personality_evidence_small_txn', defaultMessage: '{count} small purchases per week' },
        { count: intl.formatNumber(Number(ev.value)) },
      );
    case 'weekend_ratio':
      return intl.formatMessage(
        { id: 'dashboard.personality_evidence_weekend', defaultMessage: 'Weekend spending is {ratio}× your weekday average' },
        { ratio: intl.formatNumber(Number(ev.value)) },
      );
    case 'expense_volatility':
      return intl.formatMessage(
        { id: 'dashboard.personality_evidence_volatility', defaultMessage: 'Your monthly spending swings by {percent}%' },
        { percent: pct(Number(ev.value)) },
      );
    case 'savings_rate':
      return intl.formatMessage(
        { id: 'dashboard.personality_evidence_savings', defaultMessage: 'You save {percent}% of your income' },
        { percent: pct(Number(ev.value)) },
      );
    case 'discretionary_ratio':
      return intl.formatMessage(
        { id: 'dashboard.personality_evidence_discretionary', defaultMessage: 'Only {percent}% of your spending is flexible' },
        { percent: pct(Number(ev.value)) },
      );
    case 'recurring_share':
      return intl.formatMessage(
        { id: 'dashboard.personality_evidence_recurring', defaultMessage: '{percent}% of your expenses are fixed commitments' },
        { percent: pct(Number(ev.value)) },
      );
    case 'category_drift':
      return intl.formatMessage(
        { id: 'dashboard.personality_evidence_drift', defaultMessage: '{count, plural, one {# category} other {# categories}} shifted pattern recently' },
        { count: Number(ev.value) },
      );
    default:
      return null;
  }
}
