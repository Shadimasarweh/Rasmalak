'use client';

export default function CheckpointBlock({
  title,
  items,
  isRtl,
}: {
  title?: string;
  items: string[];
  isRtl: boolean;
}) {
  return (
    <div
      style={{
        background: 'var(--color-bg-surface-2)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--spacing-4)',
        marginBottom: 'var(--spacing-4)',
        borderTop: '2px solid var(--color-accent-growth)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: 'var(--spacing-3)',
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--color-accent-growth)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
        <span
          style={{
            fontSize: '0.8125rem',
            fontWeight: 700,
            color: 'var(--color-accent-growth)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          {title || (isRtl ? 'نقطة مراجعة' : 'Checkpoint')}
        </span>
      </div>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {items.map((item, i) => (
          <li
            key={i}
            style={{
              fontSize: '0.8125rem',
              lineHeight: 1.7,
              color: 'var(--color-text-primary)',
              fontWeight: 500,
              display: 'flex',
              gap: '10px',
              alignItems: 'flex-start',
              marginBottom: i < items.length - 1 ? '6px' : 0,
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="var(--color-accent-growth)"
              style={{ flexShrink: 0, marginTop: '4px' }}
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
