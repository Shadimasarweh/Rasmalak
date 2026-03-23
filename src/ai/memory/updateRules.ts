/**
 * Memory Update Rules
 * ===================
 * Codifies when memory may be updated.
 * No speculative writes. Only authorized, threshold-based updates.
 */

import type { AgentId } from '../agents/types';
import type { DeterministicOutputs } from '../deterministic';
import type { FinancialHealthBand } from '../deterministic';
import { writeMemoryFields } from './memoryService';

const HEALTH_BAND_THRESHOLDS = {
  critical: 40,
  watch: 70,
} as const;

/**
 * Update memory based on deterministic signal thresholds.
 * Returns the list of fields that were actually written.
 */
export async function updateMemoryFromSignals(
  userId: string,
  deterministic: DeterministicOutputs,
  agentId: AgentId,
): Promise<string[]> {
  const fieldsToWrite: Record<string, unknown> = {};
  const writtenFields: string[] = [];

  // Rule 1: Update financial health band when score crosses thresholds
  const score = deterministic.financialHealth.score;
  let band: FinancialHealthBand;
  if (score < HEALTH_BAND_THRESHOLDS.critical) {
    band = 'critical';
  } else if (score < HEALTH_BAND_THRESHOLDS.watch) {
    band = 'watch';
  } else {
    band = 'stable';
  }
  fieldsToWrite.financialHealthBand = band;
  writtenFields.push('financialHealthBand');

  // Rule 2: Update income stability score when signal is available
  if (deterministic.signals.incomeStability != null) {
    fieldsToWrite.incomeStabilityScore = deterministic.signals.incomeStability;
    writtenFields.push('incomeStabilityScore');
  }

  // Only write if there are fields to update
  if (writtenFields.length > 0) {
    try {
      await writeMemoryFields(userId, fieldsToWrite as any, agentId);
    } catch (err) {
      console.error('[UpdateRules] Failed to write memory:', err);
      return [];
    }
  }

  return writtenFields;
}

/**
 * Write a user correction to memory.
 * Allowed when user explicitly corrects information.
 */
export async function writeUserCorrection(
  userId: string,
  field: string,
  oldValue: unknown,
  newValue: unknown,
): Promise<void> {
  const correction = {
    field,
    oldValue,
    newValue,
    correctedAt: new Date().toISOString(),
    source: 'user',
  };

  // Read current correction history
  const { readMemoryFields } = await import('./memoryService');
  const current = await readMemoryFields(userId, ['correctionHistory']);
  const history = (current.correctionHistory || []) as unknown[];
  history.push(correction);

  await writeMemoryFields(userId, {
    correctionHistory: history as any,
    [field]: newValue,
  } as any, 'user');
}
