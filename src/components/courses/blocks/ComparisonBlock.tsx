'use client';

export default function ComparisonBlock({
  leftTitle,
  rightTitle,
  leftItems,
  rightItems,
}: {
  leftTitle: string;
  rightTitle: string;
  leftItems: string[];
  rightItems: string[];
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 0,
        marginBottom: 'var(--spacing-4)',
        border: '1px solid var(--color-border-subtle)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
      }}
    >
      {/* Left column */}
      <div
        style={{
          borderInlineEnd: '1px solid var(--color-border-subtle)',
        }}
      >
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
              color: 'var(--color-accent-growth)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            {leftTitle}
          </span>
        </div>
        <div style={{ padding: 'var(--spacing-3)' }}>
          {leftItems.map((item, i) => (
            <div
              key={i}
              style={{
                fontSize: '0.8125rem',
                lineHeight: 1.7,
                color: 'var(--color-text-secondary)',
                display: 'flex',
                gap: '8px',
                alignItems: 'flex-start',
                marginBottom: i < leftItems.length - 1 ? '6px' : 0,
              }}
            >
              <span
                style={{
                  width: '5px',
                  height: '5px',
                  borderRadius: '50%',
                  background: 'var(--color-accent-growth)',
                  flexShrink: 0,
                  marginTop: '8px',
                }}
              />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right column */}
      <div>
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
            {rightTitle}
          </span>
        </div>
        <div style={{ padding: 'var(--spacing-3)' }}>
          {rightItems.map((item, i) => (
            <div
              key={i}
              style={{
                fontSize: '0.8125rem',
                lineHeight: 1.7,
                color: 'var(--color-text-secondary)',
                display: 'flex',
                gap: '8px',
                alignItems: 'flex-start',
                marginBottom: i < rightItems.length - 1 ? '6px' : 0,
              }}
            >
              <span
                style={{
                  width: '5px',
                  height: '5px',
                  borderRadius: '50%',
                  background: 'var(--color-text-muted)',
                  flexShrink: 0,
                  marginTop: '8px',
                }}
              />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
