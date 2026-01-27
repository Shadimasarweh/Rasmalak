'use client';

import { useIntl } from 'react-intl';

/* ============================================
   FINANCIAL TOOLS PAGE
   Structure-Locked: Visual only, no logic
   ============================================ */

/* ===== ICONS ===== */
const StarIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);

const TrendUpIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
);

const PiggyIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2V5z" />
    <path d="M2 9v1c0 1.1.9 2 2 2h1" />
    <circle cx="16" cy="11" r="1" />
  </svg>
);

const ChartUpIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3.5 18.5l6-6 4 4L22 6.92 20.59 5.5l-7.09 8-4-4L2 17l1.5 1.5z" />
  </svg>
);

const DownloadIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
  </svg>
);

const CalculatorIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14h-4v-2h4v2zm0-4h-4v-2h4v2zm0-4h-4V7h4v2zm4 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2zM8 17H6v-2h2v2zm0-4H6v-2h2v2zm0-4H6V7h2v2z" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

const GridIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M4 4h4v4H4V4zm6 0h4v4h-4V4zm6 0h4v4h-4V4zM4 10h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4zM4 16h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4z" />
  </svg>
);

/* ===== FEATURED TOOL CARD (Reusable) ===== */
function FeaturedToolCard({
  badge,
  title,
  description,
  buttonText,
}: {
  badge: string;
  title: string;
  description: string;
  buttonText: string;
}) {
  return (
    <div
      className="card-standard"
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 280px',
        gap: 'var(--spacing-3)',
        alignItems: 'center',
      }}
    >
      {/* Left Content */}
      <div>
        {/* Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.6875rem',
            fontWeight: 600,
            color: 'var(--color-brand-emerald)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: 'var(--spacing-1)',
          }}
        >
          <StarIcon />
          {badge}
        </div>

        {/* Title */}
        <h3
          style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: 'var(--color-brand-navy)',
            marginBottom: '8px',
          }}
        >
          {title}
        </h3>

        {/* Description */}
        <p
          style={{
            fontSize: '0.9375rem',
            color: 'rgba(10, 25, 47, 0.6)',
            lineHeight: 1.6,
            marginBottom: 'var(--spacing-2)',
            maxWidth: '480px',
          }}
        >
          {description}
        </p>

        {/* Primary Button */}
        <button
          type="button"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 24px',
            background: 'var(--color-brand-emerald)',
            color: '#FFFFFF',
            fontSize: '0.875rem',
            fontWeight: 600,
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
          }}
        >
          <TrendUpIcon />
          {buttonText}
        </button>
      </div>

      {/* Right Visual Placeholder */}
      <div
        style={{
          height: '180px',
          borderRadius: 'var(--radius-sm)',
          background: 'linear-gradient(135deg, rgba(245, 208, 140, 0.4) 0%, rgba(245, 208, 140, 0.2) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Simple chart line visual */}
        <div
          style={{
            position: 'absolute',
            bottom: '40px',
            left: '20px',
            right: '20px',
            height: '80px',
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              background: `linear-gradient(
                to right,
                transparent 0%,
                transparent 10%,
                var(--color-brand-emerald) 10%,
                var(--color-brand-emerald) 11%,
                transparent 11%,
                transparent 30%,
                var(--color-brand-emerald) 30%,
                var(--color-brand-emerald) 31%,
                transparent 31%,
                transparent 50%,
                var(--color-brand-emerald) 50%,
                var(--color-brand-emerald) 51%,
                transparent 51%,
                transparent 70%,
                var(--color-brand-emerald) 70%,
                var(--color-brand-emerald) 71%,
                transparent 71%
              )`,
              clipPath: 'polygon(0% 100%, 10% 80%, 30% 90%, 50% 50%, 70% 60%, 90% 20%, 100% 10%, 100% 100%)',
            }}
          />
        </div>
        {/* Upward arrow indicator */}
        <div
          style={{
            position: 'absolute',
            top: '30px',
            right: '40px',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'var(--color-brand-emerald)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            transform: 'rotate(-45deg)',
          }}
        >
          <ArrowRightIcon />
        </div>
      </div>
    </div>
  );
}

