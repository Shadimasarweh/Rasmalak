'use client';

import { useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useLanguage, useCurrency } from '@/store/useStore';
import { useTransactions, getMonthRange, aggregateExpensesByCategory } from '@/store/transactionStore';
import { useBudget } from '@/store/budgetStore';
import { DEFAULT_EXPENSE_CATEGORIES, CURRENCIES } from '@/lib/constants';
import { styledNum } from '@/components/StyledNumber';

/**
 * Side-by-side Planned | Actual | Difference table.
 *
 * Color rule (enforced visually here, not opinion):
 *   - Planned values use --ds-plan (calm blue) and never the primary green.
 *   - Actual values use --ds-actual (primary green).
 *   - Over-plan deltas use --ds-over (red).
 * Plan and Actual must never share a color anywhere in the UI.
 */

export interface CategoryComparisonRow {
  categoryId: string;
  name: string;
  color: string;
  planned: number;
  actual: number;
  difference: number; // actual - planned (positive = overspent)
}

interface Props {
  /** Month offset relative to today: 0 = current, -1 = previous. Default 0. */
  monthOffset?: number;
  /** Compact variant hides the legend and uses tighter spacing. */
  compact?: boolean;
  /** Hide rows that have neither a plan nor any actual spending. Default true. */
  hideEmptyRows?: boolean;
  /** Optional explicit override of category list (used by Plan tab while editing). */
  plannedOverride?: Record<string, number>;
}

export function useCategoryComparisonRows(monthOffset: number = 0, plannedOverride?: Record<string, number>): {
  rows: CategoryComparisonRow[];
  totals: { planned: number; actual: number; difference: number };
} {
  const { transactions } = useTransactions();
  const { categoryBudgets } = useBudget();
  const language = useLanguage();
  const isRTL = language === 'ar';

  return useMemo(() => {
    const range = getMonthRange(monthOffset);
    const actuals = aggregateExpensesByCategory(transactions, range);
    const planMap = plannedOverride ?? categoryBudgets;

    const rows: CategoryComparisonRow[] = DEFAULT_EXPENSE_CATEGORIES.map((cat) => {
      const planned = Math.max(0, planMap[cat.id] ?? 0);
      const actual = Math.max(0, actuals[cat.id] ?? 0);
      return {
        categoryId: cat.id,
        name: isRTL ? cat.nameAr : cat.name,
        color: cat.color,
        planned,
        actual,
        difference: actual - planned,
      };
    });

    const totals = rows.reduce(
      (acc, r) => {
        acc.planned += r.planned;
        acc.actual += r.actual;
        acc.difference += r.difference;
        return acc;
      },
      { planned: 0, actual: 0, difference: 0 },
    );

    return { rows, totals };
  }, [transactions, categoryBudgets, isRTL, monthOffset, plannedOverride]);
}

