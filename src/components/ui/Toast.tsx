'use client';

import { useEffect, useState } from 'react';

export function Toast({ message, visible, onHide }: { message: string; visible: boolean; onHide: () => void }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (visible) {
      setShow(true);
      const timer = setTimeout(() => {
        setShow(false);
        setTimeout(onHide, 200);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [visible, onHide]);

  if (!visible && !show) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      left: '50%',
      transform: `translateX(-50%) translateY(${show ? '0' : '16px'})`,
      background: 'var(--ds-bg-card-dark)',
      color: 'var(--ds-dark-card-heading)',
      padding: '12px 24px',
      borderRadius: '8px',
      fontSize: '13px',
      fontWeight: 500,
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      opacity: show ? 1 : 0,
      transition: 'all 200ms ease',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ds-primary-glow)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
      {message}
    </div>
  );
}
