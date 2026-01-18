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
import { formatCurrency } from '@/lib/utils';
import { useCurrency } from '@/store/useStore';
import { useTranslation } from '@/hooks/useTranslation';

interface MonthlyChartProps {
  data: { month: string; income: number; expenses: number }[];
}

export default function MonthlyChart({ data }: MonthlyChartProps) {
  const currency = useCurrency();
  const { language } = useTranslation();

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-[var(--color-text-muted)]">
        {language === 'ar' ? 'لا توجد بيانات' : 'No data available'}
      </div>
    );
  }

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
              }: {formatCurrency(entry.value, currency)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="chart-container h-64">
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
            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
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
            fill="#10B981"
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
