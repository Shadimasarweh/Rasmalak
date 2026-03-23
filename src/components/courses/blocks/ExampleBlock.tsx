'use client';

export default function ExampleBlock({
  title,
  rows,
}: {
  title?: string;
  rows: { label: string; value: string }[];
}) {
  return (
    <div
      style={{
        marginBottom: 'var(--spacing-4)',
        border: '1px solid var(--color-border-subtle)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
      }}
    >
      {title && (
        <div
          style={{
            padding: '10px var(--spacing-3)',
            background: 'var(--color-bg-surface-2)',
            borderBottom: '1px solid var(--color-border-subtle)',
          }}
        >
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color: 'var(--color-text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            {title}
          </span>
        </div>
      )}
      <div style={{ padding: 0 }}>
        {rows.map((row, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px var(--spacing-3)',
              borderBottom: i < rows.length - 1 ? '1px solid var(--color-border-subtle)' : 'none',
              background: i % 2 === 0 ? 'transparent' : 'var(--color-bg-surface-1)',
            }}
          >
            <span
              style={{
                fontSize: '0.875rem',
                color: 'var(--color-text-secondary)',
                fontWeight: 400,
              }}
            >
              {row.label}
            </span>
            <span
              style={{
                fontSize: '0.875rem',
                color: 'var(--color-text-primary)',
                fontWeight: 600,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
