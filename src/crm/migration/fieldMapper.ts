/**
 * Field Mapper — Source Detection & Generic Mapping
 * =================================================
 * Auto-detects CSV source (Salesforce, HubSpot, generic)
 * and provides field mapping utilities.
 */

export type ImportSource = 'salesforce' | 'hubspot' | 'generic';

export interface FieldMapping {
  [sourceColumn: string]: string;  // source column name → target field
}

/**
 * Auto-detect the source from CSV headers.
 */
export function detectSource(headers: string[]): ImportSource {
  const h = new Set(headers.map(s => s.toLowerCase().trim()));

  // Salesforce indicators
  if (h.has('contact id') || h.has('account name') || h.has('mailing street') || h.has('account.name')) {
    return 'salesforce';
  }

  // HubSpot indicators
  if (h.has('email address') || h.has('contact owner') || h.has('lifecycle stage') || h.has('hubspot owner')) {
    return 'hubspot';
  }

  return 'generic';
}

/**
 * Target fields for contact import.
 */
export const CONTACT_TARGET_FIELDS = [
  'first_name',
  'last_name',
  'first_name_ar',
  'last_name_ar',
  'email',
  'phone',
  'phone_secondary',
  'whatsapp_number',
  'job_title',
  'job_title_ar',
  'department',
  'company_name',
  'source',
  'notes',
  'tags',
  'created_at',
] as const;

/**
 * Target fields for deal import.
 */
export const DEAL_TARGET_FIELDS = [
  'title',
  'title_ar',
  'value',
  'currency',
  'stage_name',
  'expected_close',
  'probability',
  'company_name',
  'contact_name',
  'assigned_to_name',
  'source',
  'notes',
  'created_at',
] as const;

/**
 * Target fields for company import.
 */
export const COMPANY_TARGET_FIELDS = [
  'name',
  'name_ar',
  'industry',
  'website',
  'phone',
  'email',
  'address',
  'city',
  'country',
  'notes',
] as const;

/**
 * Auto-map source columns to target fields using fuzzy matching.
 */
export function autoMapFields(
  sourceHeaders: string[],
  fieldMap: FieldMapping
): FieldMapping {
  const result: FieldMapping = {};

  for (const header of sourceHeaders) {
    const lower = header.toLowerCase().trim();

    // Check explicit mapping first
    if (fieldMap[header]) {
      result[header] = fieldMap[header];
      continue;
    }

    // Fuzzy fallback: common patterns
    if (lower.includes('first') && lower.includes('name')) result[header] = 'first_name';
    else if (lower.includes('last') && lower.includes('name')) result[header] = 'last_name';
    else if (lower === 'email' || lower.includes('email address')) result[header] = 'email';
    else if (lower === 'phone' || lower.includes('phone number')) result[header] = 'phone';
    else if (lower.includes('mobile')) result[header] = 'phone_secondary';
    else if (lower.includes('title') && !lower.includes('deal')) result[header] = 'job_title';
    else if (lower.includes('company') || lower.includes('account')) result[header] = 'company_name';
    else if (lower.includes('department')) result[header] = 'department';
    else if (lower.includes('source') || lower.includes('lead source')) result[header] = 'source';
    else if (lower.includes('note') || lower.includes('description')) result[header] = 'notes';
    else if (lower.includes('created') || lower.includes('create date')) result[header] = 'created_at';
    // Unmapped columns left as empty string
    else result[header] = '';
  }

  return result;
}
