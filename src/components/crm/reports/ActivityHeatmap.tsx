'use client';

import { useMemo } from 'react';
import { useIntl } from 'react-intl';
import type { CrmCommunication } from '@/types/crm';

interface ActivityHeatmapProps {
  communications: CrmCommunication[];
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_AR = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function ActivityHeatmap({ communications }: ActivityHeatmapProps) {
  const intl = useIntl();
  const isAr = intl.locale.startsWith('ar');
  const t = (key: string, def: string) => intl.formatMessage({ id: key, defaultMessage: def });

  const grid = useMemo(() => {
    // 7 days × 24 hours matrix
    const matrix: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    for (const comm of communications) {
      const date = new Date(comm.occurredAt || comm.createdAt);
      const day = date.getDay();
      const hour = date.getHours();
      matrix[day][hour]++;
    }
    return matrix;
  }, [communications]);

  const maxCount = useMemo(() => Math.max(1, ...grid.flat()), [grid]);
  const dayLabels = isAr ? DAYS_AR : DAYS;

  const getColor = (count: number) => {
    if (count === 0) return 'var(--ds-bg-tinted)';
    const intensity = count / maxCount;
    if (intensity > 0.75) return '#2D6A4F';
    if (intensity > 0.5) return '#22C55E';
    if (intensity > 0.25) return '#86EFAC';
    return '#D1FAE5';
  };

  return (
    <div style={{ background: 'var(--ds-bg-card)', border: '0.5px solid var(--ds-border)', borderRadius: '16px', padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      <h3 style={{ fontSize: '15px', fontWeight: 500, color: 'var(--ds-text-heading)', marginBottom: '1rem' }}>
        {t('crm.report.activityHeatmap', 'Activity Heatmap')}
      </h3>

      <div style={{ overflowX: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '50px repeat(24, 1fr)', gap: '2px', minWidth: '600px' }}>
          {/* Hour headers */}
          <div />
          {HOURS.map(h => (
            <div key={h} style={{ fontSize: '9px', color: 'var(--ds-text-muted)', textAlign: 'center' }}>
              {h}
            </div>
          ))}

          {/* Rows */}
          {dayLabels.map((day, dayIdx) => (
            <>
              <div key={`label-${dayIdx}`} style={{ fontSize: '11px', color: 'var(--ds-text-muted)', display: 'flex', alignItems: 'center' }}>
                {day}
              </div>
              {HOURS.map(hour => (
                <div
                  key={`${dayIdx}-${hour}`}
                  title={`${day} ${hour}:00 — ${grid[dayIdx][hour]} activities`}
                  style={{
                    aspectRatio: '1',
                    borderRadius: '2px',
                    background: getColor(grid[dayIdx][hour]),
                    minWidth: '16px',
                    minHeight: '16px',
                  }}
                />
              ))}
            </>
          ))}
        </div>
      </div>
    </div>
  );
}
