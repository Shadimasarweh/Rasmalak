'use client';

import { useIntl } from 'react-intl';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface PipelineChartProps {
  data: { stageName: string; count: number; value: number }[];
}

export function PipelineChart({ data }: PipelineChartProps) {
  const intl = useIntl();
  const t = (key: string, def: string) => intl.formatMessage({ id: key, defaultMessage: def });

  return (
    <div style={{ background: 'var(--ds-bg-card)', border: '0.5px solid var(--ds-border)', borderRadius: '16px', padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      <h3 style={{ fontSize: '15px', fontWeight: 500, color: 'var(--ds-text-heading)', marginBottom: '1rem' }}>
        {t('crm.report.pipelineOverview', 'Pipeline Overview')}
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--ds-border)" />
          <XAxis dataKey="stageName" tick={{ fontSize: 12, fill: 'var(--ds-text-muted)' }} />
          <YAxis tick={{ fontSize: 12, fill: 'var(--ds-text-muted)' }} />
          <Tooltip />
          <Bar dataKey="count" fill="#2D6A4F" radius={[4, 4, 0, 0]} name={t('crm.pipeline.dealCount', 'Deals')} />
          <Bar dataKey="value" fill="#22C55E" radius={[4, 4, 0, 0]} name={t('crm.pipeline.totalValue', 'Value')} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
