/**
 * Rasmalak AI Types
 * =================
 * Core type definitions for the AI layer.
 * These types define the contract between all AI-related modules.
 */

// ============================================
// INTENT TYPES
// ============================================
// What the user wants to accomplish.
// The AI will classify each message into one of these intents.

export type AIIntent =
  // Spending & Analysis
  | 'analyze_spending'        // "وين راحت فلوسي؟" - Where did my money go?
  | 'category_breakdown'      // "كم صرفت على الأكل؟" - How much on food?
  | 'compare_periods'         // "هل صرفت أكثر من الشهر الماضي؟" - More than last month?
  
  // Savings & Goals
  | 'savings_advice'          // "كيف أوفر أكثر؟" - How to save more?
  | 'goal_progress'           // "كم باقي على هدفي؟" - How much left for my goal?
  | 'goal_planning'           // "بدي أوفر للسفر" - I want to save for travel
  
  // Budget
  | 'budget_status'           // "هل أنا ماشي صح؟" - Am I on track?
  | 'budget_advice'           // "كيف أرتب ميزانيتي؟" - How to organize my budget?
  | 'overspending_alert'      // "ليش صارفين كتير؟" - Why overspending?
  
  // Predictions & Simulations
  | 'predict_end_of_month'    // "هل رح يكفيني الراتب؟" - Will salary last?
  | 'simulate_scenario'       // "لو صرفت 200 أقل؟" - What if I spend 200 less?
  | 'forecast_savings'        // "متى رح أوصل لهدفي؟" - When will I reach my goal?
  
  // Learning & Education
  | 'explain_concept'         // "شو يعني تدفق نقدي؟" - What is cash flow?
  | 'learning_recommendation' // "شو لازم أتعلم؟" - What should I learn?
  
  // Document handling (attachments)
  | 'document_extract'        // Default for any uploaded bill/receipt
  | 'document_transcribe'     // Explicit "read this aloud / transcribe it"
  | 'confirm_add_expense'     // "yes, add it" follow-up after a parsed bill

  // General
  | 'greeting'                // "مرحبا" - Hello
  | 'gratitude'               // "شكرًا" - Thank you
  | 'unclear'                 // Intent couldn't be determined
  | 'out_of_scope';           // Not a financial question

// ============================================
// ENTITY TYPES
// ============================================
// Specific data extracted from user messages.

export type EntityType =
  | 'money'           // Amount mentioned (e.g., "500 دينار")
  | 'category'        // Spending category (e.g., "أكل", "مواصلات")
  | 'time_period'     // Time reference (e.g., "هالشهر", "الأسبوع الماضي")
  | 'goal'            // Goal name (e.g., "لابتوب جديد")
  | 'percentage'      // Percentage (e.g., "20%")
  | 'comparison';     // Comparison type (e.g., "أكثر من", "أقل من")

export interface AIEntity {
  type: EntityType;
  value: string | number;
  raw: string;              // Original text from message
  confidence: number;       // 0-1 confidence score
  // Optional type-specific fields
  currency?: string;        // For money entities
  category?: string;        // For category entities
  startDate?: string;       // For time_period entities
  endDate?: string;         // For time_period entities
}

// ============================================
// CONFIDENCE LEVELS
// ============================================
// How certain the AI is about its understanding.

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface IntentClassification {
  intent: AIIntent;
  confidence: ConfidenceLevel;
  confidenceScore: number;  // 0-1 numeric score
  entities: AIEntity[];
  needsClarification: boolean;
  clarificationQuestion?: string;
}

// ============================================
// ATTACHMENT TYPES
// ============================================
// Files and images that users can attach to messages.

export type AttachmentType = 'image' | 'document' | 'pdf';

export interface MessageAttachment {
  id: string;
  type: AttachmentType;
  filename: string;
  mimeType: string;
  size: number;               // bytes
  // For images: base64 data URL or uploaded URL
  // For documents: text content after parsing
  content: string;
  // Preview URL for UI display
  previewUrl?: string;
}

// ============================================
// MESSAGE TYPES
// ============================================
// Represents a single message in the conversation.

export type MessageRole = 'user' | 'assistant' | 'system';

export interface AIMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: string;          // ISO 8601
  // File attachments
  attachments?: MessageAttachment[];
  // Metadata (only for assistant messages)
  intent?: AIIntent;
  confidence?: ConfidenceLevel;
  entities?: AIEntity[];
  // Per-message suggested actions — attached when the assistant response
  // includes interactive chips (e.g. extracted-bill action buttons). Kept
  // on the message itself so chips don't vanish on the next user turn.
  suggestedActions?: SuggestedAction[];
  // UI hints
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
}

