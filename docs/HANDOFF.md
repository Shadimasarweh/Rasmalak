# Rasmalak — Complete Project Handoff

> **Last updated:** March 2026
> **Repository:** https://github.com/Shadimasarweh/Rasmalak
> **Stack:** Next.js 16 · React 19 · TypeScript · Supabase · Zustand · Tailwind CSS 4 · react-intl

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Getting Started](#2-getting-started)
3. [Tech Stack & Dependencies](#3-tech-stack--dependencies)
4. [Directory Structure](#4-directory-structure)
5. [App Routing](#5-app-routing)
6. [Authentication](#6-authentication)
7. [Database & Supabase](#7-database--supabase)
8. [State Management](#8-state-management)
9. [AI System (Mustasharak)](#9-ai-system-mustasharak)
10. [Dashboard](#10-dashboard)
11. [Transactions](#11-transactions)
12. [Budgets](#12-budgets)
13. [Savings Goals](#13-savings-goals)
14. [Learn Section & Courses](#14-learn-section--courses)
15. [Course Tutor Chatbot](#15-course-tutor-chatbot)
16. [Financial Calculators](#16-financial-calculators)
17. [Tools Directory](#17-tools-directory)
18. [Insights & Rules Engine](#18-insights--rules-engine)
19. [Settings](#19-settings)
20. [Onboarding](#20-onboarding)
21. [Internationalization (i18n)](#21-internationalization-i18n)
22. [Styling & Theming](#22-styling--theming)
23. [PWA Configuration](#23-pwa-configuration)
24. [Known Considerations](#24-known-considerations)

---

## 1. Project Overview

Rasmalak (رَسمالَك — "Your Capital") is a bilingual (Arabic/English) personal finance platform targeting users in the Arab world. It combines transaction tracking, budgeting, savings goals, AI-powered financial advice, financial literacy courses, and a suite of financial calculators — all within a mobile-first PWA.

**Core value propositions:**
- Full Arabic-first UI with RTL support and Arabic-Indic numerals
- AI financial advisor ("Mustasharak") powered by Gemini/OpenAI with multi-agent orchestration
- 30 financial literacy courses across 10 subjects, each in 3 difficulty levels (beginner/intermediate/advanced), available in both Arabic and English
- 5 functional financial calculators with bilingual PDF report generation
- Country-specific tools for Jordan, UAE, KSA, Egypt, and Iraq (tax, zakat, social security)
- 19 supported currencies across MENA and international markets

---

## 2. Getting Started

### Prerequisites
- Node.js 18+
- npm
- A Supabase project (for auth, database, RLS)
- Google Gemini API key and/or OpenAI API key

### Environment Variables

Create `.env.local` in the project root:

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# AI Providers (at least one required for chat)
GOOGLE_AI_API_KEY=your-gemini-key
OPENAI_API_KEY=your-openai-key
```

### Setup

```bash
git clone https://github.com/Shadimasarweh/Rasmalak.git
cd Rasmalak
npm install
npm run dev
```

### Database Setup

Run the migration SQL files in order against your Supabase project:

```
supabase/migrations/001_budgets_and_goals.sql
supabase/migrations/002_user_semantic_state.sql
supabase/migrations/003_ai_audit_log.sql
supabase/migrations/004_course_progress.sql
supabase/migrations/005_financial_advice_target_metric.sql
```

> **Important:** The `transactions` table is used by the app but not defined in checked-in migrations. It must exist in your Supabase project with columns: `id`, `user_id`, `type` (income/expense), `amount`, `currency`, `category`, `note`, `date`, `created_at`.

### Build & Production

```bash
npm run build    # Next.js production build (generates PWA service worker)
npm start        # Start production server
```

---

## 3. Tech Stack & Dependencies

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router, Webpack) | 16.1.1 |
| UI | React | 19.2.3 |
| Language | TypeScript | ^5 |
| Styling | Tailwind CSS | ^4 |
| State | Zustand (+ React Context) | ^5.0.9 |
| i18n | react-intl | ^8.1.1 |
| Backend | Supabase (Auth, PostgreSQL, RLS) | ^2.93.1 |
| Charts | Recharts | ^3.6.0 |
| PDF | pdfmake | ^0.3.3 |
| Icons | Lucide React | ^0.562.0 |
| Dates | date-fns | ^4.1.0 |
| PWA | next-pwa | ^5.6.0 |
| AI | Gemini (default) / OpenAI | via REST |

---

## 4. Directory Structure

```
src/
├── ai/                        # AI orchestrator, agents, providers, memory, validation
│   ├── agents/                # chatAgent, insightAgent, profileAgent, recommendationAgent, policyAgent
│   ├── context/               # Context selector, token budget, slice types
│   ├── deterministic/         # Signals, health checks, projections
│   ├── hooks/                 # useAIInsights
│   ├── memory/                # Memory service (semantic state)
│   ├── orchestrator/          # Main orchestrator pipeline
│   ├── providers/             # gemini.ts, openai.ts
│   ├── validation/            # Response validation pipeline
│   ├── adviceLogger.ts        # Logs financial advice to Supabase
│   ├── config.ts              # AI provider config, feature flags
│   ├── context.ts             # buildUserContext (bridges app → AI)
│   ├── types.ts               # AIMessage, AIResponse, intents, etc.
│   └── index.ts               # Public re-exports
│
├── app/
│   ├── (dashboard)/           # Route group — no URL segment
│   │   ├── page.tsx           # / — Main dashboard
│   │   ├── budget/            # /budget
│   │   ├── budgets/           # /budgets
│   │   ├── calculators/       # /calculators/*
│   │   │   ├── compound-savings/
│   │   │   ├── credit-card/
│   │   │   ├── home-affordability/
│   │   │   ├── mortgage-payoff/
│   │   │   └── simple-loan/
│   │   ├── chat/              # /chat — Mustasharak AI
│   │   ├── community/         # /community (placeholder)
│   │   ├── goals/             # /goals
│   │   ├── learn/             # /learn + /learn/courses/[courseId]
│   │   ├── settings/          # /settings
│   │   ├── tools/             # /tools — tool directory
│   │   ├── transactions/      # /transactions, /transactions/new, /transactions/new/income
│   │   └── layout.tsx         # Dashboard shell (AuthGuard, providers, nav)
│   ├── api/chat/              # POST /api/chat
│   ├── auth/callback/         # OAuth/email code exchange
│   ├── login/                 # /login
│   ├── signup/                # /signup
│   ├── forgot-password/       # /forgot-password
│   ├── reset-password/        # /reset-password
│   ├── onboarding/            # /onboarding (4-step wizard)
│   ├── layout.tsx             # Root layout (AuthProvider, ThemeProvider, IntlProvider)
│   └── globals.css            # Design system, Tailwind, CSS variables
│
├── application/               # Rule runner (ruleRunner.ts)
├── calculators/               # Calculator logic, PDF report generators, shared PDF helpers
├── components/
│   ├── courses/               # CourseHero, CourseSidebar, CourseContent, CourseSection, CourseTutorChat
│   │   └── blocks/            # TextBlock, KeyInsightBlock, ExampleBlock, etc.
│   ├── filters/               # FilterPanel, useFilterStore, applyFilters
│   ├── layout/                # DashboardLayout, Sidebar, Header
│   ├── ui/                    # Button, Card, Input, Badge, Tabs, StatCard
│   └── (root)                 # AuthGuard, ThemeProvider, IntlProviderWrapper, charts, BottomNav, etc.
│
├── data/courses/              # 60 course JSON files + index.ts registry
├── domain/                    # Domain types
├── hooks/                     # Custom hooks
├── insights/                  # Insight types, rule→insight mapper, i18n messages
├── lib/                       # supabaseClient, constants, currencies, translations, utils
├── messages/                  # Flat i18n messages
│   ├── ar/                    # Arabic translations (app, nav, dashboard, tools, etc.)
│   └── en/                    # English translations
├── providers/                 # AuthProvider
├── rules/                     # Financial rules (overspending, low savings, debt risk)
├── store/                     # Zustand stores + React Context providers
├── tests/                     # Test files
└── types/                     # TypeScript type definitions (index.ts, course.ts, ambient .d.ts)
```

---

## 5. App Routing

### Public Routes
| URL | Purpose |
|-----|---------|
| `/login` | Email/password login |
| `/signup` | Account registration |
| `/forgot-password` | Password reset request |

### Protected Routes (require authentication)
| URL | Purpose |
|-----|---------|
| `/` | Main dashboard with balance, cash flow, spending, goals, budgets |
| `/transactions` | Transaction list with totals and delete |
| `/transactions/new` | Add expense (7 categories) |
| `/transactions/new/income` | Add income (7 categories) |
| `/budgets` | Budget management (monthly + per-category) |
| `/budget` | Budget view |
| `/goals` | Savings goals CRUD |
| `/chat` | Mustasharak AI financial advisor |
| `/learn` | Financial literacy hub (courses, articles, videos, topics, achievements) |
| `/learn/courses/[courseId]` | Course viewer with sidebar, pagination, tutor chatbot |
| `/tools` | Financial tools directory |
| `/calculators/simple-loan` | Simple loan amortization calculator |
| `/calculators/credit-card` | Credit card payoff calculator |
| `/calculators/home-affordability` | Home affordability calculator |
| `/calculators/mortgage-payoff` | Mortgage payoff with extra payments |
| `/calculators/compound-savings` | Compound savings growth calculator |
| `/settings` | Profile, security (2FA, password, sessions), preferences |
| `/community` | Community page (placeholder) |
| `/onboarding` | 4-step onboarding wizard |
| `/reset-password` | Password reset form |

### API Routes
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/chat` | POST | AI chat — validates, rate-limits (~20/min), calls orchestrator |
| `/api/chat` | OPTIONS | CORS preflight |
| `/auth/callback` | GET | Supabase OAuth/email code exchange → redirect |

---

## 6. Authentication

### Architecture
- **Supabase Auth** handles email/password, OAuth, and magic link flows
- **`src/lib/supabaseClient.ts`** creates the client with `persistSession: true`, `autoRefreshToken: true`, storage key `rasmalak-auth`
- **`src/providers/AuthProvider.tsx`** is the root-level auth wrapper:
  - On mount: calls `getSession()`, attempts `refreshSession()` if no active session (without aggressive sign-out on failure)
  - Subscribes to `onAuthStateChange` for real-time session updates
  - Syncs session to both `authStore` (Zustand) and `useStore` (legacy Zustand)
  - Blocks rendering until `initialized = true`
- **`src/components/AuthGuard.tsx`** protects dashboard routes:
  - Public routes: `/login`, `/signup`, `/forgot-password`
  - Unauthenticated users → redirect to `/login`
  - Authenticated users on public pages → redirect to `/`

### Auth Flow
1. User signs up/logs in → Supabase creates session → stored in `localStorage` under `rasmalak-auth`
2. `AuthProvider` picks up session → syncs to Zustand stores
3. `AuthGuard` checks auth state → allows or redirects
4. OAuth callback: `/auth/callback` exchanges code for session, redirects to `next` param or `/`

### Session Recovery
Transaction pages (`/transactions/new` and `/transactions/new/income`) include a `useEffect` that re-checks `supabase.auth.getSession()` if the Zustand store shows `initialized && !user`, recovering from transient refresh failures without requiring re-login.

---

## 7. Database & Supabase

### Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `transactions` | User financial transactions | `id`, `user_id`, `type`, `amount`, `currency`, `category`, `note`, `date` |
| `budgets` | Monthly + category budgets (one row per user) | `user_id`, `monthly_budget`, `category_budgets` (JSONB) |
| `savings_goals` | User savings goals | `id`, `user_id`, `name`, `name_ar`, `target_amount`, `current_amount`, `deadline`, `color` |
| `financial_advice` | AI-generated financial advice audit trail | `id`, `user_id`, `source`, `rule_id`, `advice_text`, `target_metric`, `confidence`, `conversation_id`, `context_hash` |
| `ai_audit_log` | Orchestrator execution traces | `id`, `user_id`, `conversation_id`, `intent`, `agent`, `provider`, `model`, `latency_ms`, `tokens_used`, `validation_passed`, `error` |
| `user_semantic_state` | AI memory / user financial profile | `user_id` + semantic fields (one row per user) |
| `course_progress` | Course completion tracking | `user_id`, `course_id`, `completed_section_ids` (array), `locale` |

### Row Level Security (RLS)
All tables have RLS enabled. Policies ensure users can only read/write their own data:
- SELECT: `auth.uid() = user_id`
- INSERT: `auth.uid() = user_id`

### Migrations
Located in `supabase/migrations/` (files 001–005). Run in numeric order against your Supabase project.

> **Note:** The `transactions` table is not in the checked-in migrations. Ensure it exists in your Supabase dashboard or add a migration.

---

## 8. State Management

### Zustand Stores

| Store | File | Persists? | Manages |
|-------|------|-----------|---------|
| **authStore** | `src/store/authStore.ts` | No | `session`, derived `user`, `initialized` flag — canonical auth source |
| **useStore** | `src/store/useStore.ts` | Yes (`rasmalak-storage`) | Language, currency, theme, accent, onboarding data, `userName`, legacy transactions/auth |
| **useFilterStore** | `src/components/filters/useFilterStore.ts` | No | Per-page filter selections for tools/transactions |

### React Context Providers

| Provider | File | Server-backed? | Manages |
|----------|------|----------------|---------|
| **TransactionProvider** | `src/store/transactionStore.tsx` | Yes (Supabase) | Transactions CRUD, derived totals |
| **BudgetProvider** | `src/store/budgetStore.tsx` | Yes (Supabase) | Monthly budget, category budgets |
| **GoalsProvider** | `src/store/goalsStore.tsx` | Yes (Supabase) | Savings goals CRUD |
| **CourseProgressProvider** | `src/store/courseProgressStore.tsx` | Hybrid | Section completion — merges localStorage with Supabase when logged in |

### Data Flow
- **Auth state** flows from Supabase → `AuthProvider` → `authStore` + `useStore`
- **Financial data** (transactions, budgets, goals) loads from Supabase on mount when auth is ready
- **Preferences** (language, currency, theme) persist locally in Zustand (`rasmalak-storage`)
- **Course progress** uses a hybrid approach: localStorage for immediate updates, Supabase for cross-device sync

---

## 9. AI System (Mustasharak)

### Architecture Overview

The AI system is a multi-agent orchestrator that processes user messages through a pipeline:

```
User Message
    → Rate Limiting (~20/min)
    → Intent Classification
    → Agent Selection (from registry)
    → Memory Read (semantic state)
    → Optional Deterministic Layer (signals, health, projections)
    → Context Selection (token budget)
    → Prompt Composition
    → LLM Call (Gemini or OpenAI)
    → Validation Pipeline (with retry)
    → History Update
    → Memory Update
    → Advice Logging (financial_advice table)
    → Audit Logging (ai_audit_log table)
    → Response
```

### AI Agents

| Agent | File | Purpose |
|-------|------|---------|
| chatAgent | `src/ai/agents/chatAgent.ts` | General conversation, financial Q&A |
| insightAgent | `src/ai/agents/insightAgent.ts` | Financial insights and analysis |
| profileAgent | `src/ai/agents/profileAgent.ts` | User profile understanding |
| recommendationAgent | `src/ai/agents/recommendationAgent.ts` | Personalized financial recommendations |
| policyAgent | `src/ai/agents/policyAgent.ts` | Policy and compliance |

Agent selection priority: `recommendation` → `insight` → `profile` → fallback `chat`

### Configuration

**File:** `src/ai/config.ts`
- Default provider: **Gemini** (`gemini-2.5-flash`)
- Feature flags: `chatEnabled`, etc.
- Switchable to OpenAI via config

### Context Building

**File:** `src/ai/context.ts`
- `buildUserContext()` bridges app state (transactions, budgets, goals, language, currency, onboarding data) into a `UserFinancialContext` object
- Context selector (`src/ai/context/contextSelector.ts`) manages token budgets and selects relevant financial "slices" for prompts

### Providers

| Provider | File | Model |
|----------|------|-------|
| Gemini | `src/ai/providers/gemini.ts` | `gemini-2.5-flash` (requires `GOOGLE_AI_API_KEY`) |
| OpenAI | `src/ai/providers/openai.ts` | Configurable (requires `OPENAI_API_KEY`) |

### Advice Logger

**File:** `src/ai/adviceLogger.ts`
- Logs actionable AI advice to Supabase `financial_advice` table
- Normalizes `target_metric` to `'spending'` or `'savings'`
- Uses `console.warn` (not `console.error`) to avoid dev overlay disruption

### Chat API

**File:** `src/app/api/chat/route.ts`
- POST body: `{ message, conversationId?, language, context, userId, attachments? }`
- Attachments support: base64 images, PDF, text files
- Rate limit: ~20 requests/minute per user/IP
- Returns: `{ success, response: { message, intent, confidence, suggestedActions }, conversationId }`

---

## 10. Dashboard

**File:** `src/app/(dashboard)/page.tsx`

The main dashboard displays:

1. **AI Alert Banner** — contextual AI-powered alerts and goal suggestions
2. **Greeting** — time-aware greeting (morning/afternoon/evening/night) with user's display name
3. **Total Balance** — net balance from all transactions (income − expenses)
4. **Monthly Cash Flow** — current month income vs expenses with visual bar
5. **Top Savings Goal** — highest-progress in-progress goal with progress bar
6. **Weekly Spending Analysis** — bar chart of daily expenses (Sun–Sat) for current week
7. **Budget Overview** — up to 4 category budgets with progress bars and spend tracking
8. **Learning Progress** — course completion display (currently shows static demo data)
9. **For You** — featured content and AI goal suggestions
10. **Recent Transactions** — last 5 transactions with category icons, dates, and amounts

---

## 11. Transactions

### Transaction Model
```typescript
interface Transaction {
  id: string;
  amount: number;
  currency: string;
  date: string;
  type: 'income' | 'expense';
  category: string;
  description?: string;
}
```

### Store: `src/store/transactionStore.tsx`
- Loads from Supabase `transactions` table on auth ready
- `addTransaction()` — inserts with `user_id`, syncs local state
- `deleteTransaction()` — deletes by ID
- Derived: `getTotalIncome()`, `getTotalExpenses()`, `getNetBalance()`

### Expense Categories (in add form)
`food`, `transport`, `shopping`, `housing`, `health`, `entertainment`, `bills`

### Income Categories (in add form)
`salary`, `freelance`, `investments`, `gifts`, `rental`, `refunds`, `bonus`

### Full Category Definitions: `src/lib/constants.ts`
- 10 expense categories with EN/AR names, icons, and colors
- 7 income categories with EN/AR names, icons, and colors
- The add forms use a subset of these

---

## 12. Budgets

### Store: `src/store/budgetStore.tsx`
- One row per user in Supabase `budgets` table
- **`monthlyBudget`**: overall monthly spending limit (number)
- **`categoryBudgets`**: per-category limits (`Record<string, number>`, stored as JSONB)
- Actions: `setMonthlyBudget`, `setCategoryBudget`, `removeCategoryBudget`
- Each action updates local state and upserts to Supabase

---

## 13. Savings Goals

### Model
```typescript
interface SavingsGoal {
  id: string;
  name: string;
  nameAr?: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  color?: string;
}
```

### Store: `src/store/goalsStore.tsx`
- CRUD via Supabase `savings_goals` table
- Ordered by `created_at`
- `addSavingsGoal`, `updateSavingsGoal` (partial update), `deleteSavingsGoal`

---

## 14. Learn Section & Courses

### Learn Page: `src/app/(dashboard)/learn/page.tsx`

**Tabs:** Home | Articles | Videos | Topics & Skills | Achievements

**Home tab:**
- Courses from `getAllCourses(language)`, grouped by level in collapsible accordions
- Per-course progress merged from localStorage + Supabase `course_progress`
- Literacy score: average of all course progress percentages
- Recommended course: first in-progress course

**Other tabs:** Articles, Videos, Topics, Achievements — mostly placeholders with "Coming Soon" indicators

### Course Data

**Location:** `src/data/courses/` — 60 JSON files

**10 Subjects:**
1. Foundations of Money
2. Budgeting & Money Management
3. Saving & Emergency Planning
4. Debt & Credit
5. Investment Fundamentals
6. Insurance Literacy
7. Taxes & Legal
8. SME Financial Management
9. Islamic Finance Basics
10. Life Stage Financial Planning

**3 Levels per subject:** Beginner, Intermediate, Advanced
**2 Languages per course:** English (`_en`) and Arabic (`_ar`)
**Total:** 60 course files (some intermediate levels may be absent for certain subjects)

### Course Structure
```typescript
interface CourseData {
  courseId: string;       // e.g. "foundations_of_money_en"
  locale: 'en' | 'ar';
  title: string;
  description: string;
  level?: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime?: string;
  lessons: Lesson[];
}

interface Lesson {
  lessonId: string;
  title: string;
  order: number;
  sections: Section[];   // Typically 1 section per lesson
}

interface Section {
  id: string;
  title: string;
  blocks: Block[];       // Content blocks
}
```

### Content Block Types
- **`p`** — Paragraph text
- **`ul`** — Bullet list
- **`key_insight`** — Highlighted insight box with title
- **`example`** — Tabular example with rows
- **`comparison`** — Side-by-side comparison (left/right columns)
- **`action_prompt`** — Call-to-action prompt
- **`checkpoint`** — Knowledge check with checkable items

### Course Viewer: `src/app/(dashboard)/learn/courses/[courseId]/page.tsx`
- Paginated lesson display with sidebar navigation
- Lesson numbering: `courseNumber.lessonNumber` (e.g., 1.1, 1.2 for Course 1)
- `courseNumber` derived from `getCourseNumber(courseId)` based on subject order
- Course progress: sections marked complete on view, synced to localStorage + Supabase
- Floating CourseTutorChat panel on the right side

### Course Registry: `src/data/courses/index.ts`
- `getCourse(courseId)` — lookup by ID
- `getAllCourses(locale)` — all courses for a language
- `getCourseIdForLocale(baseCourseId, locale)` — switch locale
- `getCourseNumber(courseId)` — 1-based subject order number

---

## 15. Course Tutor Chatbot

**File:** `src/components/courses/CourseTutorChat.tsx`

An embedded AI tutor available on every course page.

**Features:**
- Fixed bottom-right panel (380×500px) or FAB button when minimized
- Open/closed state persisted to `localStorage` key `course-tutor-open`
- Open by default for first-time users
- Course-aware: prepends course title and current lesson/section context to messages
- Uses the same `/api/chat` endpoint as the main Mustasharak chatbot
- No attachments or quick actions (kept lightweight)
- Bilingual welcome message and placeholder text

**Context injection:**
```
[Tutor context: The user is studying the course "Foundations of Money". Currently viewing:
Lesson 1: What is money? (sections: What is money?)
Lesson 2: The difference between income and wealth (sections: ...)]

{user's actual question}
```

**Integration:** The course viewer page adds `paddingRight: 400px` to the content when the tutor is open (removed on screens < 900px for mobile).

---

## 16. Financial Calculators

### Calculator Architecture

Each calculator follows a three-file pattern:

1. **Logic** (`src/calculators/[name]Calculator.ts`) — pure functions: `Input` → `Result`
2. **PDF Report** (`src/calculators/[name]Report.ts`) — bilingual PDF generation with `EN`/`AR` label objects
3. **Page** (`src/app/(dashboard)/calculators/[name]/page.tsx`) — form + results UI

### Implemented Calculators

| Calculator | Route | Inputs | Outputs |
|-----------|-------|--------|---------|
| **Simple Loan** | `/calculators/simple-loan` | Amount, rate, period, start date | Monthly payment, total interest, total cost, amortization schedule |
| **Credit Card Payoff** | `/calculators/credit-card` | Balance, rate, min %, floor, fixed payment, intro period | Months to payoff, total interest, total paid, payment schedule |
| **Home Affordability** | `/calculators/home-affordability` | Income, debts, housing costs, funds, financing terms | Max home price, loan amount, down payment, closing costs |
| **Mortgage Payoff** | `/calculators/mortgage-payoff` | Amount, rate, term, payments/year, extra payment | Years saved, interest savings, amortization comparison |
| **Compound Savings** | `/calculators/compound-savings` | Years, initial investment, rate, deposit amount/frequency, extra annual | Future value, total invested, interest earned, year-by-year schedule |

### Supporting Calculators (used internally, no UI page)

| File | Purpose |
|------|---------|
| `loanCalculator.ts` | DTI + amortization-based affordability (`affordable` flag) |
| `affordabilityCalculator.ts` | Disposable income, expense/income ratio, DTI, overspending flag |
| `savingsRateCalculator.ts` | Savings rate, low-savings flag, months-to-goal |

### PDF Report System

**Shared base:** `src/calculators/pdfReportBase.ts`
- pdfmake initialization with font loading
- Arabic font support (Amiri) via `arabicPdfHelper.ts`
- Shared colors, table layouts, header/footer builders
- Helper functions: `fmtCurrency`, `fmtNum`, `fmtDate`, `lbl`, `rtl`

**Each report file:**
- Defines `EN` and `AR` label objects with all strings
- Generates landscape A4 PDF with navy header, input/summary tables, data grid
- Arabic reports use RTL layout, Arabic-Indic numerals, Amiri font
- Files download with locale-appropriate filenames (e.g., `تقرير_الادخار_المركب.pdf`)

---

## 17. Tools Directory

**File:** `src/app/(dashboard)/tools/page.tsx`

Displays all financial tools organized by category with country filtering.

### Categories
1. **Credit & Debt** — Loan calculator, credit card payoff
2. **Budgeting & Saving** — Compound savings, rent vs buy (placeholder), mortgage affordability, mortgage payoff, retirement planner (placeholder)
3. **Auto Loans** — Fixed vs variable (placeholder), leasing vs buying (placeholder)
4. **Tax & Zakat** — Country-specific tax calculators (placeholders)
5. **Social Security** — Country-specific social security calculators (placeholders)

### Country Filter
Tools are tagged with applicable countries: `all`, `jordan`, `uae`, `ksa`, `egypt`, `iraq`

### Tool Registration
Each tool in `TOOLS_DATA` has:
- `id`, `titleKey`, `titleDefault`, `descKey`, `descDefault`
- `icon`, `iconBg`, `iconColor`
- `category`, `countries[]`
- `href?` — if present, tool is clickable and links to calculator page; otherwise shows as placeholder

---

## 18. Insights & Rules Engine

### Rules: `src/rules/`
Financial rules that analyze user data and produce `RuleResult` objects:
- **Overspending** detection
- **Low savings rate** warning
- **High debt risk** alert

### Rule Runner: `src/application/ruleRunner.ts`
Executes rules against user financial context.

### Insights: `src/insights/`
- **`insight.ts`** — `Insight` type: `{ severity: 'info' | 'warning' | 'critical', titleKey, bodyKey, payload? }`
- **`mapper.ts`** — Converts `RuleResult` objects to translatable `Insight` objects
- **`messages.en.ts` / `messages.ar.ts`** — i18n keys for insight codes: `MONTHLY_OVERSPEND`, `LOW_SAVINGS_RATE`, `HIGH_DEBT_RISK`

### AI Integration
- `useAIInsights` hook (`src/ai/hooks/useAIInsights.ts`) provides insights to the dashboard
- `AIAlertBanner` and `AIGoalSuggestions` components display insights on the dashboard

---

## 19. Settings

**File:** `src/app/(dashboard)/settings/page.tsx`

### Three Tabs

**Profile:**
- First name, last name, phone number (editable)
- Email (read-only, from Supabase auth)
- Avatar placeholder with camera icon

**Security:**
- **Two-Factor Authentication** — Supabase MFA with TOTP enrollment, QR code, factor management
- **Change Password** — `supabase.auth.updateUser({ password })`
- **Active Sessions** — session list display with sign-out capability
- **Delete Account** — confirmation modal

**Preferences:**
- **Language** — English / Arabic
- **Currency** — from `SUPPORTED_CURRENCY_CODES` (19 currencies)
- **Theme** — Light / Dark
- **Accent Color** — multiple options from `ACCENT_COLOR_OPTIONS`
- **Notifications** — email, push, weekly summary toggles (local state)

Pending language/currency changes apply on Save; theme and accent apply immediately.

---

## 20. Onboarding

**File:** `src/app/onboarding/page.tsx`

4-step wizard for new users:

| Step | Content |
|------|---------|
| 1. Financial Goal | `buy_home`, `start_investing`, `plan_retirement`, `clear_debt`, `emergency_fund`, `something_else` + custom text |
| 2. User Segment | `individual`, `self_employed`, `sme` |
| 3. Topics of Interest | Multi-select: budgeting, saving, debt, investing, islamic_finance, business_cashflow |
| 4. Income Range | Under $1K through over $10K, or "prefer not to say" |

**Completion:** Calls `completeOnboarding({ segment, topics, preferredInsights: [] })` which persists to `useStore` and redirects to `/`.

**Skip:** Available at any step, calls `skipOnboarding()`.

**Guards:** Unauthenticated → `/login`; already onboarded → `/`.

---

## 21. Internationalization (i18n)

### Setup
- **Library:** `react-intl` via `IntlProviderWrapper`
- **Locale mapping:**
  - Arabic → `ar-JO-u-nu-arab` (Arabic-Indic numerals, Jordan conventions)
  - English → `en`
- **Default language:** Arabic (`ar`)

### Message Structure

**Location:** `src/messages/ar/` and `src/messages/en/`

Each locale has domain-specific modules flattened with prefixes:

| Module | Prefix | Examples |
|--------|--------|---------|
| `app.ts` | `app.*` | App name, tagline |
| `common.ts` | `common.*` | Shared labels |
| `nav.ts` | `nav.*` | Navigation items |
| `dashboard.ts` | `dashboard.*` | Dashboard labels |
| `transactions.ts` | `transactions.*` | Transaction labels |
| `categories.ts` | `categories.*` | Category names |
| `settings.ts` | `settings.*` | Settings labels |
| `auth.ts` | `auth.*` | Auth labels |
| `learn.ts` | `learn.*` | Learn section labels |
| `chat.ts` | `chat.*` | Chat labels |
| `tools.ts` | `tools.*` | Tools and calculator labels |
| `onboarding.ts` | `onboarding.*` | Onboarding labels |

### Usage Pattern
```typescript
const intl = useIntl();
const t = (key: string, defaultMessage: string) =>
  intl.formatMessage({ id: `tools.${key}`, defaultMessage });

// In JSX:
{t('compound_title', 'Compound Savings Calculator')}
```

### Additional i18n
- **Insight messages:** `src/insights/messages.en.ts` / `messages.ar.ts`
- **Translations helper:** `src/lib/translations.ts` (legacy, used by some components directly)
- **Course content:** Separate JSON files per locale (`_en.json` / `_ar.json`)

---

## 22. Styling & Theming

### CSS Architecture
- **Tailwind CSS v4** via `@import "tailwindcss"` in `globals.css`
- **CSS custom properties** for design tokens (colors, spacing, radii, shadows)
- **Design system classes** prefixed `ds-*` (e.g., `ds-card`, `ds-page`)
- **Light/dark themes** via `[data-theme="dark"]` selector on `<html>`

### Theme System
- Theme stored in Zustand (`useStore`) under `theme: 'light' | 'dark'`
- `ThemeProvider` applies `data-theme` attribute to `<html>`
- Root layout script reads `localStorage` before hydration to prevent flash

### Accent Colors
- User-selectable accent via `ACCENT_COLOR_OPTIONS` in constants
- Applied as `--accent-color` CSS variable
- Used throughout UI via `var(--color-accent-growth)` and related tokens

### Key CSS Variables
```css
--color-bg-primary, --color-bg-card, --color-bg-surface-1
--color-text-primary, --color-text-secondary, --color-text-muted
--color-accent-growth, --color-accent-growth-subtle
--color-success, --color-error, --color-warning
--color-border, --color-border-subtle, --color-border-input
--spacing-1 through --spacing-6
--radius-sm, --radius-md, --radius-lg, --radius-xl, --radius-pill
--shadow-sm, --shadow-md, --shadow-lg
```

### RTL Support
- Direction set on `<html>` element via `dir` attribute
- Components use `isRtl` checks for layout adjustments
- CSS logical properties where applicable (`paddingInlineStart`, `insetInlineEnd`)
- Course content wraps in `direction: isRtl ? 'rtl' : 'ltr'`

---

## 23. PWA Configuration

### next-pwa Setup: `next.config.ts`
- Service worker output: `public/`
- `register: true`, `skipWaiting: true`
- **Disabled in development** (`NODE_ENV === 'development'`)
- Service worker generated at build time

### Manifest: `public/manifest.json`
- **Name:** رَسمالَك — شريكك المالي الذكي (Arabic)
- **Display:** `standalone`
- **Orientation:** `portrait-primary`
- **Direction:** `rtl`
- **Theme color:** `#1B4D3E` (dark emerald)
- **Background:** `#F7F5F0` (warm off-white)
- **Icons:** 72px through 512px under `/icons/`
- **Shortcuts:**
  - Add Transaction → `/transactions/new`
  - Calculators → `/calculators`

### App Metadata: `src/app/layout.tsx`
- `manifest: "/manifest.json"`
- Apple web app capable metadata
- Viewport and theme-color meta tags

---

## 24. Known Considerations

### Database
- The `transactions` table is required but **not defined** in checked-in migrations — ensure it exists in your Supabase project
- The `financial_advice` table has a CHECK constraint on `target_metric` allowing only `'spending'` or `'savings'` (case-insensitive)

### Auth
- `AuthProvider` was modified to **not** aggressively sign out on transient session refresh failures — it logs a warning and lets Supabase auto-refresh retry
- Transaction add pages include session recovery logic for edge cases where Zustand loses the user but the session is still valid

### AI
- Default AI provider is **Gemini** (`gemini-2.5-flash`) — requires `GOOGLE_AI_API_KEY`
- Can switch to OpenAI via `src/ai/config.ts`
- Rate limited to ~20 requests/minute per user/IP
- Advice logging uses `console.warn` instead of `console.error` to avoid Next.js dev overlay

### PWA
- PWA is disabled in development mode
- Manifest shortcuts reference `/calculators` which has no index page — users land on individual calculator pages via `/tools`

### Learn
- Dashboard "Learning Progress" section shows static demo data — the Learn page uses real progress
- Some intermediate-level courses may not exist for all 10 subjects

### useStore vs Context Providers
- `useStore` (Zustand) has legacy transaction and auth fields that overlap with `TransactionProvider` and `authStore`
- Production flows use the Context providers (Supabase-backed) — the Zustand transaction data is legacy

### Supported Currencies
JOD, SAR, AED, KWD, QAR, BHD, OMR, EGP, MAD, DZD, TND, IQD, LBP, SYP, LYD, SDG, YER, USD, EUR

Default currency: `SAR` (Saudi Riyal)

---

*This document serves as a comprehensive handoff for the Rasmalak project. For feature-level details, see `docs/FEATURES.md`.*
