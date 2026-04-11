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
  'seatsIncluded', 'seatsPurchased', 'seatsMax', 'rateLimit',
  'failureCount', 'version', 'fileSize', 'points', 'priority',
  'runCount', 'executionMs', 'responseMs', 'leadScore',
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

// ============================================================
// V2 TYPES — BILLING, INTEGRATIONS, AUTOMATION, API
// ============================================================
// V1 types above are NEVER modified. V2 extends below.

// ── BILLING ──────────────────────────────────────────────

export type PlanTier = 'entrepreneur' | 'organization' | 'enterprise' | 'custom';
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'paused';
export type BillingCycle = 'monthly' | 'annual';
export type InvoiceStatus = 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';

export interface Subscription {
  id: string;
  orgId: string;
  plan: PlanTier;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  billingCurrency: string;
  seatsIncluded: number;
  seatsPurchased: number;
  seatsMax: number;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  regionalProvider: string | null;
  regionalRef: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
  gracePeriodEndsAt: string | null;
  canceledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  id: string;
  orgId: string;
  subscriptionId: string | null;
  stripeInvoiceId: string | null;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  periodStart: string | null;
  periodEnd: string | null;
  pdfUrl: string | null;
  createdAt: string;
}

export interface PaymentMethod {
  id: string;
  orgId: string;
  provider: string;
  type: string;
  lastFour: string | null;
  brand: string | null;
  isDefault: boolean;
  providerRef: string | null;
  createdAt: string;
}

// ── INTEGRATIONS ─────────────────────────────────────────

export type ConnectionStatus = 'active' | 'disconnected' | 'error' | 'token_expired';
export type IntegrationProvider = 'google' | 'microsoft' | 'slack' | 'zoom' | 'meta';
export type ServiceType = 'calendar' | 'email' | 'teams' | 'slack' | 'zoom' | 'whatsapp';

