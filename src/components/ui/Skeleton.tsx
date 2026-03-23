'use client';

export function Skeleton({ width = '100%', height = '16px', borderRadius = '4px' }: { width?: string; height?: string; borderRadius?: string }) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius,
        background: 'linear-gradient(90deg, var(--ds-border) 25%, var(--ds-bg-tinted) 50%, var(--ds-border) 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s ease-in-out infinite',
      }}
    />
  );
}
