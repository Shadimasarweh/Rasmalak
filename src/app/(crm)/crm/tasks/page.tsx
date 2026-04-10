'use client';

import { useState } from 'react';
import { useIntl } from 'react-intl';
import { List, Calendar } from 'lucide-react';
import { TaskList } from '@/components/crm/tasks/TaskList';
import { TaskCalendar } from '@/components/crm/tasks/TaskCalendar';
import { useCrmTasks } from '@/store/crmStore';

export default function TasksPage() {
  const intl = useIntl();
  const { tasks } = useCrmTasks();
  const [view, setView] = useState<'list' | 'calendar'>('list');

  const t = (key: string, def: string) =>
    intl.formatMessage({ id: key, defaultMessage: def });

  return (
    <div>
      {/* View toggle */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', background: 'var(--ds-bg-card)', border: '0.5px solid var(--ds-border)', borderRadius: '8px', overflow: 'hidden' }}>
          <button
            onClick={() => setView('list')}
            style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              padding: '6px 14px', border: 'none', cursor: 'pointer',
              fontSize: '12px', fontWeight: 500,
              background: view === 'list' ? 'var(--ds-accent-primary)' : 'transparent',
              color: view === 'list' ? '#FFFFFF' : 'var(--ds-text-body)',
            }}
          >
            <List size={14} />
            {t('crm.task.list', 'List')}
          </button>
          <button
            onClick={() => setView('calendar')}
            style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              padding: '6px 14px', border: 'none', cursor: 'pointer',
              fontSize: '12px', fontWeight: 500,
              background: view === 'calendar' ? 'var(--ds-accent-primary)' : 'transparent',
              color: view === 'calendar' ? '#FFFFFF' : 'var(--ds-text-body)',
            }}
          >
            <Calendar size={14} />
            {t('crm.task.calendar', 'Calendar')}
          </button>
        </div>
      </div>

      {view === 'list' ? <TaskList /> : <TaskCalendar tasks={tasks} />}
    </div>
  );
}
