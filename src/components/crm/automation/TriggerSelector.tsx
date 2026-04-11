'use client';

import { useIntl } from 'react-intl';
import type { TriggerType } from '@/types/crm';

const TRIGGER_TYPES: TriggerType[] = [
  'deal_created', 'deal_stage_changed', 'deal_value_changed', 'deal_closed',
  'contact_created', 'contact_updated', 'contact_tagged',
  'task_overdue', 'task_completed',
  'communication_logged', 'no_activity', 'scheduled',
];

interface TriggerSelectorProps {
  triggerType: TriggerType | '';
  triggerConfig: Record<string, unknown>;
  onChange: (type: TriggerType, config: Record<string, unknown>) => void;
}

export function TriggerSelector({ triggerType, triggerConfig, onChange }: TriggerSelectorProps) {
  const intl = useIntl();
  const t = (key: string, def: string) => intl.formatMessage({ id: key, defaultMessage: def });

  const handleTypeChange = (type: TriggerType) => {
    onChange(type, {});
  };

  const handleConfigChange = (key: string, value: unknown) => {
    onChange(triggerType as TriggerType, { ...triggerConfig, [key]: value });
  };

  return (
    <div style={{
      background: 'var(--ds-bg-card)', border: '0.5px solid var(--ds-border)', borderRadius: '16px',
      padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    }}>
      <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text-heading)', marginBottom: '12px' }}>
        {t('automation.trigger.title', 'When this happens…')}
      </div>

      <select
        value={triggerType}
        onChange={e => handleTypeChange(e.target.value as TriggerType)}
        style={{
          width: '100%', padding: '10px 14px', fontSize: '13px', borderRadius: '8px',
          border: '0.5px solid var(--ds-border)', background: 'var(--ds-bg-page)',
          color: 'var(--ds-text-body)', marginBottom: '12px',
        }}
      >
        <option value="">{t('automation.trigger.select', 'Select a trigger')}</option>
        {TRIGGER_TYPES.map(type => (
          <option key={type} value={type}>
            {t(`automation.trigger.${type}`, type)}
          </option>
        ))}
      </select>

      {/* Per-trigger config */}
      {triggerType === 'deal_stage_changed' && (
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <ConfigInput label={t('automation.trigger.config.fromStage', 'From Stage')} value={triggerConfig.fromStage as string ?? ''} onChange={v => handleConfigChange('fromStage', v)} placeholder={t('automation.trigger.config.anyStage', 'Any Stage')} />
          <ConfigInput label={t('automation.trigger.config.toStage', 'To Stage')} value={triggerConfig.toStage as string ?? ''} onChange={v => handleConfigChange('toStage', v)} placeholder={t('automation.trigger.config.anyStage', 'Any Stage')} />
        </div>
      )}

      {triggerType === 'deal_closed' && (
        <select
          value={triggerConfig.outcome as string ?? ''}
          onChange={e => handleConfigChange('outcome', e.target.value || undefined)}
          style={{ width: '100%', padding: '10px 14px', fontSize: '13px', borderRadius: '8px', border: '0.5px solid var(--ds-border)', background: 'var(--ds-bg-page)', color: 'var(--ds-text-body)' }}
        >
          <option value="">{t('automation.trigger.config.anyStage', 'Any')}</option>
          <option value="won">{t('automation.trigger.config.won', 'Won')}</option>
          <option value="lost">{t('automation.trigger.config.lost', 'Lost')}</option>
        </select>
      )}

      {triggerType === 'deal_value_changed' && (
        <ConfigInput label={t('automation.trigger.config.threshold', 'Threshold %')} value={String(triggerConfig.threshold ?? '')} onChange={v => handleConfigChange('threshold', Number(v))} type="number" />
      )}

      {triggerType === 'contact_tagged' && (
        <ConfigInput label={t('automation.trigger.config.tag', 'Tag')} value={triggerConfig.tag as string ?? ''} onChange={v => handleConfigChange('tag', v)} />
      )}

      {triggerType === 'no_activity' && (
        <ConfigInput label={t('automation.trigger.config.days', 'Days')} value={String(triggerConfig.days ?? '')} onChange={v => handleConfigChange('days', Number(v))} type="number" />
      )}

      {triggerType === 'scheduled' && (
        <select
          value={triggerConfig.schedule as string ?? 'daily'}
          onChange={e => handleConfigChange('schedule', e.target.value)}
          style={{ width: '100%', padding: '10px 14px', fontSize: '13px', borderRadius: '8px', border: '0.5px solid var(--ds-border)', background: 'var(--ds-bg-page)', color: 'var(--ds-text-body)' }}
        >
          <option value="daily">{t('automation.trigger.config.daily', 'Daily')}</option>
          <option value="weekly">{t('automation.trigger.config.weekly', 'Weekly')}</option>
          <option value="monthly">{t('automation.trigger.config.monthly', 'Monthly')}</option>
        </select>
      )}
    </div>
  );
}

function ConfigInput({ label, value, onChange, type = 'text', placeholder = '' }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div style={{ flex: 1 }}>
      <label style={{ display: 'block', fontSize: '12px', color: 'var(--ds-text-muted)', marginBottom: '4px' }}>{label}</label>
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', padding: '8px 12px', fontSize: '13px', borderRadius: '8px', border: '0.5px solid var(--ds-border)', background: 'var(--ds-bg-page)', color: 'var(--ds-text-body)' }}
      />
    </div>
  );
}
