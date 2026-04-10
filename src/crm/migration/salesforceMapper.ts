/**
 * Salesforce CSV Field Mapper
 */

import type { FieldMapping } from './fieldMapper';

export const SALESFORCE_CONTACT_MAP: FieldMapping = {
  'First Name': 'first_name',
  'FirstName': 'first_name',
  'Last Name': 'last_name',
  'LastName': 'last_name',
  'Email': 'email',
  'Phone': 'phone',
  'MobilePhone': 'phone_secondary',
  'Mobile Phone': 'phone_secondary',
  'Title': 'job_title',
  'Account.Name': 'company_name',
  'Account Name': 'company_name',
  'Mailing Street': 'custom_fields.address',
  'MailingStreet': 'custom_fields.address',
  'Mailing City': 'custom_fields.city',
  'MailingCity': 'custom_fields.city',
  'Mailing Country': 'custom_fields.country',
  'MailingCountry': 'custom_fields.country',
  'Description': 'notes',
  'Lead Source': 'source',
  'LeadSource': 'source',
  'Created Date': 'created_at',
  'CreatedDate': 'created_at',
  'Department': 'department',
};

export const SALESFORCE_DEAL_MAP: FieldMapping = {
  'Name': 'title',
  'Opportunity Name': 'title',
  'Amount': 'value',
  'StageName': 'stage_name',
  'Stage Name': 'stage_name',
  'Stage': 'stage_name',
  'CloseDate': 'expected_close',
  'Close Date': 'expected_close',
  'Probability': 'probability',
  'Probability (%)': 'probability',
  'Account.Name': 'company_name',
  'Account Name': 'company_name',
  'Contact.Name': 'contact_name',
  'Contact Name': 'contact_name',
  'Owner.Name': 'assigned_to_name',
  'Opportunity Owner': 'assigned_to_name',
  'Description': 'notes',
  'Type': 'source',
  'Created Date': 'created_at',
  'CreatedDate': 'created_at',
};

export const SALESFORCE_COMPANY_MAP: FieldMapping = {
  'Account Name': 'name',
  'Name': 'name',
  'Industry': 'industry',
  'Website': 'website',
  'Phone': 'phone',
  'Billing Street': 'address',
  'Billing City': 'city',
  'Billing Country': 'country',
  'Description': 'notes',
};
