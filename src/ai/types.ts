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
// MESSAGE TYPES
// ============================================
// Represents a single message in the conversation.

export type MessageRole = 'user' | 'assistant' | 'system';

export interface AIMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: string;          // ISO 8601
  // Metadata (only for assistant messages)
  intent?: AIIntent;
  confidence?: ConfidenceLevel;
  entities?: AIEntity[];
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

export interface UserFinancialContext {
  // Basic metrics
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  savingsRate: number;          // Percentage saved
  
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
  action: 'send_message' | 'navigate' | 'set_goal' | 'set_budget';
  payload: string;            // Message to send, or route to navigate
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

export type AIProvider = 'openai' | 'vertex' | 'local';

export interface AIProviderConfig {
  provider: AIProvider;
  model: string;
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

