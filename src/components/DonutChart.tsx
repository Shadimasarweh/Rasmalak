'use client';

interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  segments: DonutSegment[];
  total: number;
  centerLabel?: string;
  centerValue?: string;
  size?: number;
  strokeWidth?: number;
  showLegend?: boolean;
}

export default function DonutChart({
  segments,
  total,
  centerLabel,
  centerValue,
  size = 160,
  strokeWidth = 24,
  showLegend = true,
}: DonutChartProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let cumulativePercentage = 0;
  const segmentData = segments.map((segment) => {
    const percentage = total > 0 ? (segment.value / total) * 100 : 0;
    const dashArray = (percentage / 100) * circumference;
    const dashOffset = circumference - (cumulativePercentage / 100) * circumference;
    cumulativePercentage += percentage;
    return {
      ...segment,
      percentage,
      dashArray,
      dashOffset,
    };
  });

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="var(--color-border)"
            strokeWidth={strokeWidth}
          />
          {segmentData.map((segment, index) => (
            <circle
              key={index}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={segment.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${segment.dashArray} ${circumference - segment.dashArray}`}
              strokeDashoffset={segment.dashOffset}
              strokeLinecap="round"
              className="transition-all duration-500"
            />
          ))}
        </svg>
        {(centerLabel || centerValue) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {centerLabel && (
              <span className="text-[10px] text-[var(--color-text-muted)]">{centerLabel}</span>
            )}
            {centerValue && (
              <span className="text-sm font-bold text-[var(--color-text-primary)] ltr-nums">{centerValue}</span>
            )}
          </div>
        )}
      </div>
      {showLegend && segmentData.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1">
          {segmentData.map((segment, index) => (
            <div key={index} className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: segment.color }}
              />
              <span className="text-[10px] text-[var(--color-text-muted)] truncate">{segment.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
