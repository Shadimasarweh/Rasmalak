import type { User, UserType } from "../domain/user";
import type { FinancialProfile } from "../domain/financialProfile";
import type { Transaction } from "../domain/transaction";

export interface RuleContext {
  user: User;
  profile: FinancialProfile;
  transactions: Transaction[];
  calculatorResults: Record<string, unknown>;
}

export interface RuleResult {
  ruleId: string;
  severity: "info" | "warning" | "critical";
  insightCode: string;
  payload?: Record<string, unknown>;
}

export interface Rule {
  id: string;
  appliesTo: UserType[];
  evaluate(ctx: RuleContext): RuleResult | null;
}
