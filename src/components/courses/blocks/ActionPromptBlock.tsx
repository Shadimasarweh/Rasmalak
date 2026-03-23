'use client';

export default function ActionPromptBlock({ text }: { text: string }) {
  return (
    <div
      style={{
        border: '1px dashed var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--spacing-4)',
        marginBottom: 'var(--spacing-4)',
        display: 'flex',
        gap: '12px',
        alignItems: 'flex-start',
      }}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--color-text-muted)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ flexShrink: 0, marginTop: '2px' }}
      >
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
      <p
        style={{
          fontSize: '0.875rem',
          lineHeight: 1.7,
          color: 'var(--color-text-secondary)',
          fontStyle: 'italic',
          margin: 0,
        }}
      >
        {text}
      </p>
    </div>
  );
}
