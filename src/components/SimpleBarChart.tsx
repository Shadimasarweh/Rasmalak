'use client';

interface BarData {
  label: string;
  value: number;
}

interface SimpleBarChartProps {
  data: BarData[];
  maxValue?: number;
  barColor?: string;
  height?: number;
}

export default function SimpleBarChart({
  data,
  maxValue,
  barColor = 'var(--color-primary)',
  height = 120,
}: SimpleBarChartProps) {
  const max = maxValue || Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="chart-container" dir="ltr">
      <div className="flex items-end justify-between gap-2" style={{ height }}>
        {data.map((item, index) => {
          const barHeight = max > 0 ? (item.value / max) * 100 : 0;
          return (
            <div key={index} className="flex-1 flex flex-col items-center gap-2">
              <div
                className="w-full rounded-t-lg transition-all duration-500"
                style={{
                  height: `${barHeight}%`,
                  backgroundColor: barColor,
                  minHeight: item.value > 0 ? '4px' : '0',
                }}
              />
              <span className="text-[10px] text-[var(--color-text-muted)] text-center whitespace-nowrap">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}




