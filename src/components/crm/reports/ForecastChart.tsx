'use client';

import { useIntl } from 'react-intl';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import type { MonthlyForecast } from '@/crm/analytics/forecastEngine';

interface ForecastChartProps {
  data: MonthlyForecast[];
}

export function ForecastChart({ data }: ForecastChartProps) {
  const intl = useIntl();
  const t = (key: string, def: string) => intl.formatMessage({ id: key, defaultMessage: def });

  return (
    <div style={{ background: 'var(--ds-bg-card)', border: '0.5px solid var(--ds-border)', borderRadius: '16px', padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      <h3 style={{ fontSize: '15px', fontWeight: 500, color: 'var(--ds-text-heading)', marginBottom: '1rem' }}>
        {t('crm.report.forecast', 'Revenue Forecast')}
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--ds-border)" />
          <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--ds-text-muted)' }} />
          <YAxis tick={{ fontSize: 12, fill: 'var(--ds-text-muted)' }} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="bestCase" stroke="#22C55E" strokeWidth={1} strokeDasharray="5 5" name={t('crm.report.bestCase', 'Best Case')} dot={false} />
          <Line type="monotone" dataKey="expected" stroke="#2D6A4F" strokeWidth={2} name={t('crm.report.expectedCase', 'Expected')} />
          <Line type="monotone" dataKey="worstCase" stroke="#D97706" strokeWidth={1} strokeDasharray="5 5" name={t('crm.report.worstCase', 'Worst Case')} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
