/**
 * Client-side helper for downloading reports from /api/reports.
 * Replaces all direct pdfmake / SheetJS calls in calculator pages.
 */

type Calculator = 'simple-loan' | 'credit-card' | 'compound-savings' | 'home-affordability' | 'mortgage-payoff';
type Format = 'pdf' | 'xlsx';

export async function downloadReport(
  calculator: Calculator,
  format: Format,
  locale: string,
  currency: string,
  input: Record<string, unknown>,
): Promise<void> {
  const res = await fetch('/api/reports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ calculator, format, locale, currency, input }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error ?? 'Report generation failed');
  }

  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition') ?? '';
  const filenameMatch = disposition.match(/filename\*?=(?:UTF-8'')?([^;]+)/i);
  const filename = filenameMatch
    ? decodeURIComponent(filenameMatch[1].trim().replace(/^"|"$/g, ''))
    : `report.${format}`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
