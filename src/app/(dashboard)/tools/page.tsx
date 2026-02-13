'use client';

import { useState } from 'react';
import { useIntl } from 'react-intl';
import Link from 'next/link';

/* ============================================
   FINANCIAL TOOLS PAGE
   Structure-Locked: Visual only, no logic
   ============================================ */

/* ===== TYPES ===== */
type Country = 'all' | 'jordan' | 'uae' | 'ksa' | 'egypt' | 'iraq';
type Category = 'credit' | 'budgeting' | 'auto' | 'tax' | 'social';

interface Tool {
  id: string;
  titleKey: string;
  titleDefault: string;
  descKey: string;
  descDefault: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  category: Category;
  countries: Country[];
  href?: string;
}

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

const CreditCardIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" />
  </svg>
);

const HomeIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
  </svg>
);

const CarIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" />
  </svg>
);

const ReceiptIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18 17H6v-2h12v2zm0-4H6v-2h12v2zm0-4H6V7h12v2zM3 22l1.5-1.5L6 22l1.5-1.5L9 22l1.5-1.5L12 22l1.5-1.5L15 22l1.5-1.5L18 22l1.5-1.5L21 22V2l-1.5 1.5L18 2l-1.5 1.5L15 2l-1.5 1.5L12 2l-1.5 1.5L9 2 7.5 3.5 6 2 4.5 3.5 3 2v20z" />
  </svg>
);

const ShieldIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
  </svg>
);

const RetirementIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
  </svg>
);

const GlobeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
  </svg>
);

const ZakatIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z" />
  </svg>
);

/* ===== COUNTRY FILTER DATA ===== */
const COUNTRIES: { id: Country; labelKey: string; labelDefault: string; flag: string }[] = [
  { id: 'all', labelKey: 'tools.filter.all', labelDefault: 'All Countries', flag: '🌍' },
  { id: 'jordan', labelKey: 'tools.filter.jordan', labelDefault: 'Jordan', flag: '🇯🇴' },
  { id: 'uae', labelKey: 'tools.filter.uae', labelDefault: 'UAE', flag: '🇦🇪' },
  { id: 'ksa', labelKey: 'tools.filter.ksa', labelDefault: 'Saudi Arabia', flag: '🇸🇦' },
  { id: 'egypt', labelKey: 'tools.filter.egypt', labelDefault: 'Egypt', flag: '🇪🇬' },
  { id: 'iraq', labelKey: 'tools.filter.iraq', labelDefault: 'Iraq', flag: '🇮🇶' },
];

