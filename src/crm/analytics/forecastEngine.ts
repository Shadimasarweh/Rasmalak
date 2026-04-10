/**
 * Forecast Engine
 * ===============
 * Revenue forecast from open deals weighted by probability.
 */

import type { CrmDeal } from '@/types/crm';

export interface MonthlyForecast {
  month: string;  // YYYY-MM
  bestCase: number;
  expected: number;
  worstCase: number;
}

export interface ForecastResult {
  monthlyForecast: MonthlyForecast[];
  quarterlyForecast: number;
  bestCase: number;
  expectedCase: number;
  worstCase: number;
}

export function computeForecast(deals: CrmDeal[]): ForecastResult {
  const openDeals = deals.filter(d => !d.closedAt && d.expectedClose);
  const monthMap = new Map<string, { best: number; expected: number; worst: number }>();

  for (const deal of openDeals) {
    if (!deal.expectedClose || !deal.value) continue;
    const month = deal.expectedClose.substring(0, 7); // YYYY-MM

    const existing = monthMap.get(month) || { best: 0, expected: 0, worst: 0 };
    const value = deal.value;
    const prob = deal.probability / 100;

    existing.best += value;
    existing.expected += value * prob;
    existing.worst += value * Math.max(0, prob - 0.2);

    monthMap.set(month, existing);
  }

  const monthlyForecast: MonthlyForecast[] = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month,
      bestCase: Math.round(data.best),
      expected: Math.round(data.expected),
      worstCase: Math.round(data.worst),
    }));

  const bestCase = monthlyForecast.reduce((sum, m) => sum + m.bestCase, 0);
  const expectedCase = monthlyForecast.reduce((sum, m) => sum + m.expected, 0);
  const worstCase = monthlyForecast.reduce((sum, m) => sum + m.worstCase, 0);

  // Quarterly: sum of next 3 months from today
  const now = new Date();
  const threeMonthsOut = new Date(now.getFullYear(), now.getMonth() + 3, 1);
  const quarterlyForecast = monthlyForecast
    .filter(m => {
      const mDate = new Date(m.month + '-01');
      return mDate >= now && mDate < threeMonthsOut;
    })
    .reduce((sum, m) => sum + m.expected, 0);

  return { monthlyForecast, quarterlyForecast, bestCase, expectedCase, worstCase };
}
