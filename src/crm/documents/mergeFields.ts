/**
 * Merge Fields — Data fetcher for document templates
 * ===================================================
 * Fetches deal + contact + company + org data and flattens
 * into a merge context for the template engine.
 */

import { supabase } from '@/lib/supabaseClient';

export interface MergeContext {
  contact: Record<string, unknown>;
  deal: Record<string, unknown>;
  company: Record<string, unknown>;
  org: Record<string, unknown>;
  today: string;
  todayFormatted: string;
}

/**
 * Fetch all data needed for merge field substitution.
 */
export async function getMergeContext(dealId: string): Promise<MergeContext> {
  const context: MergeContext = {
    contact: {},
    deal: {},
    company: {},
    org: {},
    today: new Date().toISOString().split('T')[0],
    todayFormatted: new Intl.DateTimeFormat('ar-JO', { dateStyle: 'long' }).format(new Date()),
  };

  try {
    // Fetch deal with contact and company
    const { data: deal } = await supabase
      .from('crm_deals')
      .select('*, crm_contacts(*), crm_companies(*)')
      .eq('id', dealId)
      .single();

    if (deal) {
      context.deal = {
        title: deal.title,
        titleAr: deal.title_ar,
        value: deal.value,
        currency: deal.currency,
        probability: deal.probability,
        expectedClose: deal.expected_close,
        status: deal.status,
      };

      const contact = Array.isArray(deal.crm_contacts) ? deal.crm_contacts[0] : deal.crm_contacts;
      if (contact) {
        context.contact = {
          name: contact.name,
          nameAr: contact.name_ar,
          firstName: contact.name?.split(' ')[0] ?? '',
          email: contact.email,
          phone: contact.phone,
          title: contact.title,
          company: contact.company,
        };
      }

      const company = Array.isArray(deal.crm_companies) ? deal.crm_companies[0] : deal.crm_companies;
      if (company) {
        context.company = {
          name: company.name,
          nameAr: company.name_ar,
          domain: company.domain,
          industry: company.industry,
          country: company.country,
          city: company.city,
        };
      }

      // Fetch org
      const { data: org } = await supabase
        .from('organizations')
        .select('name, name_ar, country, currency')
        .eq('id', deal.org_id)
        .single();

      if (org) {
        context.org = {
          name: org.name,
          nameAr: org.name_ar,
          country: org.country,
          currency: org.currency,
        };
      }
    }
  } catch (err) {
    console.warn('[MergeFields] Error fetching context:', err);
  }

  return context;
}

/**
 * Get list of all available merge field paths for template editor.
 */
export function getAvailableFields(): Array<{ path: string; label: string; labelAr: string }> {
  return [
    { path: 'contact.name', label: 'Contact Name', labelAr: 'اسم جهة الاتصال' },
    { path: 'contact.nameAr', label: 'Contact Name (Arabic)', labelAr: 'اسم جهة الاتصال (عربي)' },
    { path: 'contact.firstName', label: 'First Name', labelAr: 'الاسم الأول' },
    { path: 'contact.email', label: 'Contact Email', labelAr: 'البريد الإلكتروني' },
    { path: 'contact.phone', label: 'Contact Phone', labelAr: 'رقم الهاتف' },
    { path: 'contact.title', label: 'Job Title', labelAr: 'المسمى الوظيفي' },
    { path: 'contact.company', label: 'Contact Company', labelAr: 'الشركة' },
    { path: 'deal.title', label: 'Deal Title', labelAr: 'عنوان الصفقة' },
    { path: 'deal.value', label: 'Deal Value', labelAr: 'قيمة الصفقة' },
    { path: 'deal.currency', label: 'Currency', labelAr: 'العملة' },
    { path: 'deal.expectedClose', label: 'Expected Close', labelAr: 'تاريخ الإغلاق المتوقع' },
    { path: 'company.name', label: 'Company Name', labelAr: 'اسم الشركة' },
    { path: 'company.nameAr', label: 'Company Name (Arabic)', labelAr: 'اسم الشركة (عربي)' },
    { path: 'company.country', label: 'Country', labelAr: 'الدولة' },
    { path: 'company.city', label: 'City', labelAr: 'المدينة' },
    { path: 'org.name', label: 'Organization', labelAr: 'المنظمة' },
    { path: 'org.nameAr', label: 'Organization (Arabic)', labelAr: 'المنظمة (عربي)' },
    { path: 'today', label: 'Today (ISO)', labelAr: 'اليوم' },
    { path: 'todayFormatted', label: 'Today (Formatted)', labelAr: 'اليوم (منسّق)' },
  ];
}
