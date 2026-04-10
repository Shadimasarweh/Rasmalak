/**
 * WhatsApp Chat Export Parser
 * ===========================
 * Parses exported WhatsApp chat text into structured messages.
 * Handles both English and Arabic export formats.
 *
 * English format: [1/15/26, 2:30:45 PM] Mohammed Al-Hadi: السلام عليكم
 * Arabic format:  ١٥/١/٢٠٢٦, ٢:٣٠ م - محمد الهادي: السلام عليكم
 */

import type { WhatsAppMessage, ParseResult, WhatsAppFormat } from './types';
import { arabicIndicToWestern } from '../search/normalizer';

// System messages to filter out
const SYSTEM_PATTERNS = [
  /messages and calls are end-to-end encrypted/i,
  /الرسائل والمكالمات مشفرة/,
  /<media omitted>/i,
  /تم حذف هذه الرسالة/,
  /this message was deleted/i,
  /you deleted this message/i,
  /\b(added|removed|left|joined|created group|changed the subject)\b/i,
  /أضاف|أزال|غادر|انضم|أنشأ المجموعة|غيّر الموضوع/,
  /missed voice call/i,
  /missed video call/i,
  /مكالمة صوتية فائتة/,
  /مكالمة فيديو فائتة/,
];

// English format regex: [M/D/YY, H:MM:SS AM/PM] Sender: Message
const EN_LINE_REGEX = /^\[(\d{1,2}\/\d{1,2}\/\d{2,4}),\s*(\d{1,2}:\d{2}(?::\d{2})?\s*[AP]M)\]\s*(.+?):\s*(.+)$/;

// Arabic format regex: DD/M/YYYY, H:MM AM/PM - Sender: Message
const AR_LINE_REGEX = /^(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s*(\d{1,2}:\d{2}(?::\d{2})?\s*[مص])\s*-\s*(.+?):\s*(.+)$/;

/**
 * Detect format from the first non-empty line.
 */
export function detectFormat(text: string): WhatsAppFormat {
  const lines = text.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check for Arabic-Indic numerals (٠-٩)
    if (/[٠-٩]/.test(trimmed)) return 'arabic';
    // Check for English bracket format
    if (/^\[/.test(trimmed)) return 'english';
    // Check for Arabic AM/PM markers
    if (/[مص]\s*-/.test(trimmed)) return 'arabic';
  }
  return 'unknown';
}

/**
 * Parse a date/time string from English WhatsApp format.
 */
function parseEnglishTimestamp(dateStr: string, timeStr: string): string | null {
  try {
    const [month, day, year] = dateStr.split('/').map(Number);
    const fullYear = year < 100 ? 2000 + year : year;

    // Parse time: "2:30:45 PM" or "2:30 PM"
    const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)/i);
    if (!timeMatch) return null;

    let hours = parseInt(timeMatch[1]);
    const minutes = parseInt(timeMatch[2]);
    const seconds = timeMatch[3] ? parseInt(timeMatch[3]) : 0;
    const ampm = timeMatch[4].toUpperCase();

    if (ampm === 'PM' && hours !== 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;

    const date = new Date(fullYear, month - 1, day, hours, minutes, seconds);
    return date.toISOString();
  } catch {
    return null;
  }
}

/**
 * Parse a date/time string from Arabic WhatsApp format.
 */
function parseArabicTimestamp(dateStr: string, timeStr: string): string | null {
  try {
    // Convert Arabic-Indic numerals to Western
    const westernDate = arabicIndicToWestern(dateStr);
    const westernTime = arabicIndicToWestern(timeStr);

    const [day, month, year] = westernDate.split('/').map(Number);
    const fullYear = year < 100 ? 2000 + year : year;

    // Parse time: "2:30 م" (م = PM, ص = AM)
    const timeMatch = westernTime.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([مص])/);
    if (!timeMatch) return null;

    let hours = parseInt(timeMatch[1]);
    const minutes = parseInt(timeMatch[2]);
    const seconds = timeMatch[3] ? parseInt(timeMatch[3]) : 0;
    const ampm = timeMatch[4];

    if (ampm === 'م' && hours !== 12) hours += 12;  // م = PM
    if (ampm === 'ص' && hours === 12) hours = 0;    // ص = AM

    const date = new Date(fullYear, month - 1, day, hours, minutes, seconds);
    return date.toISOString();
  } catch {
    return null;
  }
}

/**
 * Check if a line is a system message to filter out.
 */
function isSystemMessage(text: string): boolean {
  return SYSTEM_PATTERNS.some(pattern => pattern.test(text));
}

/**
 * Main parser: takes raw WhatsApp export text and returns structured messages.
 */
export function parseWhatsAppChat(
  rawText: string,
  outboundNames: string[] = ['You', 'أنت']
): ParseResult {
  const format = detectFormat(rawText);
  const lines = rawText.split('\n');
  const messages: WhatsAppMessage[] = [];
  const participantSet = new Set<string>();
  let skippedLines = 0;

  const lineRegex = format === 'arabic' ? AR_LINE_REGEX : EN_LINE_REGEX;
  const parseTimestamp = format === 'arabic' ? parseArabicTimestamp : parseEnglishTimestamp;

  let currentMessage: Partial<WhatsAppMessage> | null = null;

  for (const rawLine of lines) {
    let line = rawLine.trim();
    if (!line) continue;

    // For Arabic format, only convert numerals in the date/time prefix, not the message body
    const match = format === 'arabic'
      ? arabicIndicToWestern(line).match(lineRegex)
      : line.match(lineRegex);

    if (match) {
      // Flush previous message
      if (currentMessage?.sender && currentMessage?.message) {
        if (!isSystemMessage(currentMessage.message)) {
          messages.push(currentMessage as WhatsAppMessage);
          participantSet.add(currentMessage.sender);
        }
      }

      const [, dateStr, timeStr, sender, message] = match;
      // For Arabic format, use original line's message body to preserve Arabic-Indic numerals
      // (match was done on numeral-converted line but we want the original body text)
      const timestamp = parseTimestamp(dateStr, timeStr);

      if (!timestamp) {
        skippedLines++;
        currentMessage = null;
        continue;
      }

      const isOutbound = outboundNames.some(
        name => sender.toLowerCase() === name.toLowerCase()
      );

      currentMessage = { sender, timestamp, message, isOutbound };
    } else if (currentMessage) {
      // Multi-line: append to current message
      currentMessage.message = (currentMessage.message || '') + '\n' + line;
    } else {
      skippedLines++;
    }
  }

  // Flush last message
  if (currentMessage?.sender && currentMessage?.message) {
    if (!isSystemMessage(currentMessage.message)) {
      messages.push(currentMessage as WhatsAppMessage);
      participantSet.add(currentMessage.sender);
    }
  }

  const dateRange = messages.length > 0
    ? { start: messages[0].timestamp, end: messages[messages.length - 1].timestamp }
    : null;

  return {
    messages,
    participants: Array.from(participantSet),
    dateRange,
    format: format === 'unknown' ? 'english' : format,
    skippedLines,
  };
}