export interface ServiceConnection {
  id: string;
  orgId: string;
  userId: string;
  provider: IntegrationProvider;
  serviceType: ServiceType;
  accessToken: string;
  refreshToken: string | null;
  tokenExpiresAt: string | null;
  connectedEmail: string | null;
  externalAccountId: string | null;
  webhookId: string | null;
  webhookExpires: string | null;
  scopes: string[];
  status: ConnectionStatus;
  errorMessage: string | null;
  lastSyncAt: string | null;
  syncStats: Record<string, unknown>;
  privacyConfirmed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EventSyncMap {
  id: string;
  connectionId: string;
  externalEventId: string;
  entityType: string;
  entityId: string;
  syncDirection: string;
  lastSyncedAt: string;
  syncHash: string | null;
}

export interface SlackChannelConfig {
  id: string;
  orgId: string;
  connectionId: string;
  channelId: string;
  channelName: string | null;
  eventTypes: string[];
  isActive: boolean;
  createdAt: string;
}

export type HealthSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface HealthEvent {
  id: string;
  orgId: string;
  connectionId: string | null;
  eventType: string;
  severity: HealthSeverity;
  message: string;
  details: Record<string, unknown> | null;
  resolvedAt: string | null;
  createdAt: string;
}

export interface UnifiedCalendarEvent {
  externalId: string;
  provider: string;
  type: 'meeting' | 'call' | 'message';
  title: string;
  description: string | null;
  startTime: string;
  endTime: string | null;
  duration: number | null;
  location: string | null;
  videoLink: string | null;
  organizer: { email: string; name: string } | null;
  attendees: { email: string; name: string; rsvp?: string }[];
  isRecurring: boolean;
  rawPayload: Record<string, unknown>;
}

export interface IntegrationAdapter {
  provider: string;
  serviceType: string;
  connect(userId: string, orgId: string): Promise<string>;
  handleCallback(code: string, state: string): Promise<ServiceConnection>;
  disconnect(connectionId: string): Promise<void>;
  fetchEvents(connection: ServiceConnection, since: Date): Promise<UnifiedCalendarEvent[]>;
  pushEvent(connection: ServiceConnection, event: UnifiedCalendarEvent): Promise<string>;
  updateEvent(connection: ServiceConnection, externalId: string, event: Partial<UnifiedCalendarEvent>): Promise<void>;
  deleteEvent(connection: ServiceConnection, externalId: string): Promise<void>;
  registerWebhook(connection: ServiceConnection): Promise<{ webhookId: string; expires: Date }>;
  renewWebhook(connection: ServiceConnection): Promise<{ webhookId: string; expires: Date }>;
}

export interface SyncResult {
  created: number;
  updated: number;
  skipped: number;
  errors: number;
}

export interface OAuthState {
  provider: IntegrationProvider;
  serviceType: ServiceType;
  userId: string;
  orgId: string;
}

// ── AUTOMATION ───────────────────────────────────────────

export type TriggerType =
  | 'deal_created' | 'deal_stage_changed' | 'deal_value_changed' | 'deal_closed'
  | 'contact_created' | 'contact_updated' | 'contact_tagged'
  | 'task_overdue' | 'task_completed'
  | 'communication_logged' | 'no_activity' | 'scheduled';

export type ConditionOperator =
  | 'equals' | 'not_equals' | 'contains' | 'not_contains'
  | 'greater_than' | 'less_than' | 'greater_or_equal' | 'less_or_equal'
  | 'is_empty' | 'is_not_empty' | 'in_list' | 'not_in_list'
  | 'days_since_greater' | 'days_since_less';

export type ActionType =
  | 'create_task' | 'send_notification' | 'move_deal_stage'
  | 'add_tag' | 'remove_tag' | 'update_field'
  | 'send_email' | 'send_whatsapp' | 'send_slack'
  | 'assign_to' | 'wait' | 'webhook';

export interface WorkflowCondition {
  field: string;
  operator: ConditionOperator;
  value: unknown;
  logic?: 'and' | 'or';
}

export interface WorkflowAction {
  type: ActionType;
  config: Record<string, unknown>;
  order: number;
}

export interface CrmWorkflow {
  id: string;
  orgId: string;
  name: string;
  nameAr: string | null;
  description: string | null;
  descriptionAr: string | null;
  triggerType: TriggerType;
  triggerConfig: Record<string, unknown>;
  conditions: WorkflowCondition[];
  actions: WorkflowAction[];
  isActive: boolean;
  runCount: number;
  lastRunAt: string | null;
  installedFrom: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CrmWorkflowLog {
  id: string;
  workflowId: string;
  orgId: string;
  triggerEvent: Record<string, unknown> | null;
  conditionsMet: boolean;
  actionsExecuted: Record<string, unknown> | null;
  error: string | null;
  executionMs: number | null;
  createdAt: string;
}

export interface CrmWorkflowTemplate {
  id: string;
  slug: string;
  name: string;
  nameAr: string;
  description: string | null;
  descriptionAr: string | null;
  category: string;
  region: string | null;
  triggerType: TriggerType;
  triggerConfig: Record<string, unknown>;
  conditions: WorkflowCondition[];
  actions: WorkflowAction[];
  isFeatured: boolean;
  createdAt: string;
}

// ── WHATSAPP BUSINESS ────────────────────────────────────

export type WhatsAppAccountStatus = 'pending' | 'verified' | 'active' | 'suspended';
export type WhatsAppTemplateCategory = 'marketing' | 'utility' | 'authentication';
export type WhatsAppTemplateStatus = 'pending' | 'approved' | 'rejected';

export interface WhatsAppAccount {
  id: string;
  orgId: string;
  phoneNumber: string;
  wabaId: string;
  accessToken: string;
  status: WhatsAppAccountStatus;
  numberModel: 'shared' | 'individual';
  createdAt: string;
  updatedAt: string;
}

export interface WhatsAppTemplate {
  id: string;
  orgId: string;
  accountId: string;
  name: string;
  language: string;
  category: WhatsAppTemplateCategory;
  status: WhatsAppTemplateStatus;
  header: Record<string, unknown> | null;
  body: string;
  footer: string | null;
  buttons: Record<string, unknown> | null;
  metaTemplateId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WhatsAppConversation {
  id: string;
  orgId: string;
  accountId: string | null;
  contactId: string | null;
  contactPhone: string;
  assignedTo: string | null;
  status: 'active' | 'expired';
  windowExpires: string | null;
  lastMessageAt: string | null;
  createdAt: string;
}

// ── LEAD SCORING ─────────────────────────────────────────

export interface LeadScoringRule {
  id: string;
  orgId: string;
  name: string | null;
  nameAr: string | null;
  field: string;
  operator: string;
  value: string;
  points: number;
  isActive: boolean;
  createdAt: string;
}

export type RoutingType = 'round_robin' | 'territory' | 'skill' | 'manual';

export interface RoutingRule {
  id: string;
  orgId: string;
  name: string;
  nameAr: string | null;
  type: RoutingType;
  conditions: WorkflowCondition[];
  config: Record<string, unknown>;
  priority: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── PUBLIC API ───────────────────────────────────────────

export interface ApiKey {
  id: string;
  orgId: string;
  name: string;
  keyHash: string;
  keyPrefix: string;
  permissions: Record<string, boolean>;
  rateLimit: number;
  lastUsedAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
  createdBy: string | null;
  createdAt: string;
}

export interface ApiWebhookSubscription {
  id: string;
  orgId: string;
  apiKeyId: string;
  url: string;
  eventTypes: string[];
  secret: string;
  status: 'active' | 'paused' | 'failed';
  failureCount: number;
  lastSuccess: string | null;
  lastFailure: string | null;
  createdAt: string;
}

// ── DOCUMENTS ────────────────────────────────────────────

export interface CrmDocumentTemplate {
  id: string;
  orgId: string;
  name: string;
  nameAr: string | null;
  content: string;
  contentAr: string | null;
  mergeFields: { path: string; label: string; labelAr?: string }[];
  category: string;
  language: string;
  isActive: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CrmDocument {
  id: string;
  orgId: string;
  templateId: string | null;
  dealId: string | null;
  contactId: string | null;
  name: string;
  nameAr: string | null;
  fileUrl: string;
  fileSize: number | null;
  language: string;
  version: number;
  status: 'draft' | 'sent' | 'viewed' | 'signed' | 'expired';
  signedAt: string | null;
  generatedBy: string | null;
  generatedAt: string;
}

export interface CrmDocumentVersion {
  id: string;
  documentId: string;
  version: number;
  fileUrl: string;
  changesSummary: string | null;
  createdBy: string | null;
  createdAt: string;
}

// ── VERTICALS ────────────────────────────────────────────

export interface CrmVerticalTemplate {
  id: string;
  slug: string;
  name: string;
  nameAr: string;
  description: string | null;
  descriptionAr: string | null;
  industry: string;
  region: string | null;
  pipelineConfig: Record<string, unknown>;
  customFields: Record<string, unknown>;
  workflowTemplates: Record<string, unknown>[];
  aiPrompts: Record<string, unknown>;
  icon: string | null;
  isPublished: boolean;
  createdAt: string;
}

// ── PLAN GATING ──────────────────────────────────────────

export type GatedFeature =
  | 'multiple_pipelines' | 'custom_fields' | 'migration_wizard'
  | 'visual_automation' | 'whatsapp_business' | 'advanced_reports'
  | 'custom_roles' | 'email_tracking' | 'audit_trail'
  | 'api_access' | 'ai_deal_scoring' | 'lead_scoring'
  | 'document_templates' | 'vertical_templates';

export const PLAN_FEATURE_MAP: Record<GatedFeature, PlanTier[]> = {
  multiple_pipelines: ['organization', 'enterprise', 'custom'],
  custom_fields: ['organization', 'enterprise', 'custom'],
  migration_wizard: ['organization', 'enterprise', 'custom'],
  visual_automation: ['organization', 'enterprise', 'custom'],
  whatsapp_business: ['organization', 'enterprise', 'custom'],
  advanced_reports: ['organization', 'enterprise', 'custom'],
  custom_roles: ['organization', 'enterprise', 'custom'],
  email_tracking: ['organization', 'enterprise', 'custom'],
  audit_trail: ['enterprise', 'custom'],
  api_access: ['enterprise', 'custom'],
  ai_deal_scoring: ['enterprise', 'custom'],
  lead_scoring: ['enterprise', 'custom'],
  document_templates: ['organization', 'enterprise', 'custom'],
  vertical_templates: ['enterprise', 'custom'],
};

export const PLAN_SEAT_LIMITS: Record<PlanTier, number> = {
  entrepreneur: 10,
  organization: 35,
  enterprise: 150,
  custom: 999,
};

export const PLAN_CONTACT_LIMITS: Record<PlanTier, number> = {
  entrepreneur: 1000,
  organization: 10000,
  enterprise: Infinity,
  custom: Infinity,
};

// ── V2 DEAL SCORING EXTENSION ───────────────────────────
// Extends V1 CrmDeal with AI scoring columns from migration 018.
// Use this interface when working with scored deals.

export interface CrmDealWithScore extends CrmDeal {
  aiScore: number | null;
  aiScoreTrend: string | null;
  aiScoreReasoning: string | null;
  aiScoredAt: string | null;
}

// ── V2 CONTACT SCORING EXTENSION ────────────────────────
// Extends V1 CrmContact with lead scoring columns from migration 020.

export interface CrmContactWithScore {
  leadScore: number;
  leadScoreBreakdown: Record<string, unknown> | null;
  routedAt: string | null;
  routedByRule: string | null;
}
