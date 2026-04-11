'use client';

import { useIntl } from 'react-intl';
import { Plus, X } from 'lucide-react';
import type { WorkflowCondition, ConditionOperator } from '@/types/crm';

const OPERATORS: ConditionOperator[] = [
  'equals', 'not_equals', 'contains', 'not_contains',
  'greater_than', 'less_than', 'greater_or_equal', 'less_or_equal',
  'is_empty', 'is_not_empty', 'in_list', 'not_in_list',
  'days_since_greater', 'days_since_less',
];

interface ConditionEditorProps {
  conditions: WorkflowCondition[];
  onChange: (conditions: WorkflowCondition[]) => void;
}

export function ConditionEditor({ conditions, onChange }: ConditionEditorProps) {
  const intl = useIntl();
  const t = (key: string, def: string) => intl.formatMessage({ id: key, defaultMessage: def });

  const addCondition = () => {
    onChange([...conditions, { field: '', operator: 'equals', value: '', logic: 'and' }]);
  };

  const updateCondition = (index: number, updates: Partial<WorkflowCondition>) => {
    const next = [...conditions];
    next[index] = { ...next[index], ...updates };
    onChange(next);
  };

  const removeCondition = (index: number) => {
    onChange(conditions.filter((_, i) => i !== index));
  };

  return (
    <div style={{
      background: 'var(--ds-bg-card)', border: '0.5px solid var(--ds-border)', borderRadius: '16px',
      padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    }}>
      <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text-heading)', marginBottom: '12px' }}>
        {t('automation.condition.title', 'Only if…')}
      </div>

      {conditions.length === 0 && (
        <div style={{ fontSize: '12px', color: 'var(--ds-text-muted)', marginBottom: '12px', fontStyle: 'italic' }}>
          {t('automation.condition.empty', 'No conditions — workflow runs for all matching triggers.')}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {conditions.map((cond, i) => (
          <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Logic toggle (skip for first) */}
            {i > 0 && (
              <select
                value={cond.logic ?? 'and'}
                onChange={e => updateCondition(i, { logic: e.target.value as 'and' | 'or' })}
                style={{ width: '72px', padding: '8px', fontSize: '12px', borderRadius: '8px', border: '0.5px solid var(--ds-border)', background: 'var(--ds-bg-page)', color: 'var(--ds-text-body)' }}
              >
                <option value="and">{t('automation.condition.logic.and', 'AND')}</option>
                <option value="or">{t('automation.condition.logic.or', 'OR')}</option>
              </select>
            )}

            {/* Field */}
            <input
              value={cond.field} onChange={e => updateCondition(i, { field: e.target.value })}
              placeholder={t('automation.condition.field', 'Field')}
              style={{ flex: 1, minWidth: '120px', padding: '8px 12px', fontSize: '13px', borderRadius: '8px', border: '0.5px solid var(--ds-border)', background: 'var(--ds-bg-page)', color: 'var(--ds-text-body)' }}
            />

            {/* Operator */}
            <select
              value={cond.operator} onChange={e => updateCondition(i, { operator: e.target.value as ConditionOperator })}
              style={{ width: '160px', padding: '8px', fontSize: '12px', borderRadius: '8px', border: '0.5px solid var(--ds-border)', background: 'var(--ds-bg-page)', color: 'var(--ds-text-body)' }}
            >
              {OPERATORS.map(op => (
                <option key={op} value={op}>{t(`automation.operator.${op}`, op)}</option>
              ))}
            </select>

            {/* Value (hidden for is_empty/is_not_empty) */}
            {cond.operator !== 'is_empty' && cond.operator !== 'is_not_empty' && (
              <input
                value={String(cond.value ?? '')} onChange={e => updateCondition(i, { value: e.target.value })}
                placeholder={t('automation.condition.value', 'Value')}
                style={{ flex: 1, minWidth: '100px', padding: '8px 12px', fontSize: '13px', borderRadius: '8px', border: '0.5px solid var(--ds-border)', background: 'var(--ds-bg-page)', color: 'var(--ds-text-body)' }}
              />
            )}

            <button onClick={() => removeCondition(i)} title={t('automation.condition.remove', 'Remove')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ds-text-muted)', padding: '4px' }}>
              <X size={16} />
            </button>
          </div>
        ))}
      </div>

      <button onClick={addCondition} style={{
        display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '8px',
        background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px',
        color: 'var(--ds-accent-primary)', fontWeight: 500, padding: '4px 0',
      }}>
        <Plus size={14} />
        {t('automation.condition.add', 'Add Condition')}
      </button>
    </div>
  );
}