/* ===== TOOLS DATA ===== */
const TOOLS_DATA: Tool[] = [
  // Credit & Debt Tools (All Countries)
  {
    id: 'loan-interest-rate',
    titleKey: 'tools.loan_interest_rate',
    titleDefault: 'Loan Interest Rate Calculator',
    descKey: 'tools.loan_interest_rate_desc',
    descDefault: 'Calculate and compare interest rates across different loan types to find the best financing option for your needs.',
    icon: <CreditCardIcon />,
    iconBg: 'rgba(239, 68, 68, 0.1)',
    iconColor: 'var(--color-error)',
    category: 'credit',
    countries: ['all'],
    href: '/calculators/simple-loan',
  },
  {
    id: 'credit-card-payoff',
    titleKey: 'tools.credit_card_payoff',
    titleDefault: 'Credit Card Payoff Calculator',
    descKey: 'tools.credit_card_payoff_desc',
    descDefault: 'Plan your credit card debt payoff strategy and see how long it will take to become debt-free.',
    icon: <CreditCardIcon />,
    iconBg: 'rgba(239, 68, 68, 0.1)',
    iconColor: 'var(--color-error)',
    category: 'credit',
    countries: ['all'],
    href: '/calculators/credit-card',
  },
  // Budgeting & Saving Tools (All Countries)
  {
    id: 'compound-savings',
    titleKey: 'tools.compound_savings',
    titleDefault: 'Compound Savings Calculator',
    descKey: 'tools.compound_savings_desc',
    descDefault: 'See how your savings grow over time with compound interest and plan your wealth-building journey.',
    icon: <PiggyIcon />,
    iconBg: 'rgba(16, 185, 129, 0.1)',
    iconColor: 'var(--color-accent-growth)',
    category: 'budgeting',
    countries: ['all'],
  },
  {
    id: 'rent-vs-buy',
    titleKey: 'tools.rent_vs_buy',
    titleDefault: 'Rent vs Buy Calculator',
    descKey: 'tools.rent_vs_buy_desc',
    descDefault: 'Compare the financial implications of renting versus buying a home to make an informed decision.',
    icon: <HomeIcon />,
    iconBg: 'rgba(16, 185, 129, 0.1)',
    iconColor: 'var(--color-accent-growth)',
    category: 'budgeting',
    countries: ['all'],
  },
  {
    id: 'mortgage-affordability',
    titleKey: 'tools.mortgage_affordability',
    titleDefault: 'Mortgage Loan Affordability',
    descKey: 'tools.mortgage_affordability_desc',
    descDefault: 'Determine how much home you can afford based on your income, debts, and down payment.',
    icon: <HomeIcon />,
    iconBg: 'rgba(16, 185, 129, 0.1)',
    iconColor: 'var(--color-accent-growth)',
    category: 'budgeting',
    countries: ['all'],
    href: '/calculators/home-affordability',
  },
  {
    id: 'mortgage-payoff',
    titleKey: 'tools.mortgage_payoff',
    titleDefault: 'Mortgage Payoff Calculator',
    descKey: 'tools.mortgage_payoff_desc',
    descDefault: 'Calculate how extra payments can help you pay off your mortgage faster and save on interest.',
    icon: <HomeIcon />,
    iconBg: 'rgba(16, 185, 129, 0.1)',
    iconColor: 'var(--color-accent-growth)',
    category: 'budgeting',
    countries: ['all'],
    href: '/calculators/mortgage-payoff',
  },
  {
    id: 'retirement-planner',
    titleKey: 'tools.retirement_planner',
    titleDefault: 'Retirement Goal Planner',
    descKey: 'tools.retirement_planner_desc',
    descDefault: 'Plan your retirement savings and see if you\'re on track to meet your retirement goals.',
    icon: <RetirementIcon />,
    iconBg: 'rgba(16, 185, 129, 0.1)',
    iconColor: 'var(--color-accent-growth)',
    category: 'budgeting',
    countries: ['all'],
  },
  // Auto Loans Tools (All Countries)
  {
    id: 'fixed-vs-variable-auto',
    titleKey: 'tools.fixed_vs_variable_auto',
    titleDefault: 'Fixed vs Variable Interest on Auto Loans',
    descKey: 'tools.fixed_vs_variable_auto_desc',
    descDefault: 'Compare fixed and variable interest rates for auto loans to choose the best option for your situation.',
    icon: <CarIcon />,
    iconBg: 'rgba(99, 102, 241, 0.1)',
    iconColor: 'var(--color-info)',
    category: 'auto',
    countries: ['all'],
  },
  {
    id: 'leasing-vs-buying',
    titleKey: 'tools.leasing_vs_buying',
    titleDefault: 'Leasing vs Buying Calculator',
    descKey: 'tools.leasing_vs_buying_desc',
    descDefault: 'Analyze whether leasing or buying a vehicle makes more financial sense for your needs.',
    icon: <CarIcon />,
    iconBg: 'rgba(99, 102, 241, 0.1)',
    iconColor: 'var(--color-info)',
    category: 'auto',
    countries: ['all'],
  },
  // Jordan-Specific Tools
  {
    id: 'jordan-income-tax',
    titleKey: 'tools.jordan_income_tax',
    titleDefault: 'Personal Income Tax Calculator',
    descKey: 'tools.jordan_income_tax_desc',
    descDefault: 'Calculate your personal income tax liability based on Jordanian tax brackets and regulations.',
    icon: <ReceiptIcon />,
    iconBg: 'rgba(245, 158, 11, 0.1)',
    iconColor: 'var(--color-warning)',
    category: 'tax',
    countries: ['jordan'],
  },
  {
    id: 'jordan-social-security',
    titleKey: 'tools.jordan_social_security',
    titleDefault: 'Social Security Calculator',
    descKey: 'tools.jordan_social_security_desc',
    descDefault: 'Estimate your social security contributions and benefits under Jordanian social security law.',
    icon: <ShieldIcon />,
    iconBg: 'rgba(99, 102, 241, 0.1)',
    iconColor: 'var(--color-info)',
    category: 'social',
    countries: ['jordan'],
  },
  // UAE-Specific Tools
  {
    id: 'uae-gratuity',
    titleKey: 'tools.uae_gratuity',
    titleDefault: 'UAE Gratuity Calculator',
    descKey: 'tools.uae_gratuity_desc',
    descDefault: 'Calculate your end of service benefits and gratuity entitlements under UAE labor law.',
    icon: <ShieldIcon />,
    iconBg: 'rgba(16, 185, 129, 0.1)',
    iconColor: 'var(--color-accent-growth)',
    category: 'social',
    countries: ['uae'],
  },
  // KSA-Specific Tools
  {
    id: 'ksa-zakat',
    titleKey: 'tools.ksa_zakat',
    titleDefault: 'KSA Personal Zakat Calculator',
    descKey: 'tools.ksa_zakat_desc',
    descDefault: 'Calculate your annual Zakat obligation based on your assets and Saudi Arabian Zakat regulations.',
    icon: <ZakatIcon />,
    iconBg: 'rgba(16, 185, 129, 0.1)',
    iconColor: 'var(--color-accent-growth)',
    category: 'tax',
    countries: ['ksa'],
  },
  {
    id: 'ksa-end-of-service',
    titleKey: 'tools.ksa_end_of_service',
    titleDefault: 'KSA End of Service Calculator',
    descKey: 'tools.ksa_end_of_service_desc',
    descDefault: 'Calculate your end of service benefits based on Saudi Arabian labor law requirements.',
    icon: <ShieldIcon />,
    iconBg: 'rgba(99, 102, 241, 0.1)',
    iconColor: 'var(--color-info)',
    category: 'social',
    countries: ['ksa'],
  },
  // Egypt-Specific Tools
  {
    id: 'egypt-income-tax',
    titleKey: 'tools.egypt_income_tax',
    titleDefault: 'Personal Income Tax Calculator',
    descKey: 'tools.egypt_income_tax_desc',
    descDefault: 'Calculate your personal income tax based on Egyptian tax brackets and current regulations.',
    icon: <ReceiptIcon />,
    iconBg: 'rgba(245, 158, 11, 0.1)',
    iconColor: 'var(--color-warning)',
    category: 'tax',
    countries: ['egypt'],
  },
  {
    id: 'egypt-social-security',
    titleKey: 'tools.egypt_social_security',
    titleDefault: 'Social Security Calculator',
    descKey: 'tools.egypt_social_security_desc',
    descDefault: 'Estimate your social insurance contributions and benefits under Egyptian social security law.',
    icon: <ShieldIcon />,
    iconBg: 'rgba(99, 102, 241, 0.1)',
    iconColor: 'var(--color-info)',
    category: 'social',
    countries: ['egypt'],
  },
  // Iraq-Specific Tools
  {
    id: 'iraq-income-tax',
    titleKey: 'tools.iraq_income_tax',
    titleDefault: 'Personal Income Tax Calculator',
    descKey: 'tools.iraq_income_tax_desc',
    descDefault: 'Calculate your personal income tax liability based on Iraqi tax regulations and brackets.',
    icon: <ReceiptIcon />,
    iconBg: 'rgba(245, 158, 11, 0.1)',
    iconColor: 'var(--color-warning)',
    category: 'tax',
    countries: ['iraq'],
  },
  {
    id: 'iraq-social-security',
    titleKey: 'tools.iraq_social_security',
    titleDefault: 'Social Security Calculator',
    descKey: 'tools.iraq_social_security_desc',
    descDefault: 'Estimate your social security contributions and pension benefits under Iraqi labor law.',
    icon: <ShieldIcon />,
    iconBg: 'rgba(99, 102, 241, 0.1)',
    iconColor: 'var(--color-info)',
    category: 'social',
    countries: ['iraq'],
  },
];

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
      className="ds-card featured-tool-grid"
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr',
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
            color: 'var(--color-accent-growth)',
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
            color: 'var(--color-text-primary)',
            marginBottom: '8px',
          }}
        >
          {title}
        </h3>

        {/* Description */}
        <p
          style={{
            fontSize: '0.9375rem',
            color: 'var(--color-text-secondary)',
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
            background: 'var(--color-accent-growth)',
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
        className="hidden md:flex"
        style={{
          height: '180px',
          borderRadius: 'var(--radius-sm)',
          background: 'linear-gradient(135deg, rgba(245, 208, 140, 0.4) 0%, rgba(245, 208, 140, 0.2) 100%)',
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
                var(--color-accent-growth) 10%,
                var(--color-accent-growth) 11%,
                transparent 11%,
                transparent 30%,
                var(--color-accent-growth) 30%,
                var(--color-accent-growth) 31%,
                transparent 31%,
                transparent 50%,
                var(--color-accent-growth) 50%,
                var(--color-accent-growth) 51%,
                transparent 51%,
                transparent 70%,
                var(--color-accent-growth) 70%,
                var(--color-accent-growth) 71%,
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
            background: 'var(--color-accent-growth)',
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
  href,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
  launchLabel: string;
  href?: string;
}) {
  const actionButton = href ? (
    <Link
      href={href}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        padding: '10px 20px',
        background: 'transparent',
        color: 'var(--color-accent-growth)',
        fontSize: '0.8125rem',
        fontWeight: 600,
        border: '1.5px solid var(--color-accent-growth)',
        borderRadius: 'var(--radius-sm)',
        cursor: 'pointer',
        textDecoration: 'none',
      }}
    >
      {launchLabel}
      <ArrowRightIcon />
    </Link>
  ) : (
    <button
      type="button"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        padding: '10px 20px',
        background: 'transparent',
        color: 'var(--color-accent-growth)',
        fontSize: '0.8125rem',
        fontWeight: 600,
        border: '1.5px solid var(--color-accent-growth)',
        borderRadius: 'var(--radius-sm)',
        cursor: 'pointer',
      }}
    >
      {launchLabel}
      <ArrowRightIcon />
    </button>
  );

  return (
    <div
      className="ds-card"
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
          color: 'var(--color-text-primary)',
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
          color: 'var(--color-text-secondary)',
          lineHeight: 1.5,
          flex: 1,
          marginBottom: 'var(--spacing-2)',
        }}
      >
        {description}
      </p>

      {/* Action */}
      {actionButton}
    </div>
  );
}

