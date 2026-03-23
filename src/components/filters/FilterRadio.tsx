'use client';

import { ReactNode } from 'react';

interface FilterRadioProps {
  label: string;
  selected: boolean;
  onChange: () => void;
  icon?: ReactNode;
}

export function FilterRadio({ label, selected, onChange, icon }: FilterRadioProps) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '7px 4px',
        borderRadius: 'var(--radius-xs, 4px)',
        cursor: 'pointer',
        transition: 'background 0.15s ease',
        background: selected ? 'rgba(var(--accent-color-rgb), 0.06)' : 'transparent',
      }}
      onMouseEnter={(e) => {
        if (!selected) e.currentTarget.style.background = 'var(--color-bg-surface-2)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = selected
          ? 'rgba(var(--accent-color-rgb), 0.06)'
          : 'transparent';
      }}
    >
      {/* Custom radio */}
      <span
        onClick={(e) => {
          e.preventDefault();
          onChange();
        }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '18px',
          height: '18px',
          borderRadius: '50%',
          border: selected
            ? '2px solid var(--color-accent-growth)'
            : '2px solid var(--color-border)',
          background: 'transparent',
          transition: 'all 0.15s ease',
          flexShrink: 0,
        }}
      >
        {selected && (
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: 'var(--color-accent-growth)',
            }}
          />
        )}
      </span>

      {icon && (
        <span style={{ fontSize: '1rem', lineHeight: 1, flexShrink: 0 }}>{icon}</span>
      )}

      <span
        style={{
          fontSize: '0.8125rem',
          fontWeight: selected ? 500 : 400,
          color: selected ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
          userSelect: 'none',
        }}
      >
        {label}
      </span>
    </label>
  );
}
