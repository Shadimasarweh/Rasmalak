'use client';

import { useState } from 'react';
import { useIntl } from 'react-intl';
import { TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp } from 'lucide-react';

interface DealScoreProps {
  score: number | null;
  trend: string | null;
  reasoning: string | null;
  riskFactors?: string[];
  suggestedActions?: string[];
  scoredAt: string | null;
  compact?: boolean;
}

/**
 * DealScore — circular score badge with expandable detail panel.
 * Green (70+), amber (40-69), red (<40). Trend arrow: ↑/→/↓
 * Expanded panel uses tinted card (4c) per design system.
 */
export function DealScore({
  score, trend, reasoning, riskFactors, suggestedActions, scoredAt, compact = false,
}: DealScoreProps) {
  const intl = useIntl();
  const [expanded, setExpanded] = useState(false);

  if (score == null) return null;

  const color = score >= 70
    ? 'var(--ds-accent-primary)'
    : score >= 40
      ? '#F59E0B'
      : '#DC2626';

  const bgColor = score >= 70
    ? 'rgba(45,106,79,0.1)'
    : score >= 40
      ? 'rgba(245,158,11,0.1)'
      : 'rgba(220,38,38,0.1)';

  const TrendIcon = trend === 'improving' ? TrendingUp : trend === 'declining' ? TrendingDown : Minus;

  const formatDate = (d: string | null) => {
    if (!d) return '';
    try {
      return new Intl.DateTimeFormat(intl.locale, { dateStyle: 'medium' }).format(new Date(d));
    } catch { return ''; }
  };

  // Compact badge for pipeline cards
  if (compact) {
    return (
      <div
        title={reasoning ?? `Score: ${score}`}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '3px',
          padding: '2px 6px', borderRadius: '999px',
          background: bgColor, fontSize: '11px', fontWeight: 600, color,
          cursor: 'default',
        }}
      >
        {score}
        <TrendIcon size={10} />
      </div>
    );
  }

  // Full score badge with expandable panel
  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: bgColor, border: 'none', borderRadius: '12px',
          padding: '8px 14px', cursor: 'pointer', width: '100%',
        }}
      >
        {/* Circular score indicator */}
        <div style={{
          width: '40px', height: '40px', borderRadius: '50%',
          border: `3px solid ${color}`, display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: '14px', fontWeight: 700, color,
          flexShrink: 0,
        }}>
          {score}
        </div>

        <div style={{ flex: 1, textAlign: 'start' }}>
          <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ds-text-heading)' }}>
            AI Score
          </div>
          <div style={{ fontSize: '11px', color: 'var(--ds-text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <TrendIcon size={12} color={color} />
            {trend ?? 'stable'}
            {scoredAt && ` · ${formatDate(scoredAt)}`}
          </div>
        </div>

        {expanded ? <ChevronUp size={16} color="var(--ds-text-muted)" /> : <ChevronDown size={16} color="var(--ds-text-muted)" />}
      </button>

      {/* Expanded panel — tinted card (4c) */}
      {expanded && (
        <div style={{
          marginTop: '8px', padding: '16px 20px', borderRadius: '12px',
          background: 'var(--ds-bg-tinted)', border: '0.5px solid var(--ds-border)',
        }}>
          {/* Reasoning */}
          {reasoning && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ds-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                Analysis
              </div>
              <div style={{ fontSize: '13px', color: 'var(--ds-text-body)', lineHeight: 1.5 }}>
                {reasoning}
              </div>
            </div>
          )}

          {/* Risk factors */}
          {riskFactors && riskFactors.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#DC2626', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                Risk Factors
              </div>
              <ul style={{ margin: 0, paddingInlineStart: '16px', fontSize: '12px', color: 'var(--ds-text-body)', lineHeight: 1.6 }}>
                {riskFactors.map((f, i) => <li key={i}>{f}</li>)}
              </ul>
            </div>
          )}

          {/* Suggested actions */}
          {suggestedActions && suggestedActions.length > 0 && (
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ds-accent-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                Suggested Actions
              </div>
              <ul style={{ margin: 0, paddingInlineStart: '16px', fontSize: '12px', color: 'var(--ds-text-body)', lineHeight: 1.6 }}>
                {suggestedActions.map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
