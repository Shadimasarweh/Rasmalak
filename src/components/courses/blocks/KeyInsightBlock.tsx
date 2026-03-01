'use client';

export default function KeyInsightBlock({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div
      style={{
        background: 'var(--color-bg-surface-2)',
        borderInlineStart: '3px solid var(--color-accent-growth)',
        borderRadius: 'var(--radius-sm)',
        padding: 'var(--spacing-4)',
        marginBottom: 'var(--spacing-4)',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          marginBottom: 'var(--spacing-2)',
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
          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
        </svg>
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            color: 'var(--color-accent-growth)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          {title}
        </span>
      </div>
      <p
        style={{
          fontSize: '0.9375rem',
          lineHeight: 1.75,
          color: 'var(--color-text-primary)',
          fontWeight: 500,
          margin: 0,
        }}
      >
        {text}
      </p>
    </div>
  );
}
