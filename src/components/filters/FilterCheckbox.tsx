'use client';

import { ReactNode } from 'react';

interface FilterCheckboxProps {
  label: string;
  checked: boolean;
  onChange: () => void;
  icon?: ReactNode;
}

export function FilterCheckbox({ label, checked, onChange, icon }: FilterCheckboxProps) {
  return (
    <label
      onClick={(e) => {
        e.preventDefault();
        onChange();
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '7px 4px',
        borderRadius: 'var(--radius-xs, 4px)',
        cursor: 'pointer',
        transition: 'background 0.15s ease',
        background: checked ? 'rgba(var(--accent-color-rgb), 0.06)' : 'transparent',
      }}
      onMouseEnter={(e) => {
        if (!checked) e.currentTarget.style.background = 'var(--color-bg-surface-2)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = checked
          ? 'rgba(var(--accent-color-rgb), 0.06)'
          : 'transparent';
      }}
    >
      {/* Custom checkbox - label onClick handles toggle for whole row */}
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '18px',
          height: '18px',
          borderRadius: '4px',
          border: checked
            ? '2px solid var(--color-accent-growth)'
            : '2px solid var(--color-border)',
          background: checked ? 'var(--color-accent-growth)' : 'transparent',
          transition: 'all 0.15s ease',
          flexShrink: 0,
        }}
      >
        {checked && (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </span>

      {icon && (
        <span style={{ fontSize: '1rem', lineHeight: 1, flexShrink: 0 }}>{icon}</span>
      )}

      <span
        style={{
          fontSize: '0.8125rem',
          fontWeight: checked ? 500 : 400,
          color: checked ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
          userSelect: 'none',
        }}
      >
        {label}
      </span>
    </label>
  );
}
