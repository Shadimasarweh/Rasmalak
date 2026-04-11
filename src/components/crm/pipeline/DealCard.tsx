'use client';

import { useIntl } from 'react-intl';
import { useRouter } from 'next/navigation';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { DealScore } from '@/components/crm/deals/DealScore';
import type { CrmDeal } from '@/types/crm';

interface DealCardProps {
  deal: CrmDeal;
  contactName?: string;
}

export function DealCard({ deal, contactName }: DealCardProps) {
  const intl = useIntl();
  const router = useRouter();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: deal.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    background: 'var(--ds-bg-card)',
    border: '0.5px solid var(--ds-border)',
    borderRadius: '12px',
    padding: '14px 16px',
    boxShadow: isDragging ? '0 4px 16px rgba(0,0,0,0.12)' : '0 1px 4px rgba(0,0,0,0.04)',
    cursor: 'grab',
    touchAction: 'none',
  };

  const formatCurrency = (value: number | null, currency: string) => {
    if (value == null) return '—';
    try {
      return new Intl.NumberFormat(intl.locale, {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
      }).format(value);
    } catch { return `${value} ${currency}`; }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    try {
      return new Intl.DateTimeFormat(intl.locale, { dateStyle: 'medium' }).format(new Date(dateStr));
    } catch { return dateStr; }
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
        {/* Drag handle */}
        <div {...listeners} style={{ cursor: 'grab', color: 'var(--ds-text-muted)', paddingTop: '2px', flexShrink: 0 }}>
          <GripVertical size={14} />
        </div>

        {/* Card content — clickable to navigate */}
        <div
          onClick={() => router.push(`/crm/deals/${deal.id}`)}
          style={{ flex: 1, cursor: 'pointer', minWidth: 0 }}
        >
          <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text-heading)', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {deal.title}
          </div>
          {deal.titleAr && (
            <div style={{ fontSize: '13px', fontWeight: 400, color: 'var(--ds-text-muted)', marginBottom: '6px' }}>
              {deal.titleAr}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ds-accent-primary)' }}>
              {formatCurrency(deal.value, deal.currency)}
            </span>

            {/* Probability pill */}
            <span
              style={{
                fontSize: '11px',
                fontWeight: 500,
                padding: '2px 8px',
                borderRadius: '9999px',
                background: deal.probability >= 75 ? 'rgba(34,197,94,0.1)' : deal.probability >= 50 ? 'rgba(245,158,11,0.1)' : 'var(--ds-bg-tinted)',
                color: deal.probability >= 75 ? '#22C55E' : deal.probability >= 50 ? '#F59E0B' : 'var(--ds-text-muted)',
              }}
            >
              {new Intl.NumberFormat(intl.locale).format(deal.probability)}%
            </span>
          </div>

          {/* V2: AI Score badge — conditional, only renders when ai_score exists */}
          {('aiScore' in deal) && (deal as Record<string, unknown>).aiScore != null && (
            <div style={{ marginTop: '6px', display: 'flex', justifyContent: 'flex-end' }}>
              <DealScore
                score={(deal as Record<string, unknown>).aiScore as number}
                trend={(deal as Record<string, unknown>).aiScoreTrend as string | null}
                reasoning={null}
                scoredAt={null}
                compact
              />
            </div>
          )}

          {/* Contact name + close date */}
          <div style={{ marginTop: '6px', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--ds-text-muted)' }}>
            <span>{contactName || ''}</span>
            <span>{formatDate(deal.expectedClose)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
