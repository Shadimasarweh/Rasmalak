'use client';

/**
 * Zakat anniversary planner — individual roadmap C3. Set your حول once
 * (hijri month + day); inside the 60-day lead window the card shows a
 * tracked-cash zakat estimate (2.5%), a clean monthly set-aside, and a
 * one-tap goal so the amount is ready on the day. The personal-zakat
 * calculator stays the authority for nisab/full holdings — linked, not
 * replaced. Ships dark behind zakatPlanner.
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useIntl } from 'react-intl';
import { HandCoins, X } from 'lucide-react';
import { AI_FEATURES } from '@/ai/config';
import { buildZakatPlan } from '@/ai/deterministic/zakatAnniversary';
import { useTransactions } from '@/store/transactionStore';
import { useGoals } from '@/store/goalsStore';
import { useBaseCurrency, useLanguage, useStore, useZakatAnniversary } from '@/store/useStore';
import { styledNum } from '@/components/StyledNumber';

const HIJRI_MONTHS_AR = ['محرم', 'صفر', 'ربيع الأول', 'ربيع الآخر', 'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'];
const HIJRI_MONTHS_EN = ['Muharram', 'Safar', "Rabi' I", "Rabi' II", 'Jumada I', 'Jumada II', 'Rajab', "Sha'ban", 'Ramadan', 'Shawwal', "Dhu al-Qi'dah", 'Dhu al-Hijjah'];

const dismissKey = (year: number) => `rasmalak:zakat-planner-dismissed:${year}`;

export default function ZakatPlannerCard() {
  const intl = useIntl();
  const language = useLanguage();
  const currency = useBaseCurrency();
  const { getNetBalance } = useTransactions();
  const { savingsGoals, addSavingsGoal } = useGoals();
  const pref = useZakatAnniversary();
  const setPref = useStore((s) => s.setZakatAnniversary);
  const [month, setMonth] = useState(9);
  const [day, setDay] = useState(1);
  const [dismissed, setDismissed] = useState(false);
  const [setting, setSetting] = useState(false);

  const plan = useMemo(
    () => (pref ? buildZakatPlan({ pref, trackedCash: getNetBalance() }) : null),
    // getNetBalance is derived from transactions in the provider.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pref, getNetBalance],
  );

  if (!AI_FEATURES.zakatPlanner || dismissed) return null;

  const isRTL = language === 'ar';
  const months = isRTL ? HIJRI_MONTHS_AR : HIJRI_MONTHS_EN;
  const fmt = (v: number) =>
    styledNum(intl.formatNumber(v, { style: 'currency', currency, maximumFractionDigits: 0 }));

  // ── Unset state: a one-time, quiet setup prompt ─────────────────────
  if (!pref) {
    if (typeof window !== 'undefined' && window.localStorage.getItem(dismissKey(0)) === '1') return null;
    return (
      <div className="ds-card" style={{ marginBottom: 'var(--space-lg)', position: 'relative' }}>
        <button
          onClick={() => { window.localStorage.setItem(dismissKey(0), '1'); setDismissed(true); }}
          aria-label={intl.formatMessage({ id: 'dashboard.zakat_dismiss', defaultMessage: 'Dismiss' })}
          style={{ position: 'absolute', insetInlineEnd: 12, top: 12, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)' }}
        >
          <X size={16} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <HandCoins size={20} style={{ color: 'var(--color-accent-gold)' }} />
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
            {intl.formatMessage({ id: 'dashboard.zakat_setup_title', defaultMessage: 'When is your zakat date?' })}
          </h3>
        </div>
        <p style={{ margin: '0 0 10px', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
          {intl.formatMessage({ id: 'dashboard.zakat_setup_body', defaultMessage: 'Set your hijri anniversary once — we’ll estimate the amount ahead of time and help you set it aside monthly.' })}
        </p>
        {setting ? (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="ds-input" style={{ padding: '6px 10px' }}>
              {months.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
            <select value={day} onChange={(e) => setDay(Number(e.target.value))} className="ds-input" style={{ padding: '6px 10px' }}>
              {Array.from({ length: 30 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>{styledNum(intl.formatNumber(d))}</option>
              ))}
            </select>
            <button className="ds-btn ds-btn-primary" onClick={() => setPref({ hijriMonth: month, hijriDay: day })}>
              {intl.formatMessage({ id: 'dashboard.zakat_save_date', defaultMessage: 'Save' })}
            </button>
          </div>
        ) : (
          <button className="ds-btn ds-btn-ghost" onClick={() => setSetting(true)}>
            {intl.formatMessage({ id: 'dashboard.zakat_set_date', defaultMessage: 'Set my zakat date' })}
          </button>
        )}
      </div>
    );
  }

  // ── Set state: only speak inside the lead window ────────────────────
  if (!plan || !plan.withinLeadWindow || plan.estimatedZakat <= 0) return null;
  if (typeof window !== 'undefined' && window.localStorage.getItem(dismissKey(plan.hijriYear)) === '1') return null;

  const goalName = `Zakat ${plan.hijriYear} AH`;
  const goalExists = savingsGoals.some((g) => g.name === goalName);
  const createGoal = () => {
    if (goalExists) return;
    addSavingsGoal({
      name: goalName,
      nameAr: `زكاة ${plan.hijriYear}هـ`,
      targetAmount: plan.estimatedZakat,
      currentAmount: 0,
      deadline: plan.nextDate.toISOString().slice(0, 10),
      color: '#F59E0B',
      fundingType: 'fixed',
      fundingValue: plan.monthlySetAside,
    });
  };

  return (
    <div className="ds-card" style={{ marginBottom: 'var(--space-lg)', borderInlineStart: '4px solid var(--color-accent-gold)', position: 'relative' }}>
      <button
        onClick={() => { window.localStorage.setItem(dismissKey(plan.hijriYear), '1'); setDismissed(true); }}
        aria-label={intl.formatMessage({ id: 'dashboard.zakat_dismiss', defaultMessage: 'Dismiss' })}
        style={{ position: 'absolute', insetInlineEnd: 12, top: 12, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)' }}
      >
        <X size={16} />
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <HandCoins size={20} style={{ color: 'var(--color-accent-gold)' }} />
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
          {intl.formatMessage(
            { id: 'dashboard.zakat_title', defaultMessage: 'Zakat in {days, plural, one {# day} other {# days}}' },
            { days: plan.daysUntil },
          )}
        </h3>
      </div>
      <p style={{ margin: '0 0 4px', fontSize: '0.875rem' }}>
        {intl.formatMessage(
          { id: 'dashboard.zakat_estimate', defaultMessage: 'Estimated: {amount} (2.5% of your tracked cash).' },
          { amount: fmt(plan.estimatedZakat) },
        )}
      </p>
      <p style={{ margin: '0 0 10px', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
        {intl.formatMessage(
          { id: 'dashboard.zakat_setaside', defaultMessage: 'Set aside {amount}/month to be ready on the day.' },
          { amount: fmt(plan.monthlySetAside) },
        )}{' '}
        <Link href="/calculators/personal-zakat" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
          {intl.formatMessage({ id: 'dashboard.zakat_calc_link', defaultMessage: 'Full calculation →' })}
        </Link>
      </p>
      <button className="ds-btn ds-btn-primary" onClick={createGoal} disabled={goalExists}>
        {goalExists
          ? intl.formatMessage({ id: 'dashboard.zakat_goal_exists', defaultMessage: 'Zakat goal created' })
          : intl.formatMessage({ id: 'dashboard.zakat_create_goal', defaultMessage: 'Create the set-aside goal' })}
      </button>
    </div>
  );
}