// ============================================
// CONVERSATION TYPES
// ============================================
// Full conversation with context.

export interface AIConversation {
  id: string;
  userId: string;
  messages: AIMessage[];
  createdAt: string;
  updatedAt: string;
  // Conversation metadata
  language: 'ar' | 'en';
  isActive: boolean;
}

// ============================================
// USER FINANCIAL CONTEXT
// ============================================
// The user's financial data, formatted for AI consumption.
// This is what gets sent to the AI so it can give personalized advice.

export interface CategorySpending {
  category: string;
  amount: number;
  percentage: number;
  transactionCount: number;
}

export interface TimeSeriesPoint {
  date: string;
  income: number;
  expenses: number;
  balance: number;
}

// Lean shape of a single transaction sent to the AI layer. We avoid
// shipping the full store record (it carries `id`, `user_id`, recurring
// metadata, etc. that the model doesn't need) so the prompt stays
// small. Amounts are signed: positive = income, negative = expense.
export interface TransactionLite {
  date: string;                 // ISO 8601 (YYYY-MM-DD)
  amount: number;               // Signed
  currency: string;
  category: string | null;      // Top-level category id (food, bills, ...)
  subcategory?: string | null;  // V1: food + bills only
  description?: string;         // Already trimmed at the source
  type: 'income' | 'expense';
  receiptId?: string | null;    // Set when this row is part of a receipt
}

export interface UserFinancialContext {
  // Basic metrics
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  savingsRate: number;          // Percentage saved

  // Recent individual transactions — last ~90 days, capped (200 rows,
  // oldest-first). Lets the AI answer "did I pay for X last week?" or
  // "what was my biggest expense last month?" without needing a tool
  // call. Populated by `buildUserContext`; any agent that wants to
  // reference rows must declare the `recentTransactions` slice.
  recentTransactions: TransactionLite[];
  
  // Current period (this month)
  currentMonth: {
    income: number;
    expenses: number;
    daysRemaining: number;
    projectedEndBalance: number;
  };
  
  // Spending breakdown
  spendingByCategory: CategorySpending[];
  topSpendingCategories: string[];
  
  // Trends
  comparedToLastMonth: {
    incomeChange: number;       // Percentage
    expenseChange: number;      // Percentage
    trend: 'improving' | 'stable' | 'declining';
  };
  
  // Patterns detected
  patterns: {
    hasRecurringExpenses: boolean;
    recurringExpenses: Array<{
      description: string;
      amount: number;
      frequency: 'weekly' | 'monthly' | 'yearly';
    }>;
    unusualSpending: Array<{
      category: string;
      amount: number;
      deviation: number;        // How much above normal
    }>;
  };
  
  // Goals (if any)
  goals: Array<{
    name: string;
    targetAmount: number;
    currentAmount: number;
    progressPercentage: number;
    estimatedCompletionDate?: string;
  }>;
  
  // Budget status (if set)
  budget?: {
    monthlyLimit: number;
    spent: number;
    remaining: number;
    percentageUsed: number;
    isOverBudget: boolean;
  };
  
  // User profile
  userType: 'individual' | 'self_employed' | 'sme';
  currency: string;
  language: 'ar' | 'en';
}

// ============================================
// AI RESPONSE TYPES
// ============================================
// What the AI returns after processing a message.

export interface SuggestedAction {
  id: string;
  label: string;
  labelAr: string;
  action:
    | 'send_message'
    | 'navigate'
    | 'set_goal'
    | 'set_budget'
    | 'create_transaction'
    | 'set_reminder'
    | 'mark_recurring';
  // Backwards-compatible payload for send_message / navigate (string).
  // For new actions a structured payloadData is used instead.
  payload: string;
  // Structured payload for actions that need typed data (e.g. create_transaction).
  // We keep `payload` (string) populated with a human-readable summary for
  // existing consumers that only know about the string field.
  payloadData?:
    | CreateTransactionPayload
    | CreateReceiptPayload
    | SetReminderPayload
    | MarkRecurringPayload;
}

export interface CreateTransactionPayload {
  // `kind` is optional for backwards compatibility — older receipts in
  // chat history won't have it. When present and equal to 'single' this
  // is explicitly a one-row create_transaction (vs the bulk receipt
  // variant below).
  kind?: 'single';
  type: 'expense' | 'income';
  amount: number;             // Positive number; sign is derived from type
  currency: string;           // ISO 4217 (e.g. JOD, AED)
  category: string;           // Lowercase canonical category id (food, bills, ...)
  description?: string;       // e.g. "DEWA bill — March"
  date: string;               // ISO 8601 (YYYY-MM-DD)
}

