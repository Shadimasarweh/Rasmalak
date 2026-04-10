'use client';

import { useState, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { CheckSquare, Plus, Phone, Mail, Calendar, ArrowUpRight, Clock } from 'lucide-react';
import { useCrmTasks } from '@/store/crmStore';
import { useOrg, useOrgPermission } from '@/store/orgStore';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/crm/shared/EmptyState';
import type { CrmTask, TaskStatus, TaskPriority, TaskType } from '@/types/crm';

const STATUS_FILTERS: TaskStatus[] = ['pending', 'in_progress', 'completed', 'cancelled'];
const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: 'var(--ds-text-muted)',
  medium: '#3B82F6',
  high: '#F59E0B',
  urgent: '#EF4444',
};
const TYPE_ICONS: Record<TaskType, typeof CheckSquare> = {
  task: CheckSquare,
  call: Phone,
  email: Mail,
  meeting: Calendar,
  follow_up: ArrowUpRight,
};

export function TaskList() {
  const intl = useIntl();
  const { tasks, isLoading, completeTask } = useCrmTasks();
  const { orgMembers } = useOrg();
  const canWrite = useOrgPermission('tasks.write');

  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all');

  const t = (key: string, def: string) =>
    intl.formatMessage({ id: key, defaultMessage: def });

  const now = new Date();

  const filtered = useMemo(() => {
    let result = [...tasks];
    if (statusFilter !== 'all') result = result.filter(t => t.status === statusFilter);
    if (priorityFilter !== 'all') result = result.filter(t => t.priority === priorityFilter);
    return result;
  }, [tasks, statusFilter, priorityFilter]);

  const isOverdue = (task: CrmTask) =>
    task.dueDate && new Date(task.dueDate) < now && task.status !== 'completed' && task.status !== 'cancelled';

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    try {
      return new Intl.DateTimeFormat(intl.locale, { dateStyle: 'medium' }).format(new Date(dateStr));
    } catch { return '—'; }
  };

  const getMemberName = (userId: string | null) => {
    if (!userId) return '—';
    const member = orgMembers.find(m => m.userId === userId);
    return member?.displayName || member?.displayNameAr || '—';
  };

  if (isLoading) {
    return (
      <div>
        <Skeleton width="140px" height="28px" borderRadius="8px" />
        <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} width="100%" height="64px" borderRadius="12px" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--ds-text-heading)', lineHeight: 1.3, fontFeatureSettings: '"kern" 1' }}>
            {t('crm.nav.tasks', 'Tasks')}
          </h1>
          <p style={{ fontSize: '13px', fontWeight: 400, color: 'var(--ds-text-muted)' }}>
            {t('crm.task.subtitle', 'المهام')}
          </p>
        </div>
        {canWrite && (
          <button
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              background: 'var(--ds-accent-primary)', color: '#FFFFFF',
              border: 'none', borderRadius: '8px', padding: '9px 18px',
              fontSize: '13px', fontWeight: 500, cursor: 'pointer',
            }}
          >
            <Plus size={16} />
            {t('crm.task.addTask', 'Add Task')}
          </button>
        )}
      </div>

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <FilterPill label={t('crm.action.filter', 'All')} active={statusFilter === 'all'} onClick={() => setStatusFilter('all')} />
        {STATUS_FILTERS.map(s => (
          <FilterPill key={s} label={t(`crm.task.status.${s}`, s)} active={statusFilter === s} onClick={() => setStatusFilter(s)} />
        ))}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <EmptyState
          icon={CheckSquare}
          titleKey="crm.empty.tasks.title"
          titleDefault="No tasks yet"
          bodyKey="crm.empty.tasks.body"
          bodyDefault="Create a task to stay on top of your follow-ups."
          ctaKey={canWrite ? 'crm.empty.tasks.cta' : undefined}
          ctaDefault="Add Task"
        />
      )}

      {/* Task list */}
      {filtered.length > 0 && (
        <div
          style={{
            background: 'var(--ds-bg-card)',
            border: '0.5px solid var(--ds-border)',
            borderRadius: '16px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            overflow: 'hidden',
          }}
        >
          {filtered.map((task, idx) => {
            const Icon = TYPE_ICONS[task.type] || CheckSquare;
            const overdue = isOverdue(task);
            const completed = task.status === 'completed';

            return (
              <div
                key={task.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '14px 20px',
                  borderBottom: idx < filtered.length - 1 ? '1px solid var(--ds-border)' : 'none',
                  borderInlineStart: `3px solid ${PRIORITY_COLORS[task.priority]}`,
                }}
              >
                {/* Complete checkbox */}
                {canWrite && !completed && (
                  <button
                    onClick={() => completeTask(task.id)}
                    style={{
                      width: '20px', height: '20px', borderRadius: '50%',
                      border: '2px solid var(--ds-border)', background: 'transparent',
                      cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                    aria-label="Complete task"
                  />
                )}
                {completed && (
                  <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--ds-accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <CheckSquare size={12} style={{ color: '#FFFFFF' }} />
                  </div>
                )}

                {/* Type icon */}
                <Icon size={16} style={{ color: 'var(--ds-text-muted)', flexShrink: 0 }} />

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: 500,
                    color: completed ? 'var(--ds-text-muted)' : 'var(--ds-text-heading)',
                    textDecoration: completed ? 'line-through' : 'none',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {task.title}
                  </div>
                  {task.titleAr && (
                    <div style={{ fontSize: '13px', color: 'var(--ds-text-muted)', textDecoration: completed ? 'line-through' : 'none' }}>
                      {task.titleAr}
                    </div>
                  )}
                </div>

                {/* Assignee */}
                <span style={{ fontSize: '12px', color: 'var(--ds-text-muted)', flexShrink: 0 }}>
                  {getMemberName(task.assignedTo)}
                </span>

                {/* Due date */}
                <span style={{
                  fontSize: '12px',
                  color: overdue ? 'var(--color-danger, #B54747)' : 'var(--ds-text-muted)',
                  fontWeight: overdue ? 500 : 400,
                  flexShrink: 0,
                  display: 'flex', alignItems: 'center', gap: '4px',
                }}>
                  {overdue && <Clock size={12} />}
                  {formatDate(task.dueDate)}
                </span>

                {/* Priority pill */}
                <span style={{
                  fontSize: '11px', fontWeight: 500,
                  padding: '2px 8px', borderRadius: '9999px',
                  background: task.priority === 'urgent' ? 'rgba(239,68,68,0.1)' : 'var(--ds-bg-tinted)',
                  color: PRIORITY_COLORS[task.priority],
                  flexShrink: 0,
                }}>
                  {t(`crm.task.priority.${task.priority}`, task.priority)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FilterPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 14px',
        borderRadius: '9999px',
        border: 'none',
        background: active ? 'var(--ds-accent-primary)' : 'var(--ds-bg-card)',
        color: active ? '#FFFFFF' : 'var(--ds-text-body)',
        fontSize: '12px',
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'background 150ms ease',
        boxShadow: active ? 'none' : '0 0 0 0.5px var(--ds-border)',
      }}
    >
      {label}
    </button>
  );
}
