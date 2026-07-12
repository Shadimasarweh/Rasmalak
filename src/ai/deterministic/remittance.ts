/**
 * Remittance intelligence — individual roadmap C1 (detection half).
 *
 * Recurring outbound transfers (family support is the defining MENA
 * money flow) are found among the recurring series by transfer-shaped
 * merchant labels + monthly/biweekly cadence. The corridor currency —
 * needed for any honest FX context — is inferred ONLY when the user's
 * own entries reveal it (transactions typed in a non-base currency);
 * we never guess a destination. Rate information only, never transfer
 * execution — no licensing exposure (roadmap rule).
 */

import { RecurringSeries } from './recurringSeries';

export const REMITTANCE_KEYWORDS = [
  'حوالة', 'تحويل', 'صرافة', 'انستاباي',
  'remit', 'transfer', 'western', 'moneygram', 'wise', 'instapay',
  'xpress', 'exchange', 'ria', 'taptap',
];

export interface RemittanceTxnLite {
  description?: string | null;
  currency: string;
  date: string;
}

export interface RemittanceInsight {
  seriesKey: string;
  label: string;
  monthlyAmount: number; // base currency
  typicalDay: number | null;
  cadence: 'monthly' | 'biweekly';
  corridorCurrency: string | null;
}

export function looksLikeRemittance(label: string): boolean {
  const haystack = (label || '').toLowerCase();
  return REMITTANCE_KEYWORDS.some((k) => haystack.includes(k));
}

export function detectRemittanceSeries(
  series: RecurringSeries[],
  txns: RemittanceTxnLite[],
  baseCurrency: string,
): RemittanceInsight[] {
  const out: RemittanceInsight[] = [];
  for (const s of series) {
    if (!s.active || s.direction !== 'expense') continue;
    if (s.cadence !== 'monthly' && s.cadence !== 'biweekly') continue;
    if (!looksLikeRemittance(s.merchantLabel)) continue;

    // Corridor: the most common non-base entry currency on matching txns.
    const counts = new Map<string, number>();
    const needle = s.merchantLabel.toLowerCase();
    for (const t of txns) {
      if (!t.description || !t.description.toLowerCase().includes(needle)) continue;
      if (!t.currency || t.currency === baseCurrency) continue;
      counts.set(t.currency, (counts.get(t.currency) ?? 0) + 1);
    }
    const corridor =
      [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    out.push({
      seriesKey: s.key,
      label: s.merchantLabel,
      monthlyAmount:
        Math.round(s.amountMedian * (s.cadence === 'biweekly' ? 2 : 1) * 100) / 100,
      typicalDay: s.anchorDayOfMonth,
      cadence: s.cadence,
      corridorCurrency: corridor,
    });
  }
  return out.sort((a, b) => b.monthlyAmount - a.monthlyAmount);
}
