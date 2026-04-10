/**
 * WhatsApp Message Extractor
 * ==========================
 * Utilities for filtering and summarizing parsed WhatsApp messages.
 */

import type { WhatsAppMessage } from './types';

/**
 * Filter messages to a date range.
 */
export function filterByDateRange(
  messages: WhatsAppMessage[],
  startDate: string,
  endDate: string
): WhatsAppMessage[] {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();

  return messages.filter(m => {
    const t = new Date(m.timestamp).getTime();
    return t >= start && t <= end;
  });
}

/**
 * Get message count and date range summary.
 */
export function getMessageSummary(messages: WhatsAppMessage[]) {
  if (messages.length === 0) return null;

  const outbound = messages.filter(m => m.isOutbound).length;
  const inbound = messages.length - outbound;

  return {
    totalCount: messages.length,
    outboundCount: outbound,
    inboundCount: inbound,
    startDate: messages[0].timestamp,
    endDate: messages[messages.length - 1].timestamp,
    participants: [...new Set(messages.map(m => m.sender))],
  };
}

/**
 * Extract unique participants from messages.
 */
export function getParticipants(messages: WhatsAppMessage[]): string[] {
  return [...new Set(messages.map(m => m.sender))];
}
