import type { Rule, RuleContext, RuleResult } from "../rules/Rule";
import type { Insight } from "../insights/insight";
import { mapRuleResultsToInsights } from "../insights/mapper";

/**
 * Executes all applicable rules against the given context and returns normalized Insights.
 * 
 * This pipeline:
 * 1. Filters rules by user type
 * 2. Executes all applicable rules
 * 3. Filters out null results
 * 4. Maps RuleResults to Insights
 * 
 * @param rules - Array of rules to evaluate
 * @param context - The rule evaluation context containing user, profile, transactions, and calculator results
 * @returns Array of normalized Insights
 */
export function runRules(rules: Rule[], context: RuleContext): Insight[] {
  const { user } = context;

  // Filter rules that apply to the current user type
  const applicableRules = rules.filter((rule) =>
    rule.appliesTo.includes(user.type)
  );

  // Execute all applicable rules and collect non-null results
  const ruleResults: RuleResult[] = [];

  for (const rule of applicableRules) {
    const result = rule.evaluate(context);
    if (result !== null) {
      ruleResults.push(result);
    }
  }

  // Map rule results to insights
  return mapRuleResultsToInsights(ruleResults);
}

/**
 * Executes rules and returns raw RuleResults without mapping to Insights.
 * Useful for debugging or when raw results are needed.
 * 
 * @param rules - Array of rules to evaluate
 * @param context - The rule evaluation context
 * @returns Array of RuleResults (null results filtered out)
 */
export function runRulesRaw(rules: Rule[], context: RuleContext): RuleResult[] {
  const { user } = context;

  const applicableRules = rules.filter((rule) =>
    rule.appliesTo.includes(user.type)
  );

  const ruleResults: RuleResult[] = [];

  for (const rule of applicableRules) {
    const result = rule.evaluate(context);
    if (result !== null) {
      ruleResults.push(result);
    }
  }

  return ruleResults;
}
