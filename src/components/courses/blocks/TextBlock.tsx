'use client';

export default function TextBlock({ text }: { text: string }) {
  return (
    <p
      style={{
        fontSize: '0.9375rem',
        lineHeight: 1.85,
        color: 'var(--color-text-secondary)',
        marginBottom: 'var(--spacing-3)',
        maxWidth: '680px',
      }}
    >
      {text}
    </p>
  );
}
