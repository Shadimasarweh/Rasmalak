/**
 * Document Template Engine
 * ========================
 * Parses templates and replaces {{field.subfield}} with values.
 * Supports: currency formatting, date formatting, Arabic-Indic numerals.
 */

/**
 * Parse a template string, replacing merge fields with values.
 * Supports pipe modifiers: {{deal.value|currency}}, {{deal.expectedClose|date}}
 */
export function parseTemplate(
  content: string,
  mergeData: Record<string, unknown>,
  options: { language?: 'ar' | 'en'; currency?: string } = {}
): string {
  const { language = 'ar', currency = 'USD' } = options;
  const locale = language === 'ar' ? 'ar-JO-u-nu-arab' : 'en-US';

  return content.replace(/\{\{(\w+(?:\.\w+)*)(?:\|(\w+))?\}\}/g, (_match, path: string, modifier: string) => {
    const value = getNestedValue(mergeData, path);

    if (value == null || value === '') return '';

    if (modifier === 'currency') {
      try {
        return new Intl.NumberFormat(locale, {
          style: 'currency', currency, maximumFractionDigits: 0,
        }).format(Number(value));
      } catch { return String(value); }
    }

    if (modifier === 'date') {
      try {
        return new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(new Date(String(value)));
      } catch { return String(value); }
    }

    if (modifier === 'number') {
      try {
        return new Intl.NumberFormat(locale).format(Number(value));
      } catch { return String(value); }
    }

    return String(value);
  });
}

/**
 * Extract all merge field paths from a template string.
 */
export function extractMergeFields(content: string): string[] {
  const fields = new Set<string>();
  const regex = /\{\{(\w+(?:\.\w+)*)(?:\|\w+)?\}\}/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    fields.add(match[1]);
  }
  return [...fields];
}

function getNestedValue(data: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((obj, key) => {
    if (obj && typeof obj === 'object') return (obj as Record<string, unknown>)[key];
    return undefined;
  }, data);
}
