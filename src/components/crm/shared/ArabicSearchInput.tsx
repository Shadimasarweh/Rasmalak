'use client';

import { useState, useEffect, useRef } from 'react';
import { useIntl } from 'react-intl';
import { Search, X } from 'lucide-react';

interface ArabicSearchInputProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  debounceMs?: number;
}

/**
 * Search input with 300ms debounce.
 * Phase 7 will wire in Arabic morphological search expansion.
 */
export function ArabicSearchInput({ onSearch, placeholder, debounceMs = 300 }: ArabicSearchInputProps) {
  const intl = useIntl();
  const [query, setQuery] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const defaultPlaceholder = intl.formatMessage({
    id: 'crm.search.placeholder',
    defaultMessage: 'Search contacts, deals, companies...',
  });

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onSearch(query);
    }, debounceMs);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query, debounceMs, onSearch]);

  const handleClear = () => {
    setQuery('');
    onSearch('');
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        background: 'var(--ds-bg-card)',
        border: '1px solid var(--ds-border)',
        borderRadius: '8px',
        padding: '8px 12px',
        width: '100%',
        maxWidth: '400px',
      }}
    >
      <Search size={16} style={{ color: 'var(--ds-text-muted)', flexShrink: 0 }} />
      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder={placeholder || defaultPlaceholder}
        style={{
          flex: 1,
          border: 'none',
          outline: 'none',
          background: 'transparent',
          fontSize: '14px',
          color: 'var(--ds-text-body)',
        }}
      />
      {query && (
        <button
          onClick={handleClear}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '2px',
            color: 'var(--ds-text-muted)',
            flexShrink: 0,
          }}
          aria-label="Clear search"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
