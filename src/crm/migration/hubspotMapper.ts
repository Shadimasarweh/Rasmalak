/**
 * HubSpot CSV Field Mapper
 */

import type { FieldMapping } from './fieldMapper';

export const HUBSPOT_CONTACT_MAP: FieldMapping = {
  'First Name': 'first_name',
  'Last Name': 'last_name',
  'Email Address': 'email',
  'Email': 'email',
  'Phone Number': 'phone',
  'Phone': 'phone',
  'Mobile Phone Number': 'phone_secondary',
  'Job Title': 'job_title',
  'Company Name': 'company_name',
  'Company': 'company_name',
  'Contact owner': 'assigned_to_name',
  'HubSpot Owner': 'assigned_to_name',
  'Create Date': 'created_at',
  'Create date': 'created_at',
  'Lead Status': 'custom_fields.lead_status',
  'Lifecycle Stage': 'custom_fields.lifecycle_stage',
  'City': 'custom_fields.city',
  'Country/Region': 'custom_fields.country',
  'Notes': 'notes',
};

export const HUBSPOT_DEAL_MAP: FieldMapping = {
  'Deal Name': 'title',
  'Amount': 'value',
  'Deal Stage': 'stage_name',
  'Close Date': 'expected_close',
  'Deal owner': 'assigned_to_name',
  'HubSpot Owner': 'assigned_to_name',
  'Pipeline': 'pipeline_name',
  'Associated Company': 'company_name',
  'Associated Contact': 'contact_name',
  'Create Date': 'created_at',
  'Create date': 'created_at',
  'Deal Type': 'source',
};

export const HUBSPOT_COMPANY_MAP: FieldMapping = {
  'Company Name': 'name',
  'Name': 'name',
  'Industry': 'industry',
  'Company Domain Name': 'website',
  'Phone Number': 'phone',
  'City': 'city',
  'Country/Region': 'country',
  'Description': 'notes',
};
