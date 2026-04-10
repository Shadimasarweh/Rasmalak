'use client';

import { useIntl } from 'react-intl';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { DealCard } from './DealCard';
import type { CrmDeal, CrmDealStage, CrmContact } from '@/types/crm';

interface PipelineColumnProps {
  stage: CrmDealStage;
  deals: CrmDeal[];
  contacts: CrmContact[];
}

export function PipelineColumn({ stage, deals, contacts }: PipelineColumnProps) {
  const intl = useIntl();
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });

  const totalValue = deals.reduce((sum, d) => sum + (d.value || 0), 0);
  const formatCurrency = (value: number) => {
    try {
      return new Intl.NumberFormat(intl.locale, {
        style: 'currency',
        currency: deals[0]?.currency || 'SAR',
        maximumFractionDigits: 0,
      }).format(value);
    } catch { return String(value); }
  };

  const getContactName = (contactId: string | null) => {
    if (!contactId) return undefined;
    const c = contacts.find(ct => ct.id === contactId);
    return c ? `${c.firstName} ${c.lastName || ''}`.trim() : undefined;
  };

  return (
    <div
      className="crm-pipeline-column"
      style={{
        minWidth: '280px',
        flex: '1 1 0',
        display: 'flex',
        flexDirection: 'column',
        scrollSnapAlign: 'start',
      }}
    >
      {/* Column header — tinted card (4c) */}
      <div
        style={{
          background: 'var(--ds-bg-tinted)',
          border: '1px solid #D1FAE5',
          borderRadius: '12px 12px 0 0',
          padding: '14px 18px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: stage.color, flexShrink: 0 }} />
          <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text-heading)' }}>
            {stage.name}
          </span>
          <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--ds-text-muted)', background: 'var(--ds-bg-card)', padding: '1px 8px', borderRadius: '9999px' }}>
            {deals.length}
          </span>
        </div>
        {stage.nameAr && (
          <div style={{ fontSize: '13px', fontWeight: 400, color: 'var(--ds-text-muted)', marginBottom: '4px' }}>
            {stage.nameAr}
          </div>
        )}
        {totalValue > 0 && (
          <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ds-accent-primary)' }}>
            {formatCurrency(totalValue)}
          </div>
        )}
      </div>

      {/* Droppable area */}
      <div
        ref={setNodeRef}
        style={{
          flex: 1,
          background: isOver ? 'rgba(45,106,79,0.04)' : 'transparent',
          border: isOver ? '2px dashed var(--ds-accent-primary)' : '2px dashed transparent',
          borderRadius: '0 0 12px 12px',
          padding: '8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          minHeight: '100px',
          transition: 'background 150ms ease, border-color 150ms ease',
        }}
      >
        <SortableContext items={deals.map(d => d.id)} strategy={verticalListSortingStrategy}>
          {deals.map(deal => (
            <DealCard
              key={deal.id}
              deal={deal}
              contactName={getContactName(deal.contactId)}
            />
          ))}
        </SortableContext>

        {deals.length === 0 && (
          <div style={{ textAlign: 'center', padding: '1.5rem 0.5rem', color: 'var(--ds-text-muted)', fontSize: '13px' }}>
            {intl.formatMessage({ id: 'crm.deal.noDeals', defaultMessage: 'No deals yet' })}
          </div>
        )}
      </div>
    </div>
  );
}
