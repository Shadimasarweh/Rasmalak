'use client';

export default function BulletListBlock({ items }: { items: string[] }) {
  return (
    <ul
      style={{
        marginBottom: 'var(--spacing-4)',
        paddingInlineStart: '0',
        listStyle: 'none',
      }}
    >
      {items.map((item, i) => (
        <li
          key={i}
          style={{
            fontSize: '0.9375rem',
            lineHeight: 1.85,
            color: 'var(--color-text-secondary)',
            marginBottom: 'var(--spacing-2)',
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-start',
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: 'var(--color-accent-growth)',
              flexShrink: 0,
              marginTop: '10px',
            }}
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
