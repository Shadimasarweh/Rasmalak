'use client';

import { useEffect, ReactNode } from 'react';
import { useIntl } from 'react-intl';

const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

interface MobileFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onClearAll: () => void;
  activeCount: number;
  children: ReactNode;
}

export function MobileFilterDrawer({
  isOpen,
  onClose,
  onClearAll,
  activeCount,
  children,
}: MobileFilterDrawerProps) {
  const intl = useIntl();

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 999,
          background: 'rgba(0, 0, 0, 0.45)',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'opacity 0.25s ease',
        }}
      />

      {/* Drawer */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          bottom: 0,
          insetInlineEnd: 0,
          width: 'min(85vw, 360px)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--color-bg-surface-1)',
          borderInlineStart: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-xl, -4px 0 24px rgba(0,0,0,0.2))',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s ease',
        }}
      >
        {/* Sticky header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid var(--color-border)',
            flexShrink: 0,
          }}
        >
          <h3
            style={{
              fontSize: '1rem',
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              margin: 0,
            }}
          >
            {intl.formatMessage({ id: 'filters.title', defaultMessage: 'Filters' })}
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--color-bg-surface-2)',
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
            }}
          >
            <CloseIcon />
          </button>
        </div>

        {/* Scrollable content */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '8px 20px',
          }}
        >
          {children}
        </div>

        {/* Sticky footer */}
        <div
          style={{
            display: 'flex',
            gap: '10px',
            padding: '16px 20px',
            borderTop: '1px solid var(--color-border)',
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            onClick={onClearAll}
            disabled={activeCount === 0}
            style={{
              flex: 1,
              padding: '10px',
              fontSize: '0.8125rem',
              fontWeight: 500,
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              background: 'transparent',
              color: activeCount > 0 ? 'var(--color-text-secondary)' : 'var(--color-text-muted)',
              cursor: activeCount > 0 ? 'pointer' : 'default',
              opacity: activeCount > 0 ? 1 : 0.5,
            }}
          >
            {intl.formatMessage({ id: 'filters.clear_all', defaultMessage: 'Clear All' })}
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              padding: '10px',
              fontSize: '0.8125rem',
              fontWeight: 600,
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--color-accent-growth)',
              color: '#FFFFFF',
              cursor: 'pointer',
            }}
          >
            {intl.formatMessage({ id: 'filters.apply', defaultMessage: 'Apply Filters' })}
          </button>
        </div>
      </div>
    </>
  );
}
