'use client';

import { useState } from 'react';
import { useIntl } from 'react-intl';
import { ArrowLeft, Save } from 'lucide-react';
import { useAutomation } from '@/store/automationStore';
import { TriggerSelector } from './TriggerSelector';
import { ConditionEditor } from './ConditionEditor';
import { ActionList } from './ActionList';
import type { CrmWorkflow, TriggerType, WorkflowCondition, WorkflowAction } from '@/types/crm';

interface WorkflowBuilderProps {
  workflow: CrmWorkflow | null;
  onClose: () => void;
}

export function WorkflowBuilder({ workflow, onClose }: WorkflowBuilderProps) {
  const intl = useIntl();
  const t = (key: string, def: string) => intl.formatMessage({ id: key, defaultMessage: def });
  const { createWorkflow, updateWorkflow } = useAutomation();

  const [name, setName] = useState(workflow?.name ?? '');
  const [nameAr, setNameAr] = useState(workflow?.nameAr ?? '');
  const [description, setDescription] = useState(workflow?.description ?? '');
  const [descriptionAr, setDescriptionAr] = useState(workflow?.descriptionAr ?? '');
  const [triggerType, setTriggerType] = useState<TriggerType | ''>(workflow?.triggerType ?? '');
  const [triggerConfig, setTriggerConfig] = useState<Record<string, unknown>>(workflow?.triggerConfig ?? {});
  const [conditions, setConditions] = useState<WorkflowCondition[]>(workflow?.conditions ?? []);
  const [actions, setActions] = useState<WorkflowAction[]>(workflow?.actions ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleTriggerChange = (type: TriggerType, config: Record<string, unknown>) => {
    setTriggerType(type);
    setTriggerConfig(config);
  };

  const handleSave = async () => {
    if (!name.trim() || !triggerType) {
      setError('Name and trigger are required');
      return;
    }

    setSaving(true);
    setError('');

    const data = {
      name, nameAr: nameAr || null, description: description || null,
      descriptionAr: descriptionAr || null, triggerType: triggerType as TriggerType,
      triggerConfig, conditions, actions,
    };

    let success: boolean;
    if (workflow) {
      success = await updateWorkflow(workflow.id, data);
    } else {
      const result = await createWorkflow(data);
      success = !!result;
    }

    setSaving(false);

    if (success) {
      onClose();
    } else {
      setError(t('automation.builder.error', 'Failed to save workflow'));
    }
  };

  const inputStyle = {
    width: '100%', padding: '10px 14px', fontSize: '13px', borderRadius: '8px',
    border: '0.5px solid var(--ds-border)', background: 'var(--ds-bg-page)',
    color: 'var(--ds-text-body)',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ds-text-muted)', padding: '4px' }}>
            <ArrowLeft size={20} />
          </button>
          <h1 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--ds-text-heading)' }}>
            {t('automation.builder.title', 'Workflow Builder')}
          </h1>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            background: 'var(--ds-accent-primary)', color: '#FFFFFF', border: 'none',
            borderRadius: '8px', padding: '9px 18px', fontSize: '13px', fontWeight: 500,
            cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1,
          }}
        >
          <Save size={16} />
          {t('automation.builder.save', 'Save Workflow')}
        </button>
      </div>

      {error && (
        <div style={{ padding: '10px 16px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', color: '#DC2626', fontSize: '13px' }}>
          {error}
        </div>
      )}

      {/* Name fields */}
      <div style={{
        background: 'var(--ds-bg-card)', border: '0.5px solid var(--ds-border)', borderRadius: '16px',
        padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        display: 'flex', flexDirection: 'column', gap: '0.75rem',
      }}>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--ds-text-muted)', marginBottom: '4px' }}>
              {t('automation.builder.name', 'Name')}
            </label>
            <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--ds-text-muted)', marginBottom: '4px' }}>
              {t('automation.builder.nameAr', 'Name (Arabic)')}
            </label>
            <input style={inputStyle} value={nameAr} onChange={e => setNameAr(e.target.value)} dir="rtl" />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--ds-text-muted)', marginBottom: '4px' }}>
              {t('automation.builder.description', 'Description')}
            </label>
            <textarea style={{ ...inputStyle, minHeight: '56px', resize: 'vertical' }} value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--ds-text-muted)', marginBottom: '4px' }}>
              {t('automation.builder.descriptionAr', 'Description (Arabic)')}
            </label>
            <textarea style={{ ...inputStyle, minHeight: '56px', resize: 'vertical' }} value={descriptionAr} onChange={e => setDescriptionAr(e.target.value)} dir="rtl" />
          </div>
        </div>
      </div>

      {/* Vertical flow: Trigger → Conditions → Actions */}
      <TriggerSelector triggerType={triggerType} triggerConfig={triggerConfig} onChange={handleTriggerChange} />

      {triggerType && (
        <>
          {/* Flow connector */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: '2px', height: '20px', background: 'var(--ds-border)' }} />
          </div>

          <ConditionEditor conditions={conditions} onChange={setConditions} />

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: '2px', height: '20px', background: 'var(--ds-border)' }} />
          </div>

          <ActionList actions={actions} onChange={setActions} />
        </>
      )}
    </div>
  );
}
