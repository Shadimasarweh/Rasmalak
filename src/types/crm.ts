/**
 * CRM Type Definitions
 * ====================
 * All CRM TypeScript interfaces mapped from the SQL schema.
 * Every field from the database has a corresponding camelCase property.
 */

// ============================================================
// ORGANIZATIONS
// ============================================================

export interface Organization {
  id: string;
  name: string;
  nameAr: string | null;
  industry: string | null;
  industryAr: string | null;
  country: string | null;
  currency: string;
  logoUrl: string | null;
  settings: Record<string, unknown>;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrgMember {
  id: string;
  orgId: string;
  userId: string;
  role: OrgRoleName;
  permissions: Record<string, boolean>;
  displayName: string | null;
  displayNameAr: string | null;
  invitedBy: string | null;
  invitedAt: string | null;
  joinedAt: string;
  isActive: boolean;
}

export interface OrgRole {
  id: string;
  orgId: string;
  name: string;
  nameAr: string | null;
  permissions: CrmPermissions;
  isSystem: boolean;
  createdAt: string;
}

export type OrgRoleName = 'owner' | 'admin' | 'manager' | 'sales_rep' | 'viewer';

export interface CrmPermissions {
  'contacts.read': boolean;
  'contacts.write': boolean;
  'contacts.delete': boolean;
  'companies.read': boolean;
  'companies.write': boolean;
  'companies.delete': boolean;
  'deals.read': boolean;
  'deals.write': boolean;
  'deals.delete': boolean;
  'tasks.read': boolean;
  'tasks.write': boolean;
  'tasks.delete': boolean;
  'pipeline.configure': boolean;
  'team.manage': boolean;
  'team.invite': boolean;
  'reports.view': boolean;
  'reports.export': boolean;
  'settings.manage': boolean;
  'import.execute': boolean;
  'audit.view': boolean;
  'fields.manage': boolean;
}

// ============================================================
// CRM CONTACTS & COMPANIES
// ============================================================

export interface CrmCompany {
  id: string;
  orgId: string;
  name: string;
  nameAr: string | null;
  industry: string | null;
  industryAr: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  addressAr: string | null;
  city: string | null;
  cityAr: string | null;
  country: string | null;
  parentId: string | null;
  tags: string[];
  customFields: Record<string, unknown>;
  notes: string | null;
  searchNameNormalized: string | null;
  searchNameRoot: string | null;
  searchNameTranslit: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type ContactSource =
  | 'manual'
  | 'import'
  | 'referral'
  | 'website'
  | 'whatsapp'
  | 'migration_salesforce'
  | 'migration_hubspot';

export interface CrmContact {
  id: string;
  orgId: string;
  companyId: string | null;
  firstName: string;
  lastName: string | null;
  firstNameAr: string | null;
  lastNameAr: string | null;
  email: string | null;
  phone: string | null;
  phoneSecondary: string | null;
  whatsappNumber: string | null;
  jobTitle: string | null;
  jobTitleAr: string | null;
  department: string | null;
  tags: string[];
  source: ContactSource;
  customFields: Record<string, unknown>;
  notes: string | null;
  lastContacted: string | null;
  searchNameNormalized: string | null;
  searchNameRoot: string | null;
  searchNameTranslit: string | null;
  searchFullText: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// DEAL PIPELINE
// ============================================================

export interface CrmPipeline {
  id: string;
  orgId: string;
  name: string;
  nameAr: string | null;
  isDefault: boolean;
  createdAt: string;
}

export interface CrmDealStage {
  id: string;
  pipelineId: string;
  orgId: string;
  name: string;
  nameAr: string | null;
  position: number;
  color: string;
  probability: number;
  isWon: boolean;
  isLost: boolean;
  createdAt: string;
}

export interface CrmDeal {
  id: string;
  orgId: string;
  pipelineId: string;
  stageId: string;
  contactId: string | null;
  companyId: string | null;
  title: string;
  titleAr: string | null;
  value: number | null;
  currency: string;
  probability: number;
  expectedClose: string | null;
  actualClose: string | null;
  wonLostReason: string | null;
  wonLostReasonAr: string | null;
  assignedTo: string | null;
  source: string | null;
  customFields: Record<string, unknown>;
  notes: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
}

export interface CrmDealStageHistory {
  id: string;
  dealId: string;
  fromStageId: string | null;
  toStageId: string;
  movedBy: string;
  durationInStageHours: number | null;
  movedAt: string;
}

// ============================================================
// TASKS
// ============================================================

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskType = 'task' | 'call' | 'email' | 'meeting' | 'follow_up';

export interface CrmTask {
  id: string;
  orgId: string;
  dealId: string | null;
  contactId: string | null;
  companyId: string | null;
  title: string;
  titleAr: string | null;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  type: TaskType;
  dueDate: string | null;
  reminderAt: string | null;
  assignedTo: string | null;
  isRecurring: boolean;
  recurrenceRule: string | null;
  completedAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// COMMUNICATIONS
// ============================================================

export type CommunicationType =
  | 'call'
  | 'email'
  | 'meeting'
  | 'note'
  | 'whatsapp'
  | 'sms'
  | 'site_visit'
  | 'other';

export interface WhatsAppMessage {
  sender: string;
  timestamp: string;
  message: string;
  isOutbound: boolean;
}

export interface CommunicationAttachment {
  name: string;
  url: string;
  type: string;
  size: number;
}

export interface CrmCommunication {
  id: string;
  orgId: string;
  contactId: string;
  dealId: string | null;
  companyId: string | null;
  type: CommunicationType;
  direction: 'inbound' | 'outbound' | null;
  subject: string | null;
  subjectAr: string | null;
  body: string | null;
  occurredAt: string;
  durationMins: number | null;
  outcome: string | null;
  outcomeAr: string | null;
  whatsappMessageCount: number | null;
  whatsappDateRange: string | null;
  whatsappRaw: string | null;
  whatsappParsed: WhatsAppMessage[] | null;
  attachments: CommunicationAttachment[];
  loggedBy: string;
  createdAt: string;
}

// ============================================================
// CUSTOM FIELDS
// ============================================================

export type CustomFieldType =
  | 'text'
  | 'number'
  | 'date'
  | 'dropdown'
  | 'multi_select'
  | 'checkbox'
  | 'currency'
  | 'phone'
  | 'email'
  | 'url';

export interface CustomFieldOption {
  value: string;
  label: string;
  labelAr: string | null;
}

export interface CrmCustomFieldDef {
  id: string;
  orgId: string;
  entityType: 'contact' | 'company' | 'deal';
  fieldKey: string;
  label: string;
  labelAr: string | null;
  fieldType: CustomFieldType;
  options: CustomFieldOption[] | null;
  isRequired: boolean;
  position: number;
  createdAt: string;
}

// ============================================================
// NOTIFICATIONS
// ============================================================

export interface CrmNotification {
  id: string;
  orgId: string;
  userId: string;
  type: string;
  title: string;
  titleAr: string | null;
  body: string | null;
  bodyAr: string | null;
  entityType: string | null;
  entityId: string | null;
  isRead: boolean;
  createdAt: string;
}

// ============================================================
// AUDIT TRAIL
// ============================================================

export interface CrmAuditEntry {
  id: string;
  orgId: string;
  userId: string;
  action: 'create' | 'update' | 'delete' | 'stage_change' | 'import' | 'export';
  entityType: string;
  entityId: string | null;
  changes: Record<string, { old: unknown; new: unknown }> | null;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  createdAt: string;
}

// ============================================================
// MIGRATION TRACKING
// ============================================================

export interface ImportError {
  row: number;
  field: string;
  error: string;
}

export interface CrmImport {
  id: string;
  orgId: string;
  source: 'csv' | 'salesforce' | 'hubspot';
  entityType: 'contacts' | 'companies' | 'deals';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'partial';
  totalRows: number | null;
  importedRows: number;
  skippedRows: number;
  errorRows: number;
  fieldMapping: Record<string, string> | null;
  errors: ImportError[];
  fileName: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdBy: string;
  createdAt: string;
}

// ============================================================
// INPUT TYPES (for create/update operations)
// ============================================================

export type CreateOrgInput = Pick<Organization, 'name'> &
  Partial<Pick<Organization, 'nameAr' | 'industry' | 'industryAr' | 'country' | 'currency'>>;

export type CreateContactInput = Pick<CrmContact, 'firstName'> &
  Partial<Omit<CrmContact, 'id' | 'orgId' | 'createdBy' | 'createdAt' | 'updatedAt' | 'searchNameNormalized' | 'searchNameRoot' | 'searchNameTranslit' | 'searchFullText'>>;

export type CreateCompanyInput = Pick<CrmCompany, 'name'> &
  Partial<Omit<CrmCompany, 'id' | 'orgId' | 'createdBy' | 'createdAt' | 'updatedAt' | 'searchNameNormalized' | 'searchNameRoot' | 'searchNameTranslit'>>;

export type CreateDealInput = Pick<CrmDeal, 'title' | 'pipelineId' | 'stageId'> &
  Partial<Omit<CrmDeal, 'id' | 'orgId' | 'createdBy' | 'createdAt' | 'updatedAt' | 'closedAt'>>;

export type CreateTaskInput = Pick<CrmTask, 'title'> &
  Partial<Omit<CrmTask, 'id' | 'orgId' | 'createdBy' | 'createdAt' | 'updatedAt' | 'completedAt'>>;

export type CreateCommunicationInput = Pick<CrmCommunication, 'contactId' | 'type'> &
  Partial<Omit<CrmCommunication, 'id' | 'orgId' | 'loggedBy' | 'createdAt'>>;

export type CreateStageInput = Pick<CrmDealStage, 'name' | 'position'> &
  Partial<Pick<CrmDealStage, 'nameAr' | 'color' | 'probability' | 'isWon' | 'isLost'>>;

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Supabase returns snake_case. Our types use camelCase. Map between them.
 * Also coerces known numeric fields (Supabase can return NUMERIC as string).
 */
const NUMERIC_FIELDS = new Set([
  'value', 'amount', 'probability', 'position', 'durationMins',
  'durationInStageHours', 'totalRows', 'importedRows', 'skippedRows',
  'errorRows', 'whatsappMessageCount',
]);

export function mapFromDb<T>(row: Record<string, unknown>): T {
  const result: Record<string, unknown> = {};
  for (const key in row) {
    const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    let val = row[key];
    // Coerce known numeric fields from string to number
    if (NUMERIC_FIELDS.has(camelKey) && typeof val === 'string') {
      const parsed = Number(val);
      val = Number.isNaN(parsed) ? null : parsed;
    }
    result[camelKey] = val;
  }
  return result as T;
}

export function mapToDb(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key in obj) {
    const snakeKey = key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
    result[snakeKey] = obj[key];
  }
  return result;
}
