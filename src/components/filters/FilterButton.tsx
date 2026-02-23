'use client';

import { useIntl } from 'react-intl';

const FilterIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
);

interface FilterButtonProps {
  activeCount: number;
  isOpen: boolean;
  onToggle: () => void;
}

export function FilterButton({ activeCount, isOpen, onToggle }: FilterButtonProps) {
  const intl = useIntl();

  return (
    <button
      type="button"
      onClick={onToggle}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 16px',
        fontSize: '0.8125rem',
        fontWeight: 500,
        border: `1.5px solid ${isOpen ? 'var(--color-accent-growth)' : 'var(--color-border)'}`,
        borderRadius: 'var(--radius-sm)',
        background: isOpen ? 'rgba(var(--accent-color-rgb), 0.08)' : 'transparent',
        color: isOpen ? 'var(--color-accent-growth)' : 'var(--color-text-secondary)',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        flexShrink: 0,
      }}
    >
      <FilterIcon />
      <span>
        {intl.formatMessage({ id: 'filters.button', defaultMessage: 'Filters' })}
      </span>
      {activeCount > 0 && (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '20px',
            height: '20px',
            padding: '0 6px',
            fontSize: '0.6875rem',
            fontWeight: 700,
            borderRadius: 'var(--radius-pill)',
            background: 'var(--color-accent-growth)',
            color: '#FFFFFF',
            lineHeight: 1,
          }}
        >
          {activeCount}
        </span>
      )}
    </button>
  );
}
