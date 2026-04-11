'use client';

import { useEffect } from 'react';
import { useIntl } from 'react-intl';
import { useAutomation } from '@/store/automationStore';
import { CheckCircle, XCircle, MinusCircle, Clock } from 'lucide-react';

export function WorkflowLog() {
  const intl = useIntl();
  const t = (key: string, def: string) => intl.formatMessage({ id: key, defaultMessage: def });
  const { logs, workflows, fetchLogs } = useAutomation();

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  // Map workflow IDs to names for display
  const nameMap = new Map(workflows.map(w => [w.id, w.name]));

  if (logs.length === 0) {
    return (
      <div style={{
        background: 'var(--ds-bg-card)', border: '0.5px solid var(--ds-border)', borderRadius: '16px',
        padding: '3rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      }}>
        <Clock size={32} style={{ color: 'var(--ds-text-muted)' }} />
        <div style={{ fontSize: '15px', fontWeight: 500, color: 'var(--ds-text-heading)' }}>
          {t('automation.log.empty', 'No executions yet')}
        </div>
        <div style={{ fontSize: '13px', color: 'var(--ds-text-muted)', textAlign: 'center', maxWidth: '320px' }}>
          {t('automation.log.empty.desc', 'Logs will appear here when your workflows run.')}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: 'var(--ds-bg-card)', border: '0.5px solid var(--ds-border)', borderRadius: '16px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden',
    }}>
      {/* Table header */}
      <div style={{
        display: 'grid', gridTemplateColumns: '2fr 1fr 80px 80px 120px',
        padding: '10px 20px', borderBottom: '0.5px solid var(--ds-border)',
        fontSize: '11px', fontWeight: 500, color: 'var(--ds-text-muted)', textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}>
        <span>{t('automation.log.workflow', 'Workflow')}</span>
        <span>{t('automation.log.trigger', 'Trigger')}</span>
        <span>{t('automation.log.result', 'Result')}</span>
        <span>{t('automation.log.duration', 'Duration')}</span>
        <span>{t('automation.log.date', 'Date')}</span>
      </div>

      {/* Rows */}
      {logs.map(log => {
        const triggerType = (log.triggerEvent as Record<string, unknown>)?.type as string ?? '—';
        const hasError = !!log.error;
        const skipped = !log.conditionsMet && !hasError;

        return (
          <div
            key={log.id}
            style={{
              display: 'grid', gridTemplateColumns: '2fr 1fr 80px 80px 120px',
              padding: '10px 20px', borderBottom: '0.5px solid var(--ds-border)',
              fontSize: '13px', color: 'var(--ds-text-body)', alignItems: 'center',
            }}
          >
            {/* Workflow name */}
            <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {nameMap.get(log.workflowId) ?? log.workflowId.slice(0, 8)}
            </span>

            {/* Trigger type */}
            <span style={{ fontSize: '12px', color: 'var(--ds-text-muted)' }}>
              {triggerType}
            </span>

            {/* Result */}
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {hasError ? (
                <><XCircle size={14} color="#DC2626" /> <span style={{ fontSize: '12px', color: '#DC2626' }}>{t('automation.log.failed', 'Failed')}</span></>
              ) : skipped ? (
                <><MinusCircle size={14} color="var(--ds-text-muted)" /> <span style={{ fontSize: '12px', color: 'var(--ds-text-muted)' }}>{t('automation.log.skipped', 'Skipped')}</span></>
              ) : (
                <><CheckCircle size={14} color="var(--ds-accent-primary)" /> <span style={{ fontSize: '12px', color: 'var(--ds-accent-primary)' }}>{t('automation.log.success', 'Success')}</span></>
              )}
            </span>

            {/* Duration */}
            <span style={{ fontSize: '12px', color: 'var(--ds-text-muted)' }}>
              {log.executionMs != null ? t('automation.log.ms', '{ms}ms').replace('{ms}', String(log.executionMs)) : '—'}
            </span>

            {/* Date */}
            <span style={{ fontSize: '12px', color: 'var(--ds-text-muted)' }}>
              {new Date(log.createdAt).toLocaleDateString(intl.locale, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        );
      })}
    </div>
  );
}