export default function CategoryComparisonTable({
  monthOffset = 0,
  compact = false,
  hideEmptyRows = true,
  plannedOverride,
}: Props) {
  const intl = useIntl();
  const language = useLanguage();
  const currency = useCurrency();
  const isRTL = language === 'ar';

  const currencyInfo = CURRENCIES.find((c) => c.code === currency);
  const symbol = isRTL
    ? currencyInfo?.symbolAr || currencyInfo?.symbol || currency
    : currencyInfo?.symbol || currency;

  const { rows, totals } = useCategoryComparisonRows(monthOffset, plannedOverride);
  const visibleRows = hideEmptyRows ? rows.filter((r) => r.planned > 0 || r.actual > 0) : rows;

  const fmt = (n: number) => styledNum(intl.formatNumber(Math.round(n)));

  if (visibleRows.length === 0) {
    return (
      <div
        style={{
          padding: compact ? '14px' : '20px',
          textAlign: 'center',
          color: 'var(--ds-text-muted)',
          fontSize: '13px',
          background: 'var(--ds-bg-tinted)',
          borderRadius: '12px',
          direction: isRTL ? 'rtl' : 'ltr',
        }}
      >
        {intl.formatMessage({ id: 'money.compare_empty_body' })}
      </div>
    );
  }

  const headerCellStyle: React.CSSProperties = {
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    color: 'var(--ds-text-muted)',
    padding: compact ? '8px 6px' : '10px 8px',
  };

  const cellStyle: React.CSSProperties = {
    padding: compact ? '8px 6px' : '12px 8px',
    fontSize: compact ? '13px' : '14px',
    fontVariantNumeric: 'tabular-nums',
  };

  return (
    <div style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
      {!compact && (
        <div
          style={{
            display: 'flex',
            gap: '14px',
            flexWrap: 'wrap',
            marginBottom: '10px',
            fontSize: '11px',
            color: 'var(--ds-text-muted)',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'var(--ds-plan)' }} />
            {intl.formatMessage({ id: 'money.legend_planned' })}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'var(--ds-actual)' }} />
            {intl.formatMessage({ id: 'money.legend_actual' })}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'var(--ds-over)' }} />
            {intl.formatMessage({ id: 'money.legend_over' })}
          </span>
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '480px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--ds-border)' }}>
              <th style={{ ...headerCellStyle, textAlign: 'start' }}>
                {intl.formatMessage({ id: 'money.compare_table_category' })}
              </th>
              <th style={{ ...headerCellStyle, textAlign: 'end' }}>
                {intl.formatMessage({ id: 'money.compare_table_planned' })}
              </th>
              <th style={{ ...headerCellStyle, textAlign: 'end' }}>
                {intl.formatMessage({ id: 'money.compare_table_actual' })}
              </th>
              <th style={{ ...headerCellStyle, textAlign: 'end' }}>
                {intl.formatMessage({ id: 'money.compare_table_difference' })}
              </th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => {
              const overplan = row.difference > 0 && row.planned > 0;
              const noPlan = row.planned === 0;
              const diffColor = overplan
                ? 'var(--ds-over)'
                : row.difference < 0
                  ? 'var(--ds-actual)'
                  : 'var(--ds-text-muted)';
              const diffSign = row.difference > 0 ? '+' : row.difference < 0 ? '−' : '';
              return (
                <tr key={row.categoryId} style={{ borderBottom: '0.5px solid var(--ds-border)' }}>
                  <td style={{ ...cellStyle, textAlign: 'start' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: row.color,
                          display: 'inline-block',
                        }}
                      />
                      <span style={{ color: 'var(--ds-text-heading)', fontWeight: 500 }}>{row.name}</span>
                    </span>
                  </td>
                  <td style={{ ...cellStyle, textAlign: 'end', color: noPlan ? 'var(--ds-text-muted)' : 'var(--ds-plan)' }}>
                    {noPlan
                      ? intl.formatMessage({ id: 'money.compare_no_plan' })
                      : <>{symbol} {fmt(row.planned)}</>}
                  </td>
                  <td style={{ ...cellStyle, textAlign: 'end', color: row.actual === 0 ? 'var(--ds-text-muted)' : 'var(--ds-actual)' }}>
                    {row.actual === 0
                      ? intl.formatMessage({ id: 'money.compare_no_actual' })
                      : <>{symbol} {fmt(row.actual)}</>}
                  </td>
                  <td style={{ ...cellStyle, textAlign: 'end', color: diffColor, fontWeight: 600 }}>
                    {row.planned > 0 || row.actual > 0
                      ? <>{diffSign}{symbol} {fmt(Math.abs(row.difference))}</>
                      : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td style={{ ...cellStyle, textAlign: 'start', fontWeight: 600, color: 'var(--ds-text-heading)' }}>
                {intl.formatMessage({ id: 'money.compare_total_row' })}
              </td>
              <td style={{ ...cellStyle, textAlign: 'end', fontWeight: 600, color: 'var(--ds-plan)' }}>
                {symbol} {fmt(totals.planned)}
              </td>
              <td style={{ ...cellStyle, textAlign: 'end', fontWeight: 600, color: 'var(--ds-actual)' }}>
                {symbol} {fmt(totals.actual)}
              </td>
              <td style={{
                ...cellStyle, textAlign: 'end', fontWeight: 700,
                color: totals.difference > 0 ? 'var(--ds-over)' : totals.difference < 0 ? 'var(--ds-actual)' : 'var(--ds-text-muted)',
              }}>
                {totals.difference > 0 ? '+' : totals.difference < 0 ? '−' : ''}{symbol} {fmt(Math.abs(totals.difference))}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
