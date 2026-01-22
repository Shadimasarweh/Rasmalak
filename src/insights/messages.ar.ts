/**
 * Arabic translation keys for insights.
 * Keys are referenced by the insight mapper and resolved by the UI layer.
 * 
 * This file defines the translation structure without hardcoding text in logic.
 */

export const insightMessagesAr = {
  MONTHLY_OVERSPEND: {
    title: "insights.monthly_overspend.title",
    body: "insights.monthly_overspend.body",
  },
  LOW_SAVINGS_RATE: {
    title: "insights.low_savings_rate.title",
    body: "insights.low_savings_rate.body",
  },
  HIGH_DEBT_RISK: {
    title: "insights.high_debt_risk.title",
    body: "insights.high_debt_risk.body",
  },
} as const;

export type InsightCode = keyof typeof insightMessagesAr;