// Bulk variant: one receipt becomes N transaction rows with a shared
// receipt_id. Used by the chat "Add as expense" chip when line items
// were extracted, and by the dedicated Receipt Scanner modal.
export interface CreateReceiptPayload {
  kind: 'receipt';
  topCategory: string;        // food / bills / shopping / ... (parent)
  vendor: string;             // For descriptions and the parent grouping
  currency: string;           // ISO 4217
  date: string;               // ISO 8601
  receiptTotal: number;       // Total on the receipt (positive)
  items: Array<{
    description: string;
    amount: number;           // Per-item amount (positive)
    subcategory: string | null;
  }>;
}

export interface SetReminderPayload {
  title: string;
  amount?: number;
  currency?: string;
  dueDate: string;            // ISO 8601
  vendor?: string;
}

export interface MarkRecurringPayload {
  vendor: string;
  amount: number;
  currency: string;
  frequency: 'weekly' | 'monthly' | 'yearly';
  category?: string;
}

// Document extraction output from the documentExtractorAgent.
// One-shot vision-mode JSON; never re-sent to the chat agent verbatim.
export interface ExtractedDocumentLineItem {
  description: string;
  amount: number | null;
  quantity: number | null;
  // Canonical subcategory id from src/ai/taxonomy.ts. Set by the
  // extractor + server-side normalizer when the parent category is
  // "food" or "bills"; null otherwise.
  subcategory: string | null;
}

export interface ExtractedDocument {
  documentType:
    | 'receipt'
    | 'invoice'
    | 'utility_bill'
    | 'bank_statement'
    | 'unknown';
  vendor: string | null;          // Raw vendor name as it appears
  vendorCanonical: string | null; // Normalized via menaVendors lookup
  amount: number | null;          // Total amount paid / due (positive)
  currency: string | null;        // ISO 4217 inferred from the document
  date: string | null;            // Issue / transaction date, ISO 8601
  dueDate: string | null;         // For invoices/utilities, ISO 8601
  category: string | null;        // Suggested category (food, bills, ...)
  lineItems: ExtractedDocumentLineItem[];
  isRecurring: boolean;           // Heuristic flag (e.g. utility, subscription)
  confidence: 'high' | 'medium' | 'low';
  rawTextSnippet: string;         // <= 280 chars; for explainability only
}

export interface InsightCard {
  id: string;
  type: 'warning' | 'success' | 'info' | 'tip';
  title: string;
  titleAr: string;
  message: string;
  messageAr: string;
  metric?: {
    value: number;
    unit: string;
    change?: number;          // Percentage change
    changeDirection?: 'up' | 'down';
  };
  action?: SuggestedAction;
}

export interface AIResponse {
  // The main response
  message: string;
  messageAr?: string;         // Arabic version if different
  
  // What we understood
  intent: AIIntent;
  confidence: ConfidenceLevel;
  entities: AIEntity[];
  
  // Follow-up suggestions
  suggestedActions: SuggestedAction[];
  
  // Insights to display (for dashboard/sidebar)
  insights: InsightCard[];
  
  // If we need more info
  needsClarification: boolean;
  clarificationOptions?: string[];
  
  // Metadata
  processingTime: number;     // Milliseconds
  model: string;              // Which model was used
}

// ============================================
// API TYPES
// ============================================
// Request/Response types for the chat API.

export interface ChatRequest {
  message: string;
  conversationId?: string;    // For continuing a conversation
  language: 'ar' | 'en';
  attachments?: MessageAttachment[];  // File attachments
}

export interface ChatResponse {
  success: boolean;
  response?: AIResponse;
  conversationId: string;
  error?: string;
}

// ============================================
// PROVIDER TYPES
// ============================================
// For swapping between AI providers (OpenAI, Vertex, etc.)

export type AIProvider = 'openai' | 'gemini' | 'vertex' | 'local';

export interface AIProviderConfig {
  provider: AIProvider;
  model: string;
  flashModel?: string;
  fallbackModel?: string;
  maxTokens: number;
  temperature: number;
}

// ============================================
// INSIGHT GENERATION TYPES
// ============================================
// For generating dashboard insights (not just chat).

export type InsightTrigger = 
  | 'daily_summary'
  | 'weekly_summary'
  | 'budget_warning'
  | 'goal_milestone'
  | 'unusual_spending'
  | 'savings_opportunity'
  | 'bill_reminder';

export interface GeneratedInsight {
  trigger: InsightTrigger;
  priority: 'high' | 'medium' | 'low';
  card: InsightCard;
  expiresAt?: string;         // When to stop showing this
  dismissible: boolean;
}


