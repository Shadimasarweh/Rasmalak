/**
 * Context Slice Types
 * ===================
 * Named slices of the user's financial context.
 * Agents declare which slices they need and the ContextSelector
 * only injects the relevant ones.
 */

export type ContextSliceType =
  | 'summary'
  | 'currentMonth'
  | 'lastMonth'
  | 'categoryBreakdown'
  | 'goals'
  | 'budgets'
  | 'recentTransactions'
  | 'trends'
  | 'patterns'
  | 'projections';
