'use client';

import { useIntl } from 'react-intl';

/* ============================================
   MUSTASHARAK AI ADVISOR PAGE
   Structure-Locked: Visual only, no AI logic
   ============================================ */

/* ===== ICONS ===== */
const BotIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2zM7.5 13a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm9 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM12 9a5 5 0 0 0-5 5v1h10v-1a5 5 0 0 0-5-5z" />
  </svg>
);

const ChartIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);

const PiggyIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2V5z" />
    <path d="M2 9v1c0 1.1.9 2 2 2h1" />
    <path d="M16 11h.01" />
  </svg>
);

const TrendUpIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
);

const RepeatIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="17 1 21 5 17 9" />
    <path d="M3 11V9a4 4 0 0 1 4-4h14" />
    <polyline points="7 23 3 19 7 15" />
    <path d="M21 13v2a4 4 0 0 1-4 4H3" />
  </svg>
);

const PlusIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const SendIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const SparklesIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3v5m0 0l3-3m-3 3l-3-3" />
    <path d="M19 12h-5m0 0l3 3m-3-3l3-3" />
    <path d="M12 19v-5m0 0l-3 3m3-3l3 3" />
    <path d="M5 12h5m0 0l-3-3m3 3l-3 3" />
  </svg>
);

const DiningIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z" />
  </svg>
);

const TargetIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);

const CalendarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

/* ===== QUICK ACTION CARD ===== */
function QuickActionCard({
  icon,
  iconBg,
  iconColor,
  title,
  description,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        padding: 'var(--spacing-2)',
        background: '#FFFFFF',
        border: '1px solid rgba(10, 25, 47, 0.08)',
        borderRadius: 'var(--radius-sm)',
        cursor: 'pointer',
      }}
    >
      <div
        style={{
          width: '36px',
          height: '36px',
          borderRadius: 'var(--radius-sm)',
          background: iconBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: iconColor,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <p
          style={{
            fontSize: '0.875rem',
            fontWeight: 600,
            color: 'var(--color-brand-navy)',
            marginBottom: '2px',
          }}
        >
          {title}
        </p>
        <p
          style={{
            fontSize: '0.75rem',
            color: 'rgba(10, 25, 47, 0.5)',
          }}
        >
          {description}
        </p>
      </div>
    </div>
  );
}

/* ===== INSIGHT CARD ===== */
function InsightCard({
  icon,
  iconBg,
  iconColor,
  title,
  children,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card-standard">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: 'var(--spacing-1)',
        }}
      >
        <div
          style={{
            width: '28px',
            height: '28px',
            borderRadius: 'var(--radius-sm)',
            background: iconBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: iconColor,
          }}
        >
          {icon}
        </div>
        <p
          style={{
            fontSize: '0.875rem',
            fontWeight: 600,
            color: 'var(--color-brand-navy)',
          }}
        >
          {title}
        </p>
      </div>
      {children}
    </div>
  );
}

