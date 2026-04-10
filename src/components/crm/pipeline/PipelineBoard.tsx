'use client';

import { useState, useMemo, useCallback } from 'react';
import { useIntl } from 'react-intl';
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  DragOverlay,
  DragStartEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Kanban } from 'lucide-react';
import { useCrm } from '@/store/crmStore';
import { useOrg, useOrgPermission } from '@/store/orgStore';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/crm/shared/EmptyState';
import { PipelineColumn } from './PipelineColumn';
import { DealCard } from './DealCard';
import type { CrmDeal, CrmDealStage } from '@/types/crm';

export function PipelineBoard() {
  const intl = useIntl();
  const {
    deals, dealStages, pipelines, contacts,
    isLoading, moveDealToStage, updateDeal,
  } = useCrm();
  const { currentOrg } = useOrg();
  const canWrite = useOrgPermission('deals.write');
  const orgCurrency = currentOrg?.currency || 'SAR';

  const [activeDeal, setActiveDeal] = useState<CrmDeal | null>(null);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null);

  // Won/Lost confirmation modal
  const [wonLostModal, setWonLostModal] = useState<{ dealId: string; stageId: string; isWon: boolean } | null>(null);
  const [wonLostReason, setWonLostReason] = useState('');

  const t = (key: string, def: string) =>
    intl.formatMessage({ id: key, defaultMessage: def });

  // Select default pipeline
  const activePipeline = useMemo(() => {
    if (selectedPipelineId) return pipelines.find(p => p.id === selectedPipelineId);
    return pipelines.find(p => p.isDefault) || pipelines[0];
  }, [pipelines, selectedPipelineId]);

  // Stages for active pipeline, sorted by position
  const pipelineStages = useMemo(() =>
    dealStages
      .filter(s => s.pipelineId === activePipeline?.id)
      .sort((a, b) => a.position - b.position),
    [dealStages, activePipeline]
  );

  // Group deals by stage
  const dealsByStage = useMemo(() => {
    const map = new Map<string, CrmDeal[]>();
    for (const stage of pipelineStages) {
      map.set(stage.id, []);
    }
    for (const deal of deals) {
      if (deal.pipelineId === activePipeline?.id) {
        const existing = map.get(deal.stageId) || [];
        existing.push(deal);
        map.set(deal.stageId, existing);
      }
    }
    return map;
  }, [deals, pipelineStages, activePipeline]);

  // Summary metrics
  const totalValue = useMemo(() =>
    deals.filter(d => d.pipelineId === activePipeline?.id && !d.closedAt)
      .reduce((sum, d) => sum + (d.value || 0), 0),
    [deals, activePipeline]
  );

  const weightedValue = useMemo(() =>
    deals.filter(d => d.pipelineId === activePipeline?.id && !d.closedAt)
      .reduce((sum, d) => sum + ((d.value || 0) * d.probability / 100), 0),
    [deals, activePipeline]
  );

  const openDealCount = useMemo(() =>
    deals.filter(d => d.pipelineId === activePipeline?.id && !d.closedAt).length,
    [deals, activePipeline]
  );

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const deal = deals.find(d => d.id === event.active.id);
    setActiveDeal(deal || null);
  };

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    setActiveDeal(null);
    const { active, over } = event;
    if (!over || !canWrite) return;

    const dealId = active.id as string;
    const deal = deals.find(d => d.id === dealId);
    if (!deal) return;

    // Determine target stage: over could be a stage or another deal
    let targetStageId = over.id as string;
    // If dropped on a deal, find that deal's stage
    const overDeal = deals.find(d => d.id === targetStageId);
    if (overDeal) targetStageId = overDeal.stageId;

    // If same stage, no action
    if (deal.stageId === targetStageId) return;

    // Check if target is won/lost stage
    const targetStage = pipelineStages.find(s => s.id === targetStageId);
    if (targetStage && (targetStage.isWon || targetStage.isLost)) {
      setWonLostModal({ dealId, stageId: targetStageId, isWon: targetStage.isWon });
      return;
    }

    await moveDealToStage(dealId, targetStageId);
  }, [deals, pipelineStages, canWrite, moveDealToStage]);

  const handleWonLostConfirm = async () => {
    if (!wonLostModal) return;
    // Save the reason before moving to terminal stage
    if (wonLostReason.trim()) {
      await updateDeal(wonLostModal.dealId, { wonLostReason: wonLostReason.trim() });
    }
    await moveDealToStage(wonLostModal.dealId, wonLostModal.stageId);
    setWonLostModal(null);
    setWonLostReason('');
  };

  const formatCurrency = (value: number) => {
    try {
      return new Intl.NumberFormat(intl.locale, {
        style: 'currency',
        currency: orgCurrency,
        maximumFractionDigits: 0,
      }).format(value);
    } catch { return String(value); }
  };

  // Loading
  if (isLoading.pipelines || isLoading.deals) {
    return (
      <div>
        <Skeleton width="200px" height="28px" borderRadius="8px" />
        <div style={{ display: 'flex', gap: '12px', marginTop: '1.5rem', overflowX: 'auto' }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ minWidth: '280px', flex: 1 }}>
              <Skeleton width="100%" height="80px" borderRadius="12px" />
              <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <Skeleton width="100%" height="100px" borderRadius="12px" />
                <Skeleton width="100%" height="100px" borderRadius="12px" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!activePipeline || pipelineStages.length === 0) {
    return (
      <EmptyState
        icon={Kanban}
        titleKey="crm.empty.deals.title"
        titleDefault="No deals in pipeline"
        bodyKey="crm.empty.deals.body"
        bodyDefault="Create your first deal to start tracking opportunities."
        ctaKey={canWrite ? 'crm.empty.deals.cta' : undefined}
        ctaDefault="Add Deal"
      />
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--ds-text-heading)', lineHeight: 1.3, fontFeatureSettings: '"kern" 1' }}>
            {t('crm.nav.pipeline', 'Pipeline')}
          </h1>
          <p style={{ fontSize: '13px', fontWeight: 400, color: 'var(--ds-text-muted)' }}>
            {t('crm.pipeline.subtitle', 'مسار المبيعات')}
          </p>
        </div>

        {/* Pipeline selector (if multiple) */}
        {pipelines.length > 1 && (
          <select
            value={activePipeline.id}
            onChange={e => setSelectedPipelineId(e.target.value)}
            style={{
              padding: '8px 12px',
              fontSize: '13px',
              border: '1px solid var(--ds-border)',
              borderRadius: '8px',
              background: 'var(--ds-bg-card)',
              color: 'var(--ds-text-body)',
            }}
          >
            {pipelines.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Summary row */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <div style={{ background: 'var(--ds-bg-card)', border: '0.5px solid var(--ds-border)', borderRadius: '12px', padding: '12px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--ds-text-muted)' }}>{t('crm.pipeline.totalValue', 'Total Value')}</div>
          <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ds-text-heading)' }}>{formatCurrency(totalValue)}</div>
        </div>
        <div style={{ background: 'var(--ds-bg-card)', border: '0.5px solid var(--ds-border)', borderRadius: '12px', padding: '12px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--ds-text-muted)' }}>{t('crm.pipeline.weightedValue', 'Weighted Value')}</div>
          <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ds-accent-primary)' }}>{formatCurrency(weightedValue)}</div>
        </div>
        <div style={{ background: 'var(--ds-bg-card)', border: '0.5px solid var(--ds-border)', borderRadius: '12px', padding: '12px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--ds-text-muted)' }}>{t('crm.pipeline.dealCount', 'Deal Count')}</div>
          <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ds-text-heading)' }}>{new Intl.NumberFormat(intl.locale).format(openDealCount)}</div>
        </div>
      </div>

      {/* Kanban board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div
          className="crm-pipeline-board"
          style={{
            display: 'flex',
            gap: '12px',
            overflowX: 'auto',
            paddingBottom: '1rem',
            scrollSnapType: 'x mandatory',
          }}
        >
          {pipelineStages.map(stage => (
            <PipelineColumn
              key={stage.id}
              stage={stage}
              deals={dealsByStage.get(stage.id) || []}
              contacts={contacts}
            />
          ))}
        </div>

        {/* Drag overlay — shows elevated deal card */}
        <DragOverlay>
          {activeDeal ? (
            <div style={{ opacity: 0.9, transform: 'rotate(2deg)' }}>
              <DealCard deal={activeDeal} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Won/Lost reason modal */}
      {wonLostModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={() => { setWonLostModal(null); setWonLostReason(''); }} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />
          <div style={{ position: 'relative', zIndex: 101, background: 'var(--ds-bg-card)', borderRadius: '16px', padding: '1.5rem', maxWidth: '400px', width: '90%' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 500, color: 'var(--ds-text-heading)', marginBottom: '0.75rem' }}>
              {t('crm.pipeline.wonLostPrompt', 'Why was this deal {outcome}?').replace('{outcome}', wonLostModal.isWon ? t('crm.misc.won', 'won') : t('crm.misc.lost', 'lost'))}
            </h3>
            <textarea
              value={wonLostReason}
              onChange={e => setWonLostReason(e.target.value)}
              placeholder={t('crm.pipeline.reasonPlaceholder', 'Enter reason...')}
              rows={3}
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: '14px',
                border: '1px solid var(--ds-border)',
                borderRadius: '8px',
                background: 'var(--ds-bg-card)',
                color: 'var(--ds-text-body)',
                resize: 'vertical',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: '8px', marginTop: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setWonLostModal(null); setWonLostReason(''); }}
                style={{ background: 'transparent', border: '1.5px solid var(--ds-border)', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer', color: 'var(--ds-text-body)' }}
              >
                {t('crm.action.cancel', 'Cancel')}
              </button>
              <button
                onClick={handleWonLostConfirm}
                style={{
                  background: wonLostModal.isWon ? 'var(--ds-accent-primary)' : 'var(--color-danger, #B54747)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                {t('crm.pipeline.confirmMove', 'Confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile: columns scroll with snap */}
      <style>{`
        @media (max-width: 767px) {
          .crm-pipeline-column {
            min-width: 85vw !important;
          }
        }
      `}</style>
    </div>
  );
}
