'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useIntl } from 'react-intl';
import { useCurrency, useAccentColor } from '@/store/useStore';
import { useTranslation } from '@/hooks/useTranslation';
import { styledNum } from '@/components/StyledNumber';

interface MonthlyChartProps {
  data: { month: string; income: number; expenses: number }[];
}

export default function MonthlyChart({ data }: MonthlyChartProps) {
  const intl = useIntl();
  const currency = useCurrency();
  const accentColor = useAccentColor();
  const { language } = useTranslation();

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-[var(--color-text-muted)]">
        {language === 'ar' ? 'لا توجد بيانات' : 'No data available'}
      </div>
    );
  }

  // Format currency using intl
  const formatCurrencyValue = (value: number) => {
    return styledNum(intl.formatNumber(value, { style: 'currency', currency }));
  };

  // Format axis tick (abbreviated)
  const formatAxisTick = (value: number) => {
    const formatted = intl.formatNumber(value / 1000, { maximumFractionDigits: 0 });
    return `${formatted}k`;
  };

  // Render tooltip content as a function (not a component)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderTooltip = (props: any) => {
    const { active, payload, label } = props;
    if (active && payload && payload.length) {
      return (
        <div className="bg-[var(--color-bg-card)] p-3 rounded-lg shadow-lg border border-[var(--color-border)]">
          <p className="font-medium mb-2 text-[var(--color-text-primary)]">{label}</p>
          {payload.map((entry: { name: string; value: number; color: string }, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name === 'income' 
                ? (language === 'ar' ? 'الدخل' : 'Income')
                : (language === 'ar' ? 'المصاريف' : 'Expenses')
              }: {formatCurrencyValue(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="chart-container h-48">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-light)" />
          <XAxis
            dataKey="month"
            tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
            axisLine={{ stroke: 'var(--color-border-light)' }}
          />
          <YAxis
            tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
            axisLine={{ stroke: 'var(--color-border-light)' }}
            tickFormatter={formatAxisTick}
          />
          <Tooltip content={renderTooltip} />
          <Legend
            formatter={(value) => (
              <span className="text-sm text-[var(--color-text-secondary)]">
                {value === 'income' 
                  ? (language === 'ar' ? 'الدخل' : 'Income')
                  : (language === 'ar' ? 'المصاريف' : 'Expenses')
                }
              </span>
            )}
          />
          <Bar
            dataKey="income"
            name="income"
            fill={accentColor || '#1F7A5A'}
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="expenses"
            name="expenses"
            fill="#EF4444"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
