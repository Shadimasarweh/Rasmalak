import type { RuleResult } from "../rules/Rule";
import type { Insight } from "./insight";
import { insightMessagesAr, type InsightCode } from "./messages.ar";

/**
 * Insight key mapping structure.
 */
interface InsightKeys {
  title: string;
  body: string;
}

/**
 * Registry of insight codes to their translation keys.
 */
const insightKeyRegistry: Record<InsightCode, InsightKeys> = {
  MONTHLY_OVERSPEND: insightMessagesAr.MONTHLY_OVERSPEND,
  LOW_SAVINGS_RATE: insightMessagesAr.LOW_SAVINGS_RATE,
  HIGH_DEBT_RISK: insightMessagesAr.HIGH_DEBT_RISK,
};

/**
 * Maps a RuleResult to an Insight using translation keys.
 * 
 * @param result - The rule result to map
 * @returns An Insight with translation keys, or null if insight code is unknown
 */
export function mapRuleResultToInsight(result: RuleResult): Insight | null {
  const insightCode = result.insightCode as InsightCode;
  const keys = insightKeyRegistry[insightCode];

  if (!keys) {
    return null;
  }

  return {
    severity: result.severity,
    titleKey: keys.title,
    bodyKey: keys.body,
    payload: result.payload,
  };
}

/**
 * Maps multiple RuleResults to Insights.
 * Filters out any results that cannot be mapped.
 * 
 * @param results - Array of rule results to map
 * @returns Array of mapped Insights
 */
export function mapRuleResultsToInsights(results: RuleResult[]): Insight[] {
  return results
    .map(mapRuleResultToInsight)
    .filter((insight): insight is Insight => insight !== null);
}
