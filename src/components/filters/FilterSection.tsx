'use client';

import { useState, useRef, useEffect, useCallback, ReactNode } from 'react';

const ChevronIcon = ({ expanded }: { expanded: boolean }) => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{
      transition: 'transform 0.2s ease',
      transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
      flexShrink: 0,
    }}
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

interface FilterSectionProps {
  title: string;
  selectedCount: number;
  defaultExpanded?: boolean;
  children: ReactNode;
}

export function FilterSection({
  title,
  selectedCount,
  defaultExpanded = true,
  children,
}: FilterSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(1000);

  const measuredRef = useCallback((node: HTMLDivElement | null) => {
    contentRef.current = node;
    if (node) {
      setContentHeight(node.scrollHeight);
    }
  }, []);

  useEffect(() => {
    const node = contentRef.current;
    if (!node) return;
    const ro = new ResizeObserver(() => {
      setContentHeight(node.scrollHeight);
    });
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      style={{
        borderBottom: '1px solid var(--color-border-subtle, var(--color-border))',
      }}
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded((p) => !p)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '12px 0',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--color-text-primary)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>
            {title}
          </span>
          {selectedCount > 0 && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '18px',
                height: '18px',
                padding: '0 5px',
                fontSize: '0.625rem',
                fontWeight: 700,
                borderRadius: 'var(--radius-pill)',
                background: 'var(--color-accent-growth)',
                color: '#FFFFFF',
                lineHeight: 1,
              }}
            >
              {selectedCount}
            </span>
          )}
        </div>
        <ChevronIcon expanded={expanded} />
      </button>

      {/* Content */}
      <div
        style={{
          maxHeight: expanded ? contentHeight : 0,
          overflow: 'hidden',
          transition: 'max-height 0.25s ease',
        }}
      >
        <div ref={measuredRef} style={{ paddingBottom: '12px' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
