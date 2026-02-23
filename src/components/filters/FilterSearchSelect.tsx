'use client';

import { useState, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { FilterCheckbox } from './FilterCheckbox';
import type { FilterOption } from './types';

const SearchIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ flexShrink: 0, opacity: 0.5 }}
  >
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

interface FilterSearchSelectProps {
  options: FilterOption[];
  selectedValues: string[];
  onToggle: (value: string) => void;
}

export function FilterSearchSelect({
  options,
  selectedValues,
  onToggle,
}: FilterSearchSelectProps) {
  const intl = useIntl();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter((opt) =>
      intl
        .formatMessage({ id: opt.labelKey, defaultMessage: opt.labelDefault })
        .toLowerCase()
        .includes(q)
    );
  }, [options, query, intl]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {/* Search input */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 10px',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--color-bg-input, var(--color-bg-surface-2))',
          marginBottom: '4px',
        }}
      >
        <SearchIcon />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={intl.formatMessage({
            id: 'filters.search_placeholder',
            defaultMessage: 'Search...',
          })}
          style={{
            flex: 1,
            border: 'none',
            background: 'transparent',
            outline: 'none',
            fontSize: '0.8125rem',
            color: 'var(--color-text-primary)',
          }}
        />
      </div>

      {/* Options */}
      <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
        {filtered.length === 0 ? (
          <p
            style={{
              fontSize: '0.75rem',
              color: 'var(--color-text-muted)',
              padding: '8px 4px',
            }}
          >
            {intl.formatMessage({
              id: 'filters.no_results',
              defaultMessage: 'No results found',
            })}
          </p>
        ) : (
          filtered.map((opt) => (
            <FilterCheckbox
              key={opt.value}
              label={intl.formatMessage({
                id: opt.labelKey,
                defaultMessage: opt.labelDefault,
              })}
              checked={selectedValues.includes(opt.value)}
              onChange={() => onToggle(opt.value)}
              icon={opt.icon}
            />
          ))
        )}
      </div>
    </div>
  );
}
