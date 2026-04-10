'use client';

import { useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useCrm } from '@/store/crmStore';
import { useOrg, useOrgPermission } from '@/store/orgStore';
import { Skeleton } from '@/components/ui/Skeleton';
import { computePipelineMetrics } from '@/crm/analytics/pipelineMetrics';
import { computeRepPerformance } from '@/crm/analytics/repPerformance';
import { computeForecast } from '@/crm/analytics/forecastEngine';
import { PipelineChart } from '@/components/crm/reports/PipelineChart';
import { ConversionFunnel } from '@/components/crm/reports/ConversionFunnel';
import { RepLeaderboard } from '@/components/crm/reports/RepLeaderboard';
import { ForecastChart } from '@/components/crm/reports/ForecastChart';
import { ActivityHeatmap } from '@/components/crm/reports/ActivityHeatmap';

export default function ReportsPage() {
  const intl = useIntl();
  const { deals, dealStages, tasks, communications, isLoading } = useCrm();
  const { orgMembers, currentOrg } = useOrg();
  const canView = useOrgPermission('reports.view');

  const t = (key: string, def: string) =>
    intl.formatMessage({ id: key, defaultMessage: def });

  const pipelineMetrics = useMemo(
    () => computePipelineMetrics(deals, dealStages),
    [deals, dealStages]
  );

  const repMetrics = useMemo(
    () => computeRepPerformance(deals, tasks, communications, orgMembers),
    [deals, tasks, communications, orgMembers]
  );

  const forecast = useMemo(() => computeForecast(deals), [deals]);

  if (!canView) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <p style={{ fontSize: '15px', color: 'var(--ds-text-heading)' }}>{t('crm.error.accessDenied', 'Access Denied')}</p>
      </div>
    );
  }

  if (isLoading.deals || isLoading.pipelines) {
    return (
      <div>
        <Skeleton width="200px" height="28px" borderRadius="8px" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1.5rem' }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} width="100%" height="300px" borderRadius="16px" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--ds-text-heading)', lineHeight: 1.3, fontFeatureSettings: '"kern" 1' }}>
          {t('crm.nav.reports', 'Reports')}
        </h1>
        <p style={{ fontSize: '13px', fontWeight: 400, color: 'var(--ds-text-muted)' }}>
          {t('crm.report.subtitle', 'التقارير والتحليلات')}
        </p>
      </div>

      {/* Summary stats */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <StatCard label={t('crm.report.winRate', 'Win Rate')} value={`${Math.round(pipelineMetrics.winRate)}%`} />
        <StatCard label={t('crm.report.avgCycleTime', 'Avg. Cycle Time')} value={`${Math.round(pipelineMetrics.avgCycleTime)} ${t('crm.misc.days', 'days')}`} />
        <StatCard label={t('crm.report.avgDealSize', 'Avg. Deal Size')} value={new Intl.NumberFormat(intl.locale, { maximumFractionDigits: 0 }).format(pipelineMetrics.avgDealSize)} />
      </div>

      {/* Charts grid */}
      <div className="crm-reports-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <PipelineChart data={pipelineMetrics.dealsByStage} />
        <ConversionFunnel data={pipelineMetrics.stageConversionRates} />
        <ForecastChart data={forecast.monthlyForecast} />
        <RepLeaderboard data={repMetrics} currency={currentOrg?.currency || 'SAR'} />
        <div style={{ gridColumn: '1 / -1' }}>
          <ActivityHeatmap communications={communications} />
        </div>
      </div>

      <style>{`
        @media (max-width: 767px) {
          .crm-reports-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: 'var(--ds-bg-card)', border: '0.5px solid var(--ds-border)', borderRadius: '12px', padding: '12px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', minWidth: '140px' }}>
      <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--ds-text-muted)' }}>{label}</div>
      <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ds-text-heading)', marginTop: '2px' }}>{value}</div>
    </div>
  );
}
