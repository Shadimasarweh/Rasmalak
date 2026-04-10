/**
 * Post-Import Deduplicator
 * ========================
 * Checks for duplicates after import by matching on:
 * - Email (exact)
 * - Phone (normalized exact)
 * - Name (fuzzy Levenshtein > 0.85)
 */

export interface DuplicatePair {
  existingId: string;
  existingName: string;
  existingEmail: string | null;
  importedIndex: number;
  importedName: string;
  importedEmail: string | null;
  matchType: 'email' | 'phone' | 'name';
  similarity: number;
}

/**
 * Normalize phone number: strip spaces, dashes, parentheses, leading +/00.
 */
export function normalizePhone(phone: string): string {
  return phone
    .replace(/[\s\-().]/g, '')
    .replace(/^00/, '+')
    .replace(/^\+/, '');
}

/**
 * Levenshtein distance between two strings.
 */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}

/**
 * Similarity score between two strings (0 to 1).
 */
export function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a.toLowerCase(), b.toLowerCase()) / maxLen;
}

/**
 * Find duplicates between imported records and existing contacts.
 */
export function findDuplicates(
  imported: { index: number; firstName: string; lastName?: string; email?: string; phone?: string }[],
  existing: { id: string; firstName: string; lastName?: string | null; email?: string | null; phone?: string | null }[]
): DuplicatePair[] {
  const duplicates: DuplicatePair[] = [];

  // Build lookup maps for existing contacts
  const emailMap = new Map<string, typeof existing[0]>();
  const phoneMap = new Map<string, typeof existing[0]>();

  for (const contact of existing) {
    if (contact.email) emailMap.set(contact.email.toLowerCase(), contact);
    if (contact.phone) phoneMap.set(normalizePhone(contact.phone), contact);
  }

  for (const record of imported) {
    const importedFullName = `${record.firstName} ${record.lastName || ''}`.trim();

    // Check email match (exact)
    if (record.email) {
      const match = emailMap.get(record.email.toLowerCase());
      if (match) {
        duplicates.push({
          existingId: match.id,
          existingName: `${match.firstName} ${match.lastName || ''}`.trim(),
          existingEmail: match.email,
          importedIndex: record.index,
          importedName: importedFullName,
          importedEmail: record.email,
          matchType: 'email',
          similarity: 1.0,
        });
        continue;
      }
    }

    // Check phone match (normalized)
    if (record.phone) {
      const normalizedPhone = normalizePhone(record.phone);
      const match = phoneMap.get(normalizedPhone);
      if (match) {
        duplicates.push({
          existingId: match.id,
          existingName: `${match.firstName} ${match.lastName || ''}`.trim(),
          existingEmail: match.email,
          importedIndex: record.index,
          importedName: importedFullName,
          importedEmail: record.email || null,
          matchType: 'phone',
          similarity: 1.0,
        });
        continue;
      }
    }

    // Check name fuzzy match (> 0.85)
    for (const contact of existing) {
      const existingFullName = `${contact.firstName} ${contact.lastName || ''}`.trim();
      const sim = similarity(importedFullName, existingFullName);
      if (sim > 0.85) {
        duplicates.push({
          existingId: contact.id,
          existingName: existingFullName,
          existingEmail: contact.email,
          importedIndex: record.index,
          importedName: importedFullName,
          importedEmail: record.email || null,
          matchType: 'name',
          similarity: sim,
        });
        break;
      }
    }
  }

  return duplicates;
}
