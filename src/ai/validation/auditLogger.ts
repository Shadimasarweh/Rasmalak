/**
 * Enhanced Audit Logger
 * =====================
 * Stores the full ExplanationTrace for each orchestrator interaction
 * in the ai_audit_log Supabase table.
 *
 * Errors are logged but never thrown — audit writes must not
 * disrupt the user-facing response flow.
 */

import { supabase } from '@/lib/supabaseClient';
import type { ExplanationTrace } from '../orchestrator/types';

/**
 * Write an audit log entry for an orchestrator interaction.
 * Fire-and-forget — never blocks the response.
 */
export async function writeAuditLog(
  userId: string,
  trace: ExplanationTrace,
): Promise<void> {
  try {
    const { error } = await supabase
      .from('ai_audit_log')
      .insert({
        user_id: userId,
        intent: trace.intent,
        intent_confidence: trace.intentConfidence,
        agent_used: trace.agentId,
        context_injected: { slices: trace.contextSlicesUsed },
        memory_read: trace.memoryFieldsUsed,
        memory_written: trace.memoryFieldsWritten,
        deterministic_values: trace.deterministicValues,
        validation_results: trace.validationResults.map(v => ({
          stage: v.stage,
          passed: v.passed,
          errorCount: v.errors.length,
          errors: v.errors.map(e => ({ code: e.code, message: e.message })),
        })),
        confidence_score: trace.confidenceScore,
        processing_time_ms: trace.processingTimeMs,
        retried: trace.retried,
      });

    if (error) {
      console.error('[AuditLogger] Insert failed:', error.message);
    }
  } catch (err) {
    console.error('[AuditLogger] Unexpected error:', err);
  }
}

/**
 * Read recent audit logs for a user (for debugging/admin).
 */
export async function readAuditLogs(
  userId: string,
  limit: number = 20,
): Promise<unknown[]> {
  const { data, error } = await supabase
    .from('ai_audit_log')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[AuditLogger] Read failed:', error.message);
    return [];
  }

  return data || [];
}
