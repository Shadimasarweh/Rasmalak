/**
 * WhatsApp Chat Parser Types
 */

export interface WhatsAppMessage {
  sender: string;
  timestamp: string;  // ISO format
  message: string;
  isOutbound: boolean;
}

export interface ParseResult {
  messages: WhatsAppMessage[];
  participants: string[];
  dateRange: { start: string; end: string } | null;
  format: 'english' | 'arabic';
  skippedLines: number;
}

export type WhatsAppFormat = 'english' | 'arabic' | 'unknown';
