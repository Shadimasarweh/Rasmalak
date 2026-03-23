'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';
import { ChartDataPoint } from '@/types';
import { CHART_COLORS } from '@/lib/constants';

interface ExpenseChartProps {
  data: ChartDataPoint[];
}

export default function ExpenseChart({ data }: ExpenseChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-[var(--color-text-muted)]">
        لا توجد بيانات
      </div>
    );
  }

  return (
    <div className="chart-container h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color || CHART_COLORS[index % CHART_COLORS.length]}
              />
            ))}
          </Pie>
          <Legend
            layout="vertical"
            align="right"
            verticalAlign="middle"
            formatter={(value) => (
              <span className="text-sm text-[var(--color-text-primary)]">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
