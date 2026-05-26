'use client';

import { useToastStore } from '@/store/toastStore';

/**
 * Root-level toast host. Subscribes to the global toast store and
 * renders whatever's queued. Mounted once in the dashboard layout
 * so any code path can call `showError` / `showSuccess` and the user
 * sees feedback regardless of where the action originated.
 */

export default function ToastHost() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  if (toasts.length === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: '24px',
        insetInlineStart: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        zIndex: 1000,
        pointerEvents: 'none',
      }}
    >
      {toasts.map((t) => {
        const tone =
          t.variant === 'error'
            ? { bg: 'var(--ds-error)', fg: '#FFFFFF' }
            : t.variant === 'success'
              ? { bg: 'var(--ds-primary)', fg: '#FFFFFF' }
              : { bg: 'var(--ds-bg-card-dark)', fg: 'var(--ds-dark-card-heading)' };
        return (
          <div
            key={t.id}
            style={{
              background: tone.bg,
              color: tone.fg,
              padding: '12px 18px',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: 500,
              boxShadow: '0 6px 16px rgba(0,0,0,0.18)',
              maxWidth: '480px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              pointerEvents: 'auto',
            }}
          >
            <span style={{ flex: 1 }}>{t.message}</span>
            <button
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss"
              style={{
                background: 'transparent',
                border: 'none',
                color: tone.fg,
                cursor: 'pointer',
                fontSize: '16px',
                lineHeight: 1,
                padding: 0,
                opacity: 0.85,
              }}
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
