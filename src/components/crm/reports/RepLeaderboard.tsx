'use client';

import { useIntl } from 'react-intl';
import type { RepMetrics } from '@/crm/analytics/repPerformance';

interface RepLeaderboardProps {
  data: RepMetrics[];
  currency?: string;
}

export function RepLeaderboard({ data, currency = 'SAR' }: RepLeaderboardProps) {
  const intl = useIntl();
  const t = (key: string, def: string) => intl.formatMessage({ id: key, defaultMessage: def });

  const sorted = [...data].sort((a, b) => b.revenue - a.revenue);
  const formatCurrency = (v: number) => {
    try { return new Intl.NumberFormat(intl.locale, { style: 'currency', currency, maximumFractionDigits: 0 }).format(v); }
    catch { return String(v); }
  };

  return (
    <div style={{ background: 'var(--ds-bg-card)', border: '0.5px solid var(--ds-border)', borderRadius: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--ds-border)' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 500, color: 'var(--ds-text-heading)' }}>
          {t('crm.report.repLeaderboard', 'Rep Leaderboard')}
        </h3>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--ds-border)' }}>
            <th style={thStyle}>#</th>
            <th style={thStyle}>Rep</th>
            <th style={thStyle}>{t('crm.report.totalRevenue', 'Revenue')}</th>
            <th style={thStyle}>{t('crm.report.dealsWon', 'Won')}</th>
            <th style={thStyle}>{t('crm.report.openDeals', 'Open')}</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((rep, idx) => (
            <tr key={rep.userId} style={{ borderBottom: '1px solid var(--ds-border)' }}>
              <td style={tdStyle}>{idx + 1}</td>
              <td style={{ ...tdStyle, fontWeight: 500, color: 'var(--ds-text-heading)' }}>{rep.displayName}</td>
              <td style={{ ...tdStyle, color: 'var(--ds-accent-primary)', fontWeight: 500 }}>{formatCurrency(rep.revenue)}</td>
              <td style={tdStyle}>{rep.dealsWon}</td>
              <td style={tdStyle}>{rep.dealsOpen}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const thStyle: React.CSSProperties = { textAlign: 'start', padding: '10px 16px', fontSize: '11px', fontWeight: 500, color: 'var(--ds-text-muted)' };
const tdStyle: React.CSSProperties = { padding: '10px 16px', color: 'var(--ds-text-body)' };