/* ===== MAIN PAGE ===== */
export default function MustasharakPage() {
  const intl = useIntl();
  
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 320px',
        gap: 'var(--spacing-2)',
        height: 'calc(100vh - 80px)',
        padding: 'var(--spacing-2)',
      }}
    >
      {/* ===== LEFT COLUMN: CHAT AREA ===== */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          background: '#FFFFFF',
          borderRadius: 'var(--radius-card)',
          border: '1px solid rgba(10, 25, 47, 0.05)',
          overflow: 'hidden',
        }}
      >
        {/* ----- Intro Message ----- */}
        <div
          style={{
            padding: 'var(--spacing-3)',
            borderBottom: '1px solid rgba(10, 25, 47, 0.05)',
          }}
        >
          {/* AI Avatar */}
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #6366F1 0%, #818CF8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              marginBottom: 'var(--spacing-2)',
            }}
          >
            <BotIcon />
          </div>

          {/* Greeting */}
          <h2
            style={{
              fontSize: '1.25rem',
              fontWeight: 600,
              color: 'var(--color-brand-navy)',
              marginBottom: '8px',
            }}
          >
            {intl.formatMessage({ id: 'chat.greeting', defaultMessage: 'Hello, {name}!' }, { name: 'Shadi' })} 👋
          </h2>
          <p
            style={{
              fontSize: '0.9375rem',
              color: 'rgba(10, 25, 47, 0.7)',
              lineHeight: 1.6,
              marginBottom: 'var(--spacing-2)',
            }}
          >
            {intl.formatMessage({ id: 'chat.intro_message', defaultMessage: "I'm your Mustasharak financial advisor. I've analyzed your recent transactions and I'm ready to help you optimize your budget. What would you like to focus on today?" })}
          </p>

          {/* Quick Action Cards (2x2 grid) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 'var(--spacing-1)',
            }}
          >
            <QuickActionCard
              icon={<ChartIcon />}
              iconBg="rgba(99, 102, 241, 0.1)"
              iconColor="#6366F1"
              title={intl.formatMessage({ id: 'chat.analyze_expenses', defaultMessage: 'Analyze my expenses' })}
              description={intl.formatMessage({ id: 'chat.analyze_expenses_desc', defaultMessage: 'Breakdown by category' })}
            />
            <QuickActionCard
              icon={<PiggyIcon />}
              iconBg="rgba(16, 185, 129, 0.1)"
              iconColor="#10B981"
              title={intl.formatMessage({ id: 'chat.how_save_more', defaultMessage: 'How can I save more?' })}
              description={intl.formatMessage({ id: 'chat.how_save_more_desc', defaultMessage: 'Smart budgeting tips' })}
            />
            <QuickActionCard
              icon={<TrendUpIcon />}
              iconBg="rgba(245, 158, 11, 0.1)"
              iconColor="#F59E0B"
              title={intl.formatMessage({ id: 'chat.investment_options', defaultMessage: 'Investment options' })}
              description={intl.formatMessage({ id: 'chat.investment_options_desc', defaultMessage: 'Based on your savings' })}
            />
            <QuickActionCard
              icon={<RepeatIcon />}
              iconBg="rgba(239, 68, 68, 0.1)"
              iconColor="#EF4444"
              title={intl.formatMessage({ id: 'chat.review_subscriptions', defaultMessage: 'Review subscriptions' })}
              description={intl.formatMessage({ id: 'chat.review_subscriptions_desc', defaultMessage: 'Detect recurring charges' })}
            />
          </div>
        </div>

        {/* ----- Chat Transcript Area (Empty State) ----- */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--spacing-3)',
            overflowY: 'auto',
            minHeight: '200px',
          }}
        >
          <p
            style={{
              fontSize: '0.875rem',
              color: 'rgba(10, 25, 47, 0.4)',
              textAlign: 'center',
            }}
          >
            {intl.formatMessage({ id: 'chat.start_conversation', defaultMessage: 'Start a conversation to get insights' })}
          </p>
        </div>

        {/* ----- Chat Input (Bottom) ----- */}
        <div
          style={{
            padding: 'var(--spacing-2)',
            borderTop: '1px solid rgba(10, 25, 47, 0.05)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '8px 12px',
              background: 'var(--color-brand-bg)',
              borderRadius: 'var(--radius-pill)',
              border: '1px solid rgba(10, 25, 47, 0.08)',
            }}
          >
            {/* Plus Icon (Attachment placeholder) */}
            <button
              type="button"
              disabled
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'rgba(10, 25, 47, 0.05)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'rgba(10, 25, 47, 0.4)',
                cursor: 'not-allowed',
              }}
            >
              <PlusIcon />
            </button>

            {/* Text Input */}
            <input
              type="text"
              placeholder={intl.formatMessage({ id: 'chat.input_placeholder', defaultMessage: 'Ask Mustasharak anything about your finances...' })}
              disabled
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontSize: '0.875rem',
                color: 'var(--color-brand-navy)',
                cursor: 'not-allowed',
              }}
            />

            {/* Send Button */}
            <button
              type="button"
              disabled
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'var(--color-brand-emerald)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                cursor: 'not-allowed',
                opacity: 0.6,
              }}
            >
              <SendIcon />
            </button>
          </div>

          {/* Disclaimer */}
          <p
            style={{
              fontSize: '0.6875rem',
              color: 'rgba(10, 25, 47, 0.4)',
              textAlign: 'center',
              marginTop: '8px',
            }}
          >
            {intl.formatMessage({ id: 'chat.ai_disclaimer', defaultMessage: 'AI can make mistakes. Please verify important financial information.' })}
          </p>
        </div>
      </div>

      {/* ===== RIGHT COLUMN: INSIGHTS PANEL ===== */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--spacing-2)',
          overflowY: 'auto',
        }}
      >
        {/* ----- Spending Insights Card ----- */}
        <div className="card-standard">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 'var(--spacing-2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: 'var(--color-info)' }}>
                <SparklesIcon />
              </span>
              <p
                style={{
                  fontSize: '0.9375rem',
                  fontWeight: 600,
                  color: 'var(--color-brand-navy)',
                }}
              >
                {intl.formatMessage({ id: 'chat.spending_insights', defaultMessage: 'Spending Insights' })}
              </p>
            </div>
            <span
              style={{
                fontSize: '0.625rem',
                fontWeight: 600,
                color: 'var(--color-brand-emerald)',
                background: 'rgba(16, 185, 129, 0.1)',
                padding: '4px 8px',
                borderRadius: 'var(--radius-pill)',
                textTransform: 'uppercase',
              }}
            >
              {intl.formatMessage({ id: 'chat.live', defaultMessage: 'Live' })}
            </span>
          </div>

          {/* Dining Spending Insight */}
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.05)',
              border: '1px solid rgba(239, 68, 68, 0.1)',
              borderRadius: 'var(--radius-sm)',
              padding: 'var(--spacing-1)',
              marginBottom: 'var(--spacing-1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ color: 'var(--color-error)' }}>
                <DiningIcon />
              </span>
              <p
                style={{
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: 'var(--color-brand-navy)',
                }}
              >
                {intl.formatMessage({ id: 'chat.dining_spending', defaultMessage: 'Dining Spending' })}
              </p>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'rgba(10, 25, 47, 0.7)', lineHeight: 1.5 }}>
              {intl.formatMessage({ id: 'chat.dining_spending_message', defaultMessage: 'You spent {percent}% more on dining this week compared to last week average.' }, { percent: <span key="percent" style={{ color: 'var(--color-error)', fontWeight: 600 }}>15</span> })}
            </p>
          </div>

          {/* Goal Progress Insight */}
          <div
            style={{
              background: 'rgba(16, 185, 129, 0.05)',
              border: '1px solid rgba(16, 185, 129, 0.1)',
              borderRadius: 'var(--radius-sm)',
              padding: 'var(--spacing-1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ color: 'var(--color-success)' }}>
                <TargetIcon />
              </span>
              <p
                style={{
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: 'var(--color-brand-navy)',
                }}
              >
                {intl.formatMessage({ id: 'chat.great_progress', defaultMessage: 'Great Progress!' })}
              </p>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'rgba(10, 25, 47, 0.7)', lineHeight: 1.5 }}>
              {intl.formatMessage({ id: 'chat.goal_progress_message', defaultMessage: "You've saved {amount} towards your \"{goal}\" goal this month." }, { amount: <span key="amount" style={{ color: 'var(--color-success)', fontWeight: 600 }}>240 JOD</span>, goal: 'New Laptop' })}
            </p>
            <div
              style={{
                height: '6px',
                background: 'rgba(10, 25, 47, 0.1)',
                borderRadius: 'var(--radius-pill)',
                marginTop: '8px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: '65%',
                  background: 'var(--color-brand-emerald)',
                  borderRadius: 'var(--radius-pill)',
                }}
              />
            </div>
          </div>
        </div>

        {/* ----- Upcoming Bills Card ----- */}
        <InsightCard
          icon={<CalendarIcon />}
          iconBg="rgba(99, 102, 241, 0.1)"
          iconColor="#6366F1"
          title={intl.formatMessage({ id: 'chat.upcoming_bills', defaultMessage: 'Upcoming Bills' })}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { name: 'Netflix', amount: '9.99 JOD' },
              { name: 'Electricity', amount: '45.00 JOD' },
            ].map((bill, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span style={{ fontSize: '0.8125rem', color: 'var(--color-brand-navy)' }}>
                  {bill.name}
                </span>
                <span
                  style={{
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    color: 'var(--color-brand-navy)',
                  }}
                >
                  {bill.amount}
                </span>
              </div>
            ))}
          </div>
          <p
            style={{
              fontSize: '0.75rem',
              color: 'var(--color-info)',
              marginTop: '8px',
            }}
          >
            {intl.formatMessage({ id: 'chat.due_in_days', defaultMessage: 'Due in {days} days' }, { days: 3 })}
          </p>
        </InsightCard>

        {/* ----- Weekly Categorization Card ----- */}
        <div className="card-standard">
          <p
            style={{
              fontSize: '0.9375rem',
              fontWeight: 600,
              color: 'var(--color-brand-navy)',
              marginBottom: 'var(--spacing-2)',
            }}
          >
            {intl.formatMessage({ id: 'chat.weekly_categorization', defaultMessage: 'Weekly Categorization' })}
          </p>

          {/* Donut Placeholder */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: 'var(--spacing-2)',
            }}
          >
            <div
              style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                background: `conic-gradient(
                  var(--color-brand-emerald) 0deg 216deg,
                  var(--color-info) 216deg 360deg
                )`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}
            >
              {/* Inner circle (donut hole) */}
              <div
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: '#FFFFFF',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span style={{ fontSize: '0.625rem', color: 'rgba(10, 25, 47, 0.5)' }}>{intl.formatMessage({ id: 'chat.total', defaultMessage: 'Total' })}</span>
                <span
                  style={{
                    fontSize: '1rem',
                    fontWeight: 700,
                    color: 'var(--color-brand-navy)',
                  }}
                >
                  450 JD
                </span>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 'var(--spacing-2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: 'var(--color-brand-emerald)',
                }}
              />
              <span style={{ fontSize: '0.75rem', color: 'rgba(10, 25, 47, 0.6)' }}>{intl.formatMessage({ id: 'chat.essentials', defaultMessage: 'Essentials' })}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: 'var(--color-info)',
                }}
              />
              <span style={{ fontSize: '0.75rem', color: 'rgba(10, 25, 47, 0.6)' }}>{intl.formatMessage({ id: 'chat.lifestyle', defaultMessage: 'Lifestyle' })}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
