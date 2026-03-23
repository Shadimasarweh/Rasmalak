/**
 * Deterministic Financial Context Hashing
 * ========================================
 *
 * context_hash is a deterministic SHA-256 fingerprint of the user's financial
 * state at the moment advice was issued. It exists so that any piece of
 * financial advice stored in the financial_advice table can be traced back to
 * the exact financial snapshot that produced it.
 *
 * Why deterministic and stable:
 *   The same financial state must always produce the same hash, regardless of
 *   when, where, or how many times it is computed. This enables:
 *     - Audit: verify what data an advice was based on
 *     - Deduplication: avoid re-logging identical advice for identical state
 *     - Accountability: AI and rule-based advice are held to the same standard
 *
 * Only decision-relevant fields are included. Timestamps, database IDs,
 * UI-only fields, and derived presentation strings are excluded.
 */

import type { UserFinancialContext } from './types';

// ============================================
// CANONICAL REPRESENTATION
// ============================================

/**
 * Extracts and normalizes only the fields that influence financial advice.
 * All numbers are fixed-decimal strings. All arrays are sorted by a stable key.
 * Object keys are ordered by insertion (JSON.stringify preserves insertion order).
 */
function buildCanonicalRepresentation(ctx: UserFinancialContext): Record<string, unknown> {
  return {
    currency: ctx.currency,
    totalIncome: norm(ctx.totalIncome),
    totalExpenses: norm(ctx.totalExpenses),
    savingsRate: norm(ctx.savingsRate),
    budgetUtilization: ctx.budget
      ? {
          monthlyLimit: norm(ctx.budget.monthlyLimit),
          spent: norm(ctx.budget.spent),
          percentageUsed: norm(ctx.budget.percentageUsed),
        }
      : null,
    categorySpending: (ctx.spendingByCategory ?? [])
      .map(c => ({
        category: c.category,
        amount: norm(c.amount),
      }))
      .sort((a, b) => a.category.localeCompare(b.category)),
    goalProgress: (ctx.goals ?? [])
      .map(g => ({
        name: g.name,
        percentage: norm(g.progressPercentage),
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
}

/** Normalize a number to a fixed two-decimal string. NaN/undefined → "0.00". */
function norm(n: number | undefined | null): string {
  return typeof n === 'number' && !Number.isNaN(n) ? n.toFixed(2) : '0.00';
}

// ============================================
// SHA-256 (Web Crypto — universal)
// ============================================

/**
 * Compute SHA-256 hex digest using the Web Crypto API.
 * Available in all modern browsers and Node.js 19+.
 */
async function sha256Hex(data: string): Promise<string> {
  const encoded = new TextEncoder().encode(data);
  const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// ============================================
// PUBLIC API
// ============================================

/**
 * Compute a deterministic SHA-256 hash of the decision-relevant subset of
 * a UserFinancialContext. This is the single source of truth for context
 * hashing — no other module may implement its own hashing logic.
 */
export async function computeContextHash(
  context: UserFinancialContext,
): Promise<string> {
  const canonical = buildCanonicalRepresentation(context);
  const serialized = JSON.stringify(canonical);
  return sha256Hex(serialized);
}