/* ===== COUNTRY FILTER COMPONENT ===== */
function CountryFilter({
  selectedCountry,
  onCountryChange,
  intl,
}: {
  selectedCountry: Country;
  onCountryChange: (country: Country) => void;
  intl: ReturnType<typeof useIntl>;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--spacing-1)',
        flexWrap: 'wrap',
        overflowX: 'auto',
      }}
    >
      <span
        style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '0.8125rem',
        fontWeight: 500,
        color: 'var(--color-text-muted)',
        marginRight: '8px',
        flexShrink: 0,
      }}
    >
      <GlobeIcon />
      {intl.formatMessage({ id: 'tools.filter_by_country', defaultMessage: 'Filter by country:' })}
      </span>
      {COUNTRIES.map((country) => (
        <button
          key={country.id}
          type="button"
          onClick={() => onCountryChange(country.id)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            fontSize: '0.8125rem',
            fontWeight: 500,
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            background:
              selectedCountry === country.id
                ? 'var(--color-accent-growth)'
                : 'var(--color-bg-surface-2)',
            color:
              selectedCountry === country.id
                ? '#FFFFFF'
                : 'var(--color-text-secondary)',
          }}
        >
          <span style={{ fontSize: '1rem' }}>{country.flag}</span>
          {intl.formatMessage({ id: country.labelKey, defaultMessage: country.labelDefault })}
        </button>
      ))}
    </div>
  );
}