/* ===== TOOL CARD (Reusable) ===== */
function ToolCard({
  icon,
  iconBg,
  iconColor,
  title,
  description,
  launchLabel,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
  launchLabel: string;
}) {
  return (
    <div
      className="card-standard"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      {/* Icon Container */}
      <div
        style={{
          width: '48px',
          height: '48px',
          borderRadius: 'var(--radius-sm)',
          background: iconBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: iconColor,
          marginBottom: 'var(--spacing-2)',
        }}
      >
        {icon}
      </div>

      {/* Title */}
      <h4
        style={{
          fontSize: '1rem',
          fontWeight: 600,
          color: 'var(--color-brand-navy)',
          marginBottom: '8px',
          lineHeight: 1.3,
        }}
      >
        {title}
      </h4>

      {/* Description */}
      <p
        style={{
          fontSize: '0.8125rem',
          color: 'rgba(10, 25, 47, 0.6)',
          lineHeight: 1.5,
          flex: 1,
          marginBottom: 'var(--spacing-2)',
        }}
      >
        {description}
      </p>

      {/* Secondary Action */}
      <button
        type="button"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          padding: '10px 20px',
          background: 'transparent',
          color: 'var(--color-brand-emerald)',
          fontSize: '0.8125rem',
          fontWeight: 600,
          border: '1.5px solid var(--color-brand-emerald)',
          borderRadius: 'var(--radius-sm)',
          cursor: 'pointer',
        }}
      >
        {launchLabel}
        <ArrowRightIcon />
      </button>
    </div>
  );
}

