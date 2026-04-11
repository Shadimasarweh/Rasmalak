'use client';

import { useState, useEffect } from 'react';
import { useIntl } from 'react-intl';
import { useAutomation } from '@/store/automationStore';
import { TemplateGallery } from '@/components/crm/automation/TemplateGallery';
import { WorkflowBuilder } from '@/components/crm/automation/WorkflowBuilder';
import { WorkflowLog } from '@/components/crm/automation/WorkflowLog';
import { Zap, Plus, ToggleLeft, ToggleRight, Pencil, Trash2 } from 'lucide-react';
import type { CrmWorkflow } from '@/types/crm';

type Tab = 'workflows' | 'templates' | 'log';

export default function AutomationPage() {
  const intl = useIntl();
  const t = (key: string, def: string) => intl.formatMessage({ id: key, defaultMessage: def });
  const {
    workflows, isLoading, fetchWorkflows, fetchTemplates, fetchLogs,
    deleteWorkflow, toggleWorkflow,
  } = useAutomation();

  const [tab, setTab] = useState<Tab>('workflows');
  const [editing, setEditing] = useState<CrmWorkflow | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchTemplates();
    fetchLogs();
  }, [fetchTemplates, fetchLogs]);

  const handleEdit = (wf: CrmWorkflow) => {
    setEditing(wf);
    setCreating(false);
  };

  const handleCreate = () => {
    setEditing(null);
    setCreating(true);
  };

  const handleBuilderClose = () => {
    setEditing(null);
    setCreating(false);
    fetchWorkflows();
  };

  const handleDelete = async (id: string) => {
    if (confirm(t('automation.workflow.deleteConfirm', 'Are you sure?'))) {
      await deleteWorkflow(id);
    }
  };

  // Show builder if creating or editing
  if (creating || editing) {
    return <WorkflowBuilder workflow={editing} onClose={handleBuilderClose} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--ds-text-heading)', fontFeatureSettings: '"kern" 1' }}>
            {t('automation.title', 'Automation')}
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--ds-text-muted)' }}>
            {t('automation.subtitle', 'Automate repetitive tasks and streamline your sales process')}
          </p>
        </div>
        {tab === 'workflows' && (
          <button
            onClick={handleCreate}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              background: 'var(--ds-accent-primary)', color: '#FFFFFF', border: 'none',
              borderRadius: '8px', padding: '9px 18px', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
            }}
          >
            <Plus size={16} />
            {t('automation.workflow.create', 'Create Workflow')}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid var(--ds-border)' }}>
        {(['workflows', 'templates', 'log'] as Tab[]).map(tabId => (
          <button
            key={tabId}
            onClick={() => setTab(tabId)}
            style={{
              padding: '0.625rem 1.25rem', fontSize: '13px', fontWeight: tab === tabId ? 500 : 400,
              color: tab === tabId ? 'var(--ds-accent-primary)' : 'var(--ds-text-muted)',
              background: 'none', border: 'none', cursor: 'pointer',
              borderBottom: tab === tabId ? '2px solid var(--ds-accent-primary)' : '2px solid transparent',
              marginBottom: '-1px', transition: 'color 150ms, border-color 150ms',
            }}
          >
            {t(`automation.tab.${tabId}`, tabId)}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'workflows' && (
        <WorkflowList
          workflows={workflows}
          isLoading={isLoading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onToggle={toggleWorkflow}
          t={t}
        />
      )}

      {tab === 'templates' && <TemplateGallery />}
      {tab === 'log' && <WorkflowLog />}
    </div>
  );
}

/* ── Workflow List ─────────────────────────────────────────── */

function WorkflowList({
  workflows, isLoading, onEdit, onDelete, onToggle, t,
}: {
  workflows: CrmWorkflow[];
  isLoading: boolean;
  onEdit: (wf: CrmWorkflow) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, active: boolean) => Promise<boolean>;
  t: (key: string, def: string) => string;
}) {
  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ background: 'var(--ds-bg-card)', border: '0.5px solid var(--ds-border)', borderRadius: '16px', padding: '20px 24px', height: '88px', animation: 'pulse 1.5s ease-in-out infinite' }} />
        ))}
      </div>
    );
  }

  if (workflows.length === 0) {
    return (
      <div style={{
        background: 'var(--ds-bg-card)', border: '0.5px solid var(--ds-border)', borderRadius: '16px',
        padding: '3rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      }}>
        <Zap size={32} style={{ color: 'var(--ds-text-muted)' }} />
        <div style={{ fontSize: '15px', fontWeight: 500, color: 'var(--ds-text-heading)' }}>
          {t('automation.workflow.empty', 'No workflows yet')}
        </div>
        <div style={{ fontSize: '13px', color: 'var(--ds-text-muted)', textAlign: 'center', maxWidth: '320px' }}>
          {t('automation.workflow.empty.desc', 'Create your first workflow or install a template to get started.')}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {workflows.map(wf => (
        <div
          key={wf.id}
          style={{
            background: 'var(--ds-bg-card)', border: '0.5px solid var(--ds-border)', borderRadius: '16px',
            padding: '16px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '15px', fontWeight: 500, color: 'var(--ds-text-heading)' }}>
                {wf.name}
              </span>
              <span style={{
                fontSize: '11px', fontWeight: 500, padding: '2px 8px', borderRadius: '999px',
                background: wf.isActive ? 'var(--ds-bg-tinted)' : 'var(--ds-bg-page)',
                color: wf.isActive ? 'var(--ds-accent-primary)' : 'var(--ds-text-muted)',
              }}>
                {wf.isActive ? t('automation.workflow.active', 'Active') : t('automation.workflow.inactive', 'Inactive')}
              </span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--ds-text-muted)', display: 'flex', gap: '1rem' }}>
              <span>{t('automation.workflow.runs', '{count} runs').replace('{count}', String(wf.runCount))}</span>
              <span>
                {wf.lastRunAt
                  ? t('automation.workflow.lastRun', 'Last run: {date}').replace('{date}', new Date(wf.lastRunAt).toLocaleDateString())
                  : t('automation.workflow.neverRun', 'Never run')
                }
              </span>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button onClick={() => onToggle(wf.id, !wf.isActive)} title={t('automation.workflow.toggle', 'Toggle')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: wf.isActive ? 'var(--ds-accent-primary)' : 'var(--ds-text-muted)', padding: '4px' }}>
              {wf.isActive ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
            </button>
            <button onClick={() => onEdit(wf)} title={t('automation.workflow.edit', 'Edit')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ds-text-muted)', padding: '4px' }}>
              <Pencil size={16} />
            </button>
            <button onClick={() => onDelete(wf.id)} title={t('automation.workflow.delete', 'Delete')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ds-text-muted)', padding: '4px' }}>
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