/* ===== MAIN PAGE ===== */
export default function FinancialToolsPage() {
  const intl = useIntl();
  const [selectedCountry, setSelectedCountry] = useState<Country>('all');

  // Filter tools based on selected country
  const filteredTools = TOOLS_DATA.filter((tool) => {
    if (selectedCountry === 'all') {
      return true; // Show all tools
    }
    // Show tools that are available for all countries OR specifically for the selected country
    return tool.countries.includes('all') || tool.countries.includes(selectedCountry);
  });

  // Group tools by category for better organization
  const creditTools = filteredTools.filter((t) => t.category === 'credit');
  const budgetingTools = filteredTools.filter((t) => t.category === 'budgeting');
  const autoTools = filteredTools.filter((t) => t.category === 'auto');
  const taxTools = filteredTools.filter((t) => t.category === 'tax');
  const socialTools = filteredTools.filter((t) => t.category === 'social');

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
        <div style={{ marginBottom: 'var(--spacing-2)' }}>
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              marginBottom: '8px',
            }}
          >
            {intl.formatMessage({ id: 'tools.title', defaultMessage: 'Financial Tools' })}
          </h1>
          <p
            style={{
              fontSize: '0.9375rem',
              color: 'var(--color-text-secondary)',
              maxWidth: '600px',
              lineHeight: 1.6,
            }}
          >
            {intl.formatMessage({ id: 'tools.subtitle', defaultMessage: "Plan your future with Rasmalak AI's smart calculators and trackers designed for your financial growth." })}
          </p>
        </div>

        {/* ----- Country Filter ----- */}
        <div style={{ marginBottom: 'var(--spacing-3)' }}>
          <CountryFilter
            selectedCountry={selectedCountry}
            onCountryChange={setSelectedCountry}
            intl={intl}
          />
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

        {/* ----- Credit & Debt Section ----- */}
        {creditTools.length > 0 && (
          <div style={{ marginBottom: 'var(--spacing-3)' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: 'var(--spacing-2)',
              }}
            >
              <span style={{ color: 'rgba(239, 68, 68, 0.6)' }}>
                <CreditCardIcon />
              </span>
              <h2
                style={{
                  fontSize: '1.125rem',
                  fontWeight: 600,
                  color: 'var(--color-text-primary)',
                }}
              >
                {intl.formatMessage({ id: 'tools.section.credit_debt', defaultMessage: 'Credit & Debt' })}
              </h2>
            </div>
            <div className="responsive-grid-4">
              {creditTools.map((tool) => (
                <ToolCard
                  key={tool.id}
                  icon={tool.icon}
                  iconBg={tool.iconBg}
                  iconColor={tool.iconColor}
                  title={intl.formatMessage({ id: tool.titleKey, defaultMessage: tool.titleDefault })}
                  description={intl.formatMessage({ id: tool.descKey, defaultMessage: tool.descDefault })}
                  launchLabel={intl.formatMessage({ id: 'tools.launch_tool', defaultMessage: 'Launch Tool' })}
                  href={tool.href}
                />
              ))}
            </div>
          </div>
        )}

        {/* ----- Budgeting & Saving Section ----- */}
        {budgetingTools.length > 0 && (
          <div style={{ marginBottom: 'var(--spacing-3)' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: 'var(--spacing-2)',
              }}
            >
              <span style={{ color: 'rgba(16, 185, 129, 0.6)' }}>
                <PiggyIcon />
              </span>
              <h2
                style={{
                  fontSize: '1.125rem',
                  fontWeight: 600,
                  color: 'var(--color-text-primary)',
                }}
              >
                {intl.formatMessage({ id: 'tools.section.budgeting_saving', defaultMessage: 'Budgeting & Saving' })}
              </h2>
            </div>
            <div className="responsive-grid-4">
              {budgetingTools.map((tool) => (
                <ToolCard
                  key={tool.id}
                  icon={tool.icon}
                  iconBg={tool.iconBg}
                  iconColor={tool.iconColor}
                  title={intl.formatMessage({ id: tool.titleKey, defaultMessage: tool.titleDefault })}
                  description={intl.formatMessage({ id: tool.descKey, defaultMessage: tool.descDefault })}
                  launchLabel={intl.formatMessage({ id: 'tools.launch_tool', defaultMessage: 'Launch Tool' })}
                  href={tool.href}
                />
              ))}
            </div>
          </div>
        )}

        {/* ----- Auto Loans Section ----- */}
        {autoTools.length > 0 && (
          <div style={{ marginBottom: 'var(--spacing-3)' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: 'var(--spacing-2)',
              }}
            >
              <span style={{ color: 'rgba(99, 102, 241, 0.6)' }}>
                <CarIcon />
              </span>
              <h2
                style={{
                  fontSize: '1.125rem',
                  fontWeight: 600,
                  color: 'var(--color-text-primary)',
                }}
              >
                {intl.formatMessage({ id: 'tools.section.auto_loans', defaultMessage: 'Auto Loans' })}
              </h2>
            </div>
            <div className="responsive-grid-4">
              {autoTools.map((tool) => (
                <ToolCard
                  key={tool.id}
                  icon={tool.icon}
                  iconBg={tool.iconBg}
                  iconColor={tool.iconColor}
                  title={intl.formatMessage({ id: tool.titleKey, defaultMessage: tool.titleDefault })}
                  description={intl.formatMessage({ id: tool.descKey, defaultMessage: tool.descDefault })}
                  launchLabel={intl.formatMessage({ id: 'tools.launch_tool', defaultMessage: 'Launch Tool' })}
                  href={tool.href}
                />
              ))}
            </div>
          </div>
        )}

        {/* ----- Tax & Zakat Section ----- */}
        {taxTools.length > 0 && (
          <div style={{ marginBottom: 'var(--spacing-3)' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: 'var(--spacing-2)',
              }}
            >
              <span style={{ color: 'rgba(245, 158, 11, 0.6)' }}>
                <ReceiptIcon />
              </span>
              <h2
                style={{
                  fontSize: '1.125rem',
                  fontWeight: 600,
                  color: 'var(--color-text-primary)',
                }}
              >
                {intl.formatMessage({ id: 'tools.section.tax_zakat', defaultMessage: 'Tax & Zakat' })}
              </h2>
            </div>
            <div className="responsive-grid-4">
              {taxTools.map((tool) => (
                <ToolCard
                  key={tool.id}
                  icon={tool.icon}
                  iconBg={tool.iconBg}
                  iconColor={tool.iconColor}
                  title={intl.formatMessage({ id: tool.titleKey, defaultMessage: tool.titleDefault })}
                  description={intl.formatMessage({ id: tool.descKey, defaultMessage: tool.descDefault })}
                  launchLabel={intl.formatMessage({ id: 'tools.launch_tool', defaultMessage: 'Launch Tool' })}
                  href={tool.href}
                />
              ))}
            </div>
          </div>
        )}

        {/* ----- Social Security & Benefits Section ----- */}
        {socialTools.length > 0 && (
          <div style={{ marginBottom: 'var(--spacing-3)' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: 'var(--spacing-2)',
              }}
            >
              <span style={{ color: 'rgba(99, 102, 241, 0.6)' }}>
                <ShieldIcon />
              </span>
              <h2
                style={{
                  fontSize: '1.125rem',
                  fontWeight: 600,
                  color: 'var(--color-text-primary)',
                }}
              >
                {intl.formatMessage({ id: 'tools.section.social_security', defaultMessage: 'Social Security & Benefits' })}
              </h2>
            </div>
            <div className="responsive-grid-4">
              {socialTools.map((tool) => (
                <ToolCard
                  key={tool.id}
                  icon={tool.icon}
                  iconBg={tool.iconBg}
                  iconColor={tool.iconColor}
                  title={intl.formatMessage({ id: tool.titleKey, defaultMessage: tool.titleDefault })}
                  description={intl.formatMessage({ id: tool.descKey, defaultMessage: tool.descDefault })}
                  launchLabel={intl.formatMessage({ id: 'tools.launch_tool', defaultMessage: 'Launch Tool' })}
                  href={tool.href}
                />
              ))}
            </div>
          </div>
        )}

        {/* ----- Empty State ----- */}
        {filteredTools.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: 'var(--spacing-4)',
              color: 'var(--color-text-muted)',
            }}
          >
            <p style={{ fontSize: '1rem' }}>
              {intl.formatMessage({ id: 'tools.no_tools_found', defaultMessage: 'No tools available for the selected country.' })}
            </p>
          </div>
        )}
      </div>

      {/* ----- Footer Strip ----- */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: 'var(--spacing-2)',
          borderTop: '1px solid var(--color-border)',
          marginTop: 'var(--spacing-2)',
        }}
      >
        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
          {intl.formatMessage({ id: 'tools.copyright', defaultMessage: '© {year} Rasmalak AI. All rights reserved.' }, { year: 2024 })}
        </p>
        <div style={{ display: 'flex', gap: 'var(--spacing-2)' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
            {intl.formatMessage({ id: 'tools.privacy_policy', defaultMessage: 'Privacy Policy' })}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
            {intl.formatMessage({ id: 'tools.terms_of_service', defaultMessage: 'Terms of Service' })}
          </span>
        </div>
      </div>
    </div>
  );
}
