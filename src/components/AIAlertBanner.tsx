'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAIInsights } from '@/ai';
import { useLanguage } from '@/store/useStore';

/**
 * AIAlertBanner Component
 * =======================
 * Shows AI-generated spending alerts at the top of the dashboard.
 * Dismissible, shows the most important alert.
 */

const WarningIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const InfoIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

const LightbulbIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18h6" />
    <path d="M10 22h4" />
    <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
  </svg>
);

const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export function AIAlertBanner() {
  const { alerts, hasHighPriorityAlert } = useAIInsights();
  const language = useLanguage();
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  
  // Filter out dismissed alerts
  const visibleAlerts = alerts.filter(a => !dismissedIds.has(a.id));
  
  // Get the highest priority alert to show
  const topAlert = visibleAlerts.sort((a, b) => {
    const priority = { high: 0, medium: 1, low: 2 };
    return priority[a.severity] - priority[b.severity];
  })[0];
  
  if (!topAlert) return null;
  
  const handleDismiss = () => {
    setDismissedIds(prev => new Set([...prev, topAlert.id]));
  };
  
  // Style based on severity
  const styles = {
    high: {
      background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0.05) 100%)',
      border: '1px solid rgba(239, 68, 68, 0.2)',
      iconColor: '#EF4444',
    },
    medium: {
      background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(245, 158, 11, 0.05) 100%)',
      border: '1px solid rgba(245, 158, 11, 0.2)',
      iconColor: '#F59E0B',
    },
    low: {
      background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(99, 102, 241, 0.05) 100%)',
      border: '1px solid rgba(99, 102, 241, 0.2)',
      iconColor: '#6366F1',
    },
  };
  
  const style = styles[topAlert.severity];
  
  const Icon = topAlert.severity === 'high' ? WarningIcon : topAlert.severity === 'medium' ? InfoIcon : LightbulbIcon;
  
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 16px',
        borderRadius: 'var(--radius-card)',
        background: style.background,
        border: style.border,
        marginBottom: 'var(--spacing-2)',
      }}
    >
      {/* Icon */}
      <div style={{ color: style.iconColor, flexShrink: 0 }}>
        <Icon />
      </div>
      
      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontSize: '0.875rem',
            fontWeight: 600,
            color: 'var(--theme-text-primary)',
            marginBottom: '2px',
          }}
        >
          {language === 'ar' ? topAlert.titleAr : topAlert.title}
        </p>
        <p
          style={{
            fontSize: '0.8125rem',
            color: 'var(--theme-text-secondary)',
            lineHeight: 1.4,
          }}
        >
          {language === 'ar' ? topAlert.messageAr : topAlert.message}
        </p>
      </div>
      
      {/* Action Button */}
      {topAlert.actionRoute && (
        <Link
          href={topAlert.actionRoute}
          style={{
            padding: '6px 12px',
            borderRadius: 'var(--radius-sm)',
            background: style.iconColor,
            color: '#FFFFFF',
            fontSize: '0.75rem',
            fontWeight: 600,
            textDecoration: 'none',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {language === 'ar' ? topAlert.actionLabelAr : topAlert.actionLabel}
        </Link>
      )}
      
      {/* Dismiss Button */}
      <button
        type="button"
        onClick={handleDismiss}
        style={{
          padding: '4px',
          borderRadius: '50%',
          background: 'transparent',
          border: 'none',
          color: 'var(--theme-text-muted)',
          cursor: 'pointer',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        title={language === 'ar' ? 'إغلاق' : 'Dismiss'}
      >
        <CloseIcon />
      </button>
      
      {/* Alert count badge if more alerts */}
      {visibleAlerts.length > 1 && (
        <span
          style={{
            position: 'absolute',
            top: '-8px',
            right: '-8px',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            background: style.iconColor,
            color: '#FFFFFF',
            fontSize: '0.6875rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {visibleAlerts.length}
        </span>
      )}
    </div>
  );
}

/**
 * AIGoalSuggestions Component
 * ===========================
 * Shows AI-generated goal suggestions as cards.
 */
export function AIGoalSuggestions() {
  const { suggestions } = useAIInsights();
  const language = useLanguage();
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  
  const visibleSuggestions = suggestions.filter(s => !dismissedIds.has(s.id));
  
  if (visibleSuggestions.length === 0) return null;
  
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-1)',
      }}
    >
      <h3
        style={{
          fontSize: '0.875rem',
          fontWeight: 600,
          color: 'var(--theme-text-secondary)',
          marginBottom: '4px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <LightbulbIcon />
        {language === 'ar' ? 'اقتراحات لك' : 'Suggestions for You'}
      </h3>
      
      {visibleSuggestions.slice(0, 2).map(suggestion => (
        <div
          key={suggestion.id}
          style={{
            padding: 'var(--spacing-2)',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(var(--accent-color-rgb), 0.05)',
            border: '1px solid rgba(var(--accent-color-rgb), 0.1)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
            <p
              style={{
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: 'var(--theme-text-primary)',
              }}
            >
              {language === 'ar' ? suggestion.titleAr : suggestion.title}
            </p>
            <button
              type="button"
              onClick={() => setDismissedIds(prev => new Set([...prev, suggestion.id]))}
              style={{
                padding: '2px',
                background: 'transparent',
                border: 'none',
                color: 'var(--theme-text-muted)',
                cursor: 'pointer',
              }}
            >
              <CloseIcon />
            </button>
          </div>
          <p
            style={{
              fontSize: '0.75rem',
              color: 'var(--theme-text-secondary)',
              lineHeight: 1.4,
              marginBottom: '8px',
            }}
          >
            {language === 'ar' ? suggestion.descriptionAr : suggestion.description}
          </p>
          <Link
            href="/goals"
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--color-brand-emerald)',
              textDecoration: 'none',
            }}
          >
            {language === 'ar' ? 'أنشئ هدف ←' : 'Create Goal →'}
          </Link>
        </div>
      ))}
    </div>
  );
}




