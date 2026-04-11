'use client';

import { useIntl } from 'react-intl';
import { Plus, X, GripVertical } from 'lucide-react';
import { ActionConfigurator } from './ActionConfigurator';
import type { WorkflowAction, ActionType } from '@/types/crm';

const ACTION_TYPES: ActionType[] = [
  'create_task', 'send_notification', 'move_deal_stage',
  'add_tag', 'remove_tag', 'update_field',
  'send_email', 'send_whatsapp', 'send_slack',
  'assign_to', 'wait', 'webhook',
];

interface ActionListProps {
  actions: WorkflowAction[];
  onChange: (actions: WorkflowAction[]) => void;
}

export function ActionList({ actions, onChange }: ActionListProps) {
  const intl = useIntl();
  const t = (key: string, def: string) => intl.formatMessage({ id: key, defaultMessage: def });

  const addAction = () => {
    const order = actions.length;
    onChange([...actions, { type: 'create_task', config: {}, order }]);
  };

  const updateAction = (index: number, updates: Partial<WorkflowAction>) => {
    const next = [...actions];
    next[index] = { ...next[index], ...updates };
    onChange(next);
  };

  const removeAction = (index: number) => {
    const next = actions.filter((_, i) => i !== index).map((a, i) => ({ ...a, order: i }));
    onChange(next);
  };

  // Simple drag reorder via move up/down (native drag requires @dnd-kit, added in full integration)
  const moveAction = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= actions.length) return;
    const next = [...actions];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next.map((a, i) => ({ ...a, order: i })));
  };

  return (
    <div style={{
      background: 'var(--ds-bg-card)', border: '0.5px solid var(--ds-border)', borderRadius: '16px',
      padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    }}>
      <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text-heading)', marginBottom: '12px' }}>
        {t('automation.action.title', 'Then do…')}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {actions.map((action, i) => (
          <div key={i} style={{
            border: '0.5px solid var(--ds-border)', borderRadius: '12px', padding: '12px 16px',
            background: 'var(--ds-bg-page)',
          }}>
            {/* Action header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '8px' }}>
              <button onClick={() => moveAction(i, -1)} disabled={i === 0} style={{ background: 'none', border: 'none', cursor: i === 0 ? 'default' : 'pointer', color: 'var(--ds-text-muted)', padding: '2px', opacity: i === 0 ? 0.3 : 1 }}>
                <GripVertical size={14} />
              </button>

              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ds-text-muted)', minWidth: '20px' }}>
                {i + 1}.
              </span>

              <select
                value={action.type}
                onChange={e => updateAction(i, { type: e.target.value as ActionType, config: {} })}
                style={{
                  flex: 1, padding: '6px 10px', fontSize: '13px', borderRadius: '6px',
                  border: '0.5px solid var(--ds-border)', background: 'var(--ds-bg-card)',
                  color: 'var(--ds-text-body)',
                }}
              >
                {ACTION_TYPES.map(type => (
                  <option key={type} value={type}>{t(`automation.action.${type}`, type)}</option>
                ))}
              </select>

              <button onClick={() => removeAction(i)} title={t('automation.action.remove', 'Remove')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ds-text-muted)', padding: '4px' }}>
                <X size={14} />
              </button>
            </div>

            {/* Action config */}
            <ActionConfigurator
              actionType={action.type}
              config={action.config}
              onChange={config => updateAction(i, { config })}
            />
          </div>
        ))}
      </div>

      <button onClick={addAction} style={{
        display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '12px',
        background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px',
        color: 'var(--ds-accent-primary)', fontWeight: 500, padding: '4px 0',
      }}>
        <Plus size={14} />
        {t('automation.action.add', 'Add Action')}
      </button>
    </div>
  );
}