/* ===== MAIN PAGE ===== */
export default function FinancialToolsPage() {
  const intl = useIntl();
  
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: 'calc(100vh - 80px)',
        padding: 'var(--spacing-3)',
      }}
    >
      {/* Page Content (grows to push footer down) */}
      <div style={{ flex: 1 }}>
        {/* ----- Page Header ----- */}
        <div style={{ marginBottom: 'var(--spacing-3)' }}>
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 700,
              color: 'var(--color-brand-navy)',
              marginBottom: '8px',
            }}
          >
            {intl.formatMessage({ id: 'tools.title', defaultMessage: 'Financial Tools' })}
          </h1>
          <p
            style={{
              fontSize: '0.9375rem',
              color: 'rgba(10, 25, 47, 0.6)',
              maxWidth: '600px',
              lineHeight: 1.6,
            }}
          >
            {intl.formatMessage({ id: 'tools.subtitle', defaultMessage: "Plan your future with Rasmalak AI's smart calculators and trackers designed for your financial growth." })}
          </p>
        </div>

        {/* ----- Featured Tool (Hero Card) ----- */}
        <div style={{ marginBottom: 'var(--spacing-3)' }}>
          <FeaturedToolCard
            badge={intl.formatMessage({ id: 'tools.featured_tool', defaultMessage: 'Featured Tool' })}
            title={intl.formatMessage({ id: 'tools.net_worth_tracker', defaultMessage: 'Net Worth Tracker' })}
            description={intl.formatMessage({ id: 'tools.net_worth_tracker_desc', defaultMessage: 'Visualize your financial growth over time. Track your assets versus liabilities in one centralized dashboard to make informed decisions about your future wealth.' })}
            buttonText={intl.formatMessage({ id: 'tools.track_progress', defaultMessage: 'Track Progress' })}
          />
        </div>

        {/* ----- Calculators & Planners Section ----- */}
        <div style={{ marginBottom: 'var(--spacing-3)' }}>
          {/* Section Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: 'var(--spacing-2)',
            }}
          >
            <span style={{ color: 'rgba(10, 25, 47, 0.4)' }}>
              <GridIcon />
            </span>
            <h2
              style={{
                fontSize: '1.125rem',
                fontWeight: 600,
                color: 'var(--color-brand-navy)',
              }}
            >
              {intl.formatMessage({ id: 'tools.calculators_planners', defaultMessage: 'Calculators & Planners' })}
            </h2>
          </div>

          {/* Tools Grid (4 columns) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 'var(--spacing-2)',
            }}
          >
            <ToolCard
              icon={<PiggyIcon />}
              iconBg="rgba(16, 185, 129, 0.1)"
              iconColor="var(--color-brand-emerald)"
              title={intl.formatMessage({ id: 'tools.savings_goal_calc', defaultMessage: 'Savings Goal Calculator' })}
              description={intl.formatMessage({ id: 'tools.savings_goal_calc_desc', defaultMessage: 'Map out your path to major purchases with customized timelines and monthly contribution plans.' })}
              launchLabel={intl.formatMessage({ id: 'tools.launch_tool', defaultMessage: 'Launch Tool' })}
            />
            <ToolCard
              icon={<ChartUpIcon />}
              iconBg="rgba(16, 185, 129, 0.1)"
              iconColor="var(--color-brand-emerald)"
              title={intl.formatMessage({ id: 'tools.investment_roi', defaultMessage: 'Investment ROI Predictor' })}
              description={intl.formatMessage({ id: 'tools.investment_roi_desc', defaultMessage: 'Estimate your potential returns over time based on initial deposit, frequency, and interest rates.' })}
              launchLabel={intl.formatMessage({ id: 'tools.launch_tool', defaultMessage: 'Launch Tool' })}
            />
            <ToolCard
              icon={<DownloadIcon />}
              iconBg="rgba(239, 68, 68, 0.1)"
              iconColor="var(--color-error)"
              title={intl.formatMessage({ id: 'tools.debt_payoff', defaultMessage: 'Debt Payoff Planner' })}
              description={intl.formatMessage({ id: 'tools.debt_payoff_desc', defaultMessage: 'Create effective strategies to become debt-free faster using the snowball or avalanche methods.' })}
              launchLabel={intl.formatMessage({ id: 'tools.launch_tool', defaultMessage: 'Launch Tool' })}
            />
            <ToolCard
              icon={<CalculatorIcon />}
              iconBg="rgba(99, 102, 241, 0.1)"
              iconColor="var(--color-info)"
              title={intl.formatMessage({ id: 'tools.tax_estimator', defaultMessage: 'Tax Estimator' })}
              description={intl.formatMessage({ id: 'tools.tax_estimator_desc', defaultMessage: 'Get quick estimates for your annual liability and plan your tax savings strategy effectively.' })}
              launchLabel={intl.formatMessage({ id: 'tools.launch_tool', defaultMessage: 'Launch Tool' })}
            />
          </div>
        </div>
      </div>

      {/* ----- Footer Strip ----- */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: 'var(--spacing-2)',
          borderTop: '1px solid rgba(10, 25, 47, 0.08)',
          marginTop: 'var(--spacing-2)',
        }}
      >
        <p style={{ fontSize: '0.75rem', color: 'rgba(10, 25, 47, 0.4)' }}>
          {intl.formatMessage({ id: 'tools.copyright', defaultMessage: '© {year} Rasmalak AI. All rights reserved.' }, { year: 2024 })}
        </p>
        <div style={{ display: 'flex', gap: 'var(--spacing-2)' }}>
          <span style={{ fontSize: '0.75rem', color: 'rgba(10, 25, 47, 0.5)', cursor: 'pointer' }}>
            {intl.formatMessage({ id: 'tools.privacy_policy', defaultMessage: 'Privacy Policy' })}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'rgba(10, 25, 47, 0.5)', cursor: 'pointer' }}>
            {intl.formatMessage({ id: 'tools.terms_of_service', defaultMessage: 'Terms of Service' })}
          </span>
        </div>
      </div>
    </div>
  );
}
