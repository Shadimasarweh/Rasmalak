'use client';

/**
 * End-of-cycle forecast card — the dashboard's first chart with an
 * uncertainty band. Renders the engine's per-day P25–P75 range from today
 * to cycle end (a range, never a point — the product promise).
 */

import { useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AI_FEATURES } from '@/ai/config';
import { usePredictiveState } from '@/lib/predictive/PredictiveProvider';
import { useBaseCurrency, useLanguage } from '@/store/useStore';

interface ChartPoint {
  day: number;
  band: [number, number];
  p50: number;
}

export default function CycleForecastCard({ fullWidth = false }: { fullWidth?: boolean }) {
  const intl = useIntl();
  const language = useLanguage();
  const currency = useBaseCurrency();
  const { state } = usePredictiveState();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // Recharts must not render during SSR hydration (RealityCheckCard pattern).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const isRTL = language === 'ar';

  const data = useMemo<ChartPoint[]>(() => {
    if (!state) return [];
    const startDay = state.cycle.daysElapsed;
    return state.forecast.perDay.map((d, i) => ({
      day: startDay + i,
      band: [d.balanceP25, d.balanceP75],
      p50: d.balanceP50,
    }));
  }, [state]);

  if (!AI_FEATURES.forecastCard || !state || !state.meta.hasMinimumHistory) return null;
  // A one-point path (last day of cycle) isn't a chart.
  if (data.length < 2 || state.forecast.basis.confidence === 'low') return null;

  const { p25, p50, p75 } = state.forecast.endOfCycleBalance;
  const anyNegative = p25 < 0;
  const confidence = state.forecast.basis.confidence;

  const fmtMoney = (v: number) => intl.formatNumber(v, { style: 'currency', currency, maximumFractionDigits: 0 });

  return (
    <div className={`ds-card ${fullWidth ? 'ds-col-12' : 'ds-col-8'}`} style={{ animation: 'fadeIn 300ms ease-out', direction: isRTL ? 'rtl' : 'ltr' }}>
      <div className="ds-section-header" style={{ marginBottom: 'var(--spacing-3)' }}>
        <h2 className="ds-title-section">
          {intl.formatMessage({ id: 'dashboard.forecast_title', defaultMessage: 'End-of-cycle forecast' })}
        </h2>
        <span className="ds-badge" style={{ background: 'var(--color-primary-light)', color: 'var(--ds-primary)' }}>
          {intl.formatMessage(
            {
              id: 'dashboard.forecast_confidence',
              defaultMessage: '{level, select, high {High confidence} medium {Medium confidence} other {Low confidence}}',
            },
            { level: confidence },
          )}
        </span>
      </div>

      {mounted && (
        <div style={{ height: '220px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <CartesianGrid stroke="var(--color-border-light)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="day"
                reversed={isRTL}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
                tickFormatter={(d: number) => intl.formatNumber(d)}
              />
              <YAxis hide />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  const point = payload[0].payload as ChartPoint;
                  return (
                    <div
                      style={{
                        background: 'var(--color-bg-card)',
                        border: '1px solid var(--ds-border)',
                        borderRadius: '10px',
                        padding: '10px 12px',
                        fontSize: '12.5px',
                        color: 'var(--color-text-primary)',
                        direction: isRTL ? 'rtl' : 'ltr',
                      }}
                    >
                      <div style={{ fontWeight: 600, marginBottom: '4px' }}>
                        {intl.formatMessage(
                          { id: 'dashboard.forecast_tooltip_day', defaultMessage: 'Day {day}' },
                          { day: intl.formatNumber(Number(label)) },
                        )}
                      </div>
                      <div>
                        {intl.formatMessage(
                          { id: 'dashboard.forecast_tooltip_range', defaultMessage: 'Range: {low} – {high}' },
                          { low: fmtMoney(point.band[0]), high: fmtMoney(point.band[1]) },
                        )}
                      </div>
                      <div style={{ color: 'var(--color-text-muted)' }}>
                        {intl.formatMessage(
                          { id: 'dashboard.forecast_tooltip_median', defaultMessage: 'Expected: {value}' },
                          { value: fmtMoney(point.p50) },
                        )}
                      </div>
                    </div>
                  );
                }}
              />
              {anyNegative && <ReferenceLine y={0} stroke="var(--color-danger-text)" strokeOpacity={0.4} />}
              <ReferenceLine
                x={data[0].day}
                stroke="var(--color-text-muted)"
                strokeDasharray="3 3"
                label={{
                  value: intl.formatMessage({ id: 'dashboard.forecast_today', defaultMessage: 'Today' }),
                  fill: 'var(--color-text-muted)',
                  fontSize: 11,
                  position: 'insideTopLeft',
                }}
              />
              <Area
                dataKey="band"
                stroke="none"
                fill="var(--ds-primary)"
                fillOpacity={0.12}
                isAnimationActive={false}
                activeDot={false}
              />
              <Area
                type="monotone"
                dataKey="p50"
                stroke="var(--ds-primary)"
                strokeWidth={2}
                strokeDasharray="4 3"
                fill="none"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <p className="ds-supporting" style={{ marginTop: 'var(--spacing-3)' }}>
        {intl.formatMessage(
          { id: 'dashboard.forecast_end_balance', defaultMessage: 'Projected balance at cycle end: {median} (between {low} and {high})' },
          { median: fmtMoney(p50), low: fmtMoney(p25), high: fmtMoney(p75) },
        )}
      </p>
    </div>
  );
}
