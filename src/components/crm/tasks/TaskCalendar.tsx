'use client';

import { useState, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
} from 'date-fns';
import { ar } from 'date-fns/locale';
import type { CrmTask } from '@/types/crm';

interface TaskCalendarProps {
  tasks: CrmTask[];
  onDayClick?: (date: Date, dayTasks: CrmTask[]) => void;
}

export function TaskCalendar({ tasks, onDayClick }: TaskCalendarProps) {
  const intl = useIntl();
  const isAr = intl.locale.startsWith('ar');
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const t = (key: string, def: string) =>
    intl.formatMessage({ id: key, defaultMessage: def });

  // Generate calendar days
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: isAr ? 6 : 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: isAr ? 6 : 0 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  // Map tasks to dates
  const tasksByDate = useMemo(() => {
    const map = new Map<string, CrmTask[]>();
    for (const task of tasks) {
      if (!task.dueDate) continue;
      const key = format(new Date(task.dueDate), 'yyyy-MM-dd');
      const existing = map.get(key) || [];
      existing.push(task);
      map.set(key, existing);
    }
    return map;
  }, [tasks]);

  const getTaskDots = (date: Date) => {
    const key = format(date, 'yyyy-MM-dd');
    const dayTasks = tasksByDate.get(key) || [];
    const now = new Date();

    const completed = dayTasks.some(t => t.status === 'completed');
    const overdue = dayTasks.some(t => t.status !== 'completed' && t.status !== 'cancelled' && new Date(t.dueDate!) < now);
    const pending = dayTasks.some(t => t.status === 'pending' || t.status === 'in_progress');

    return { completed, overdue, pending, count: dayTasks.length };
  };

  const dayNames = isAr
    ? ['س', 'ج', 'خ', 'أ', 'ث', 'إ', 'ح']  // Sat-Fri for Arabic
    : ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  return (
    <div style={{ background: 'var(--ds-bg-card)', border: '0.5px solid var(--ds-border)', borderRadius: '16px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      {/* Month navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <button
          onClick={() => setCurrentMonth(prev => subMonths(prev, 1))}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ds-text-body)', padding: '4px' }}
        >
          <ChevronLeft size={18} />
        </button>
        <span style={{ fontSize: '15px', fontWeight: 500, color: 'var(--ds-text-heading)' }}>
          {format(currentMonth, 'MMMM yyyy', { locale: isAr ? ar : undefined })}
        </span>
        <button
          onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ds-text-body)', padding: '4px' }}
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '4px' }}>
        {dayNames.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: '11px', fontWeight: 500, color: 'var(--ds-text-muted)', padding: '4px' }}>
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
        {days.map(day => {
          const inMonth = isSameMonth(day, currentMonth);
          const today = isToday(day);
          const dots = getTaskDots(day);
          const key = format(day, 'yyyy-MM-dd');
          const dayTasks = tasksByDate.get(key) || [];

          return (
            <button
              key={key}
              onClick={() => dayTasks.length > 0 && onDayClick?.(day, dayTasks)}
              style={{
                aspectRatio: '1',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '8px',
                border: today ? '2px solid var(--ds-accent-primary)' : 'none',
                background: today ? 'var(--ds-bg-tinted)' : 'transparent',
                cursor: dayTasks.length > 0 ? 'pointer' : 'default',
                fontSize: '13px',
                fontWeight: today ? 600 : 400,
                color: inMonth ? 'var(--ds-text-body)' : 'var(--ds-text-muted)',
                opacity: inMonth ? 1 : 0.4,
                padding: '2px',
                position: 'relative',
              }}
            >
              <span>{format(day, 'd')}</span>
              {/* Task dots */}
              {dots.count > 0 && (
                <div style={{ display: 'flex', gap: '2px', marginTop: '2px' }}>
                  {dots.completed && <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#22C55E' }} />}
                  {dots.pending && <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#F59E0B' }} />}
                  {dots.overdue && <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#EF4444' }} />}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', justifyContent: 'center' }}>
        <LegendItem color="#22C55E" label={t('crm.task.completed', 'Completed')} />
        <LegendItem color="#F59E0B" label={t('crm.task.status.pending', 'Pending')} />
        <LegendItem color="#EF4444" label={t('crm.task.overdue', 'Overdue')} />
      </div>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: color }} />
      <span style={{ fontSize: '11px', color: 'var(--ds-text-muted)' }}>{label}</span>
    </div>
  );
}
