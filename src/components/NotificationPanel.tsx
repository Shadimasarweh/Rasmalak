'use client';

import Link from 'next/link';
import { useLanguage } from '@/store/useStore';
import { useNotificationStore } from '@/store/notificationStore';

interface NotificationPanelProps {
  onClose: () => void;
}

const severityConfig = {
  critical: { bg: 'rgba(220,38,38,0.1)', color: '#DC2626' },
  warning: { bg: 'rgba(217,119,6,0.1)', color: '#D97706' },
  positive: { bg: 'rgba(34,197,94,0.1)', color: '#22c55e' },
  info: { bg: 'rgba(14,116,144,0.1)', color: '#0E7490' },
};

export default function NotificationPanel({ onClose }: NotificationPanelProps) {
  const language = useLanguage();
  const isRtl = language === 'ar';
  const { notifications, markAsRead, markAllAsRead } = useNotificationStore();
  const unreadCount = useNotificationStore(state => state.unreadCount());

  const formatTimestamp = (ts: number) => {
    const diff = Date.now() - ts;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (isRtl) {
      if (minutes < 1) return 'الآن';
      if (minutes < 60) return `منذ ${minutes} دقيقة`;
      if (hours < 24) return `منذ ${hours} ساعة`;
      if (days === 1) return 'أمس';
      return `منذ ${days} أيام`;
    } else {
      if (minutes < 1) return 'Just now';
      if (minutes < 60) return `${minutes}m ago`;
      if (hours < 24) return `${hours}h ago`;
      if (days === 1) return 'Yesterday';
      return `${days}d ago`;
    }
  };

  return (
    <div style={{
      position: 'absolute',
      top: '100%',
      ...(isRtl ? { left: 0 } : { right: 0 }),
      marginTop: '8px',
      width: '380px',
      maxHeight: '480px',
      overflowY: 'auto',
      background: '#FFFFFF',
      border: '0.5px solid #E5E7EB',
      borderRadius: '16px',
      boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
      zIndex: 100,
      direction: isRtl ? 'rtl' : 'ltr',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '0.5px solid #E5E7EB',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <p style={{ fontSize: '15px', fontWeight: 500, color: '#0F1914', margin: 0 }}>
          {isRtl ? 'الإشعارات' : 'Notifications'}
        </p>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            style={{
              fontSize: '12px', fontWeight: 500, color: '#2D6A4F',
              background: 'none', border: 'none', cursor: 'pointer',
            }}
          >
            {isRtl ? 'تحديد الكل كمقروء' : 'Mark all read'}
          </button>
        )}
      </div>

      {/* Notification list */}
      {notifications.length > 0 ? (
        notifications.map((notif) => {
          const sev = severityConfig[notif.severity];
          return (
            <div
              key={notif.id}
              onClick={() => markAsRead(notif.id)}
              style={{
                padding: '14px 20px',
                borderBottom: '0.5px solid #E5E7EB',
                background: !notif.read ? 'rgba(45,106,79,0.03)' : 'transparent',
                display: 'flex',
                gap: '12px',
                cursor: 'pointer',
              }}
            >
              {/* Severity icon */}
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: sev.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, marginTop: '2px',
              }}>
                {notif.severity === 'critical' && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={sev.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                  </svg>
                )}
                {notif.severity === 'warning' && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={sev.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                )}
                {notif.severity === 'positive' && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={sev.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                )}
                {notif.severity === 'info' && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={sev.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                )}
              </div>

              {/* Content */}
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '13px', color: '#374151', margin: 0, lineHeight: 1.5 }}>
                  {isRtl ? notif.messageAr : notif.messageEn}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                  <span style={{ fontSize: '11px', color: '#9CA3AF' }}>
                    {formatTimestamp(notif.timestamp)}
                  </span>
                  {notif.actionHref && (
                    <Link
                      href={notif.actionHref}
                      onClick={(e) => { e.stopPropagation(); onClose(); }}
                      style={{ fontSize: '11px', fontWeight: 500, color: '#2D6A4F', textDecoration: 'none' }}
                    >
                      {isRtl ? notif.actionLabelAr : notif.actionLabelEn}
                    </Link>
                  )}
                </div>
              </div>

              {/* Unread dot */}
              {!notif.read && (
                <div style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  background: '#2D6A4F', flexShrink: 0, marginTop: '6px',
                }} />
              )}
            </div>
          );
        })
      ) : (
        /* Empty state */
        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '50%', background: '#F0F7F4',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <p style={{ fontSize: '13px', color: '#9CA3AF', margin: 0 }}>
            {isRtl ? 'لا يوجد إشعارات' : 'No notifications'}
          </p>
        </div>
      )}
    </div>
  );
}
