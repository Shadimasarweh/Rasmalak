# Rasmalak Project Brief

This document describes the Rasmalak project in full so that an AI assistant can generate an effective `CLAUDE.md` (or equivalent project guidance file) for the repository.

---

## 1. Product Vision

**Rasmalak** (رَسمالَك — Arabic for "Your Capital") is a bilingual, Arabic-first personal finance web application built for the MENA region. It is a Progressive Web App (PWA) that works on mobile and desktop, designed to be installable on phones and tablets.

**Target audience:** Arabic-speaking individuals and small-to-medium enterprise (SME) owners across Jordan, UAE, Saudi Arabia, Egypt, Iraq, and other MENA countries.

**Core proposition:** Provide financial literacy education, expense tracking, budgeting, savings goals, AI-powered financial advice, and regional financial tools — all in Arabic (with full English support) and with right-to-left (RTL) layout as the default.

---

## 2. Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router, webpack mode) | 16.1.1 |
| UI | React | 19.2.3 |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS (via `@tailwindcss/postcss`) | 4.x |
| Backend / Auth / DB | Supabase (Auth + PostgreSQL + Row Level Security) | 2.93.1 |
| Client state | Zustand | 5.0.9 |
| Internationalization | react-intl | 8.1.1 |
| Charts | Recharts | 3.6.0 |
| PDF generation | pdfmake | 0.3.3 |
| Icons | lucide-react | 0.562.0 |
| Date utilities | date-fns | 4.1.0 |
| PWA | next-pwa | 5.6.0 |
| AI (default) | Google Gemini (`gemini-2.5-flash`) | REST API |
| AI (alternate) | OpenAI (`gpt-4o` / `gpt-4o-mini`) | REST API |

---

## 3. Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── (dashboard)/              # Route group: all authenticated pages
│   │   ├── layout.tsx            # AuthGuard + Sidebar + Header + providers shell
│   │   ├── page.tsx              # Dashboard (/)
│   │   ├── transactions/         # /transactions, /transactions/new, /transactions/new/income
│   │   ├── budgets/              # /budgets
│   │   ├── goals/                # /goals
│   │   ├── chat/                 # /chat (Mustasharak AI)
│   │   ├── learn/                # /learn, /learn/courses/[courseId]
│   │   ├── tools/                # /tools
│   │   ├── calculators/          # /calculators/simple-loan, credit-card, home-affordability, mortgage-payoff, compound-savings
│   │   ├── settings/             # /settings
│   │   └── community/            # /community (placeholder)
│   ├── login/                    # /login
│   ├── signup/                   # /signup
│   ├── forgot-password/          # /forgot-password
│   ├── reset-password/           # /reset-password
│   ├── onboarding/               # /onboarding (4-step wizard)
│   ├── auth/callback/            # OAuth callback handler
│   ├── api/chat/                 # POST /api/chat — AI endpoint
│   ├── globals.css               # Design system: CSS variables, ds-* classes, theme tokens
│   └── layout.tsx                # Root layout: html lang/dir, IntlProviderWrapper, ThemeProvider
│
├── ai/                           # AI orchestration layer
│   ├── orchestrator.ts           # Central pipeline
│   ├── orchestrator/             # Intent classifier, prompt composer, types
│   ├── agents/                   # Specialized agents: chat, insight, profile, recommendation, policy
│   ├── providers/                # LLM providers: gemini.ts, openai.ts
│   ├── validation/               # Output validation, schema, tone/risk, audit logger
│   ├── memory/                   # Semantic memory: service, update rules, types
│   ├── deterministic/            # Pure-math finance: signals, health score, projections, advisory
│   ├── context/                  # Context selector, token budgeting, slice types
│   ├── config.ts                 # Provider/model selection, feature flags, safety settings
│   └── types.ts                  # AIMessage, AIResponse, etc.
│
├── components/                   # Shared React components
│   ├── courses/                  # CourseContent, CourseHero, CourseSidebar, CourseSection, CourseTutorChat
│   ├── ui/                       # Skeleton, Toast
│   ├── Header.tsx, Sidebar.tsx
│   ├── AuthGuard.tsx
│   ├── QuickAddFAB.tsx
│   ├── NotificationPanel.tsx
│   ├── ThemeProvider.tsx
│   └── IntlProviderWrapper.tsx
│
├── data/courses/                 # 60+ static JSON course files
│   ├── index.ts                  # Course registry: imports, getCourse(), getAllCourses(), getCourseNumber()
│   ├── *_en.json / *_ar.json     # Beginner courses (10 subjects × 2 locales)
│   ├── *_intermediate_*.json     # Intermediate courses (10 subjects × 2 locales)
│   └── *_advanced_*.json         # Advanced courses (10 subjects × 2 locales)
│
├── messages/                     # i18n translation modules
│   ├── en/                       # English: app, auth, categories, chat, common, dashboard, learn, nav, onboarding, settings, tools, transactions
│   ├── ar/                       # Arabic: same modules
│   └── index.ts                  # Aggregator
│
├── store/                        # Zustand stores
│   ├── transactionStore.tsx      # Transaction type + store + TransactionProvider (Supabase-backed)
│   ├── budgetStore.tsx           # BudgetProvider
│   ├── goalsStore.tsx            # GoalsProvider
│   ├── authStore.ts              # Auth session state
│   ├── notificationStore.ts      # Notification state
│   └── index.ts                  # Main persisted store (language, currency, theme, accent, onboarding)
│
├── providers/                    # React context providers
│   └── AuthProvider.tsx          # Supabase session → authStore sync
│
├── calculators/                  # Calculator logic + PDF reports
│   ├── compoundSavingsCalculator.ts
│   └── compoundSavingsReport.ts
│
├── lib/                          # Utilities
│   ├── supabaseClient.ts         # Supabase browser client
│   ├── healthScore.ts            # Financial health score computation
│   ├── constants.ts, currencies.ts, categories.ts
│   └── utils.ts
│
├── types/                        # Shared TypeScript types
│   ├── index.ts                  # Transaction, Category, Budget, User, AuthUser, calculators, charts
│   └── course.ts                 # CourseData, Lesson, Section, Block (union type)
│
└── supabase/migrations/          # SQL migration files (001–005)

docs/
├── FEATURES.md                   # Feature summary
├── HANDOFF.md                    # Full architecture handoff document
├── qa-checklist.md
└── arabic-style-guide.md
```

---

## 4. Key Features

### Financial Management
- **Dashboard**: Greeting (time-of-day), balance overview, income/expenses, savings rate, cash flow chart, weekly spending breakdown, budget status cards, top savings goal, recent transactions, AI-generated alerts/insights, learning progress snapshot, financial health score.
- **Transactions**: Full CRUD for income and expenses. Category-based with bilingual names. Search, date-range filters. Fake demo data for visual testing when no real transactions exist.
- **Budgets**: Overall monthly budget + per-category limits. Auto-detected recurring charges.
- **Savings Goals**: Create goals with target amount, deadline, and color. Add funds, track progress. Overall progress aggregation.

### AI (Mustasharak — "Your Advisor")
- **Chat**: Full conversational AI at `/chat` with message history, suggested actions, quick actions, file/image attachment support.
- **Course Tutor**: Embedded chatbot inside each course viewer page, uses the same `/api/chat` endpoint but injects course context (title + current lessons) as a prefix.
- **Insights**: AI-generated alerts and spending pattern analysis on the dashboard.
- **Orchestrator pipeline**: Intent classification → agent selection → deterministic finance layer → context selection with token budgeting → prompt composition → single LLM call → output validation (schema + tone/risk + numerical) → memory update → audit logging → advice logging.

### Learning Platform
- **10 course subjects**: Foundations of Money, Budgeting & Money Management, Saving & Emergency Planning, Debt & Credit, Investment Fundamentals, Insurance Literacy, Taxes & Legal, SME Financial Management, Islamic Finance, Life Stage Financial Planning.
- **3 levels per subject**: Beginner, Intermediate, Advanced.
- **2 locales**: English and Arabic (separate JSON files per course per locale).
- **Course viewer**: Sidebar navigation, section-by-section progress tracking, lesson numbering based on `getCourseNumber()` (course index in canonical `SUBJECT_ORDER`).
- **Content blocks**: Paragraphs, bullet lists, key insights, examples (table), comparisons (two-column), action prompts, checkpoints.

### Calculators
- Simple Loan, Credit Card Payoff, Home Affordability, Mortgage Payoff, Compound Savings.
- Each calculator follows a three-part pattern: logic file (`src/calculators/`) + PDF report file + page component.
- PDF reports are bilingual (EN/AR) with proper fonts (Amiri for Arabic).

### Tools Directory
- Country-specific financial tools and resources.
- Category filters, links to calculators.

### Settings
- Profile (name, email, phone), currency selection, language selection, theme (light/dark), accent color.
- Security: password change, two-factor authentication (TOTP), active sessions management, account deletion with confirmation.
- Notifications: email, push, weekly summary toggles.

### Onboarding
- 4-step wizard: financial goals → user segment (individual/self-employed/SME) → topics of interest → income range.
- Skippable.

### Authentication
- Supabase Auth with email/password and OAuth.
- `AuthProvider` syncs Supabase session to Zustand `authStore`.
- `AuthGuard` component protects all `(dashboard)/` routes; redirects unauthenticated users to `/login`.
- Session recovery logic in transaction pages if Zustand loses the user but Supabase session is still valid.

---

## 5. Architecture Patterns and Conventions

### Internationalization (i18n)
- **Default language is Arabic** with full RTL support. English is fully supported as an alternative.
- `react-intl` with ICU message syntax for plurals, selects, and formatted numbers.
- Arabic locale uses `ar-JO-u-nu-arab` for Arabic-Indic numeral display (٠١٢٣...).
- Root `<html>` tag defaults to `lang="ar" dir="rtl"`; a client script reads the persisted language from `localStorage` key `rasmalak-storage` and updates `lang`/`dir` before first paint.
- Translation files are flat key-value modules in `src/messages/en/` and `src/messages/ar/`, organized by domain (dashboard, transactions, auth, learn, chat, tools, etc.).
- Course content is stored as separate JSON files per locale — not in the i18n system.

### AI Architecture
- The AI layer lives entirely in `src/ai/` and is provider-agnostic.
- The orchestrator (`orchestrator.ts`) is the single entry point — no component calls LLM providers directly.
- Agents (`chatAgent`, `insightAgent`, `profileAgent`, `recommendationAgent`, `policyAgent`) define their own system prompts, required context slices, and response schemas.
- A deterministic finance layer (`src/ai/deterministic/`) computes signals, health scores, projections, and advisory state using pure math — no LLM involved. These outputs feed into agent prompts for grounding.
- Safety: blocked topics (specific stock picks, legal advice, tax evasion), max input length, rate limiting (20 req/min), output validation pipeline with one retry.
- Default provider is Gemini (`gemini-2.5-flash`); switchable to OpenAI in `src/ai/config.ts`.

### Data Flow
- **Supabase** is the source of truth for transactions, budgets, goals, course progress, and auth.
- **Zustand stores** with React Context providers wrap Supabase data for components. The main `useStore` (persisted to `localStorage` key `rasmalak-storage`) holds UI preferences: language, currency, theme, accent color, onboarding state.
- **Course data** is static JSON imported at build time via `src/data/courses/index.ts`.

### Calculator Pattern
Each calculator consists of three files:
1. `src/calculators/<name>Calculator.ts` — pure calculation logic, typed input/output.
2. `src/calculators/<name>Report.ts` — PDF generation with bilingual labels (EN object + AR object), uses `pdfmake`.
3. `src/app/(dashboard)/calculators/<name>/page.tsx` — React page with form, validation, results display, and "Download Report" button.

### Design System
- CSS variables defined in `src/app/globals.css` with `data-theme` attribute for light/dark switching.
- `ds-*` utility classes for consistent spacing, typography, and component styling.
- Accent colors configurable via CSS variables.

### Course System
- 10 subjects defined in `SUBJECT_ORDER` array in `src/data/courses/index.ts`.
- `getCourseNumber(courseId)` strips locale and level suffixes to find the subject index (1-based).
- Course IDs follow the pattern: `{subject_slug}_{level}_{locale}` (e.g., `foundations_of_money_intermediate_ar`).
- `getCourse(id)`, `getAllCourses(locale)`, `getCourseIdForLocale(baseId, locale)` are the main lookup functions.

---

## 6. Data Models

### Core TypeScript Types (`src/types/index.ts`)
- `Transaction`: id, type (income/expense), amount, currency, category, description, date, createdAt, updatedAt.
- `Category`: id, name, nameAr, icon, color, type.
- `Budget`: id, categoryId, amount, spent, period (weekly/monthly/yearly), startDate, endDate.
- `User`: id, email, name, currency, language, createdAt.
- `AuthUser`: id, email, name, phone (optional).

### Course Types (`src/types/course.ts`)
- `CourseData`: courseId, locale, title, description, level, estimatedTime, lessons[].
- `Lesson`: lessonId, title, order, sections[].
- `Section`: id, title, blocks[].
- `Block`: Union type — `p` (paragraph), `ul` (list), `key_insight`, `example` (table rows), `comparison` (two columns), `action_prompt`, `checkpoint`.

### Supabase Tables
- `transactions`, `budgets`, `savings_goals` — user financial data with RLS.
- `financial_advice` — logged AI advice with `target_metric` check constraint (spending/savings).
- `ai_audit_log` — audit trail for AI interactions.
- `user_semantic_state` — AI memory/context persistence.
- `course_progress` — per-user section completion tracking.

---

## 7. Environment Variables

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=         # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=    # Supabase anonymous/public key

# AI Providers
GOOGLE_AI_API_KEY=                # Google Gemini API key (default provider)
OPENAI_API_KEY=                   # OpenAI API key (alternate provider)
```

---

## 8. Commands

```bash
npm run dev        # Start development server (Next.js with webpack)
npm run build      # Production build
npm run start      # Start production server
npm run lint       # Run ESLint
```

---

## 9. Key Conventions for Contributors

1. **Arabic-first**: Arabic is the default language. All user-facing strings must have Arabic translations. Placeholder numbers in Arabic UI should use Arabic-Indic numerals (٠١٢٣٤٥٦٧٨٩).
2. **RTL-aware**: Use logical CSS properties (`padding-inline-start` not `padding-left`). Test all UI changes in both LTR and RTL.
3. **No direct LLM calls**: All AI interactions go through the orchestrator. Never import providers directly in components.
4. **Course content as JSON**: Courses are static data, not database content. Each course is a JSON file with a specific schema. The course registry in `index.ts` must import and register every course file.
5. **i18n keys by domain**: Add new translation keys to the appropriate domain file (e.g., dashboard keys go in `src/messages/{en,ar}/dashboard.ts`).
6. **Supabase for persistence**: All user data flows through Supabase with RLS. Zustand stores are client-side caches/providers, not the source of truth.
7. **Calculator three-part pattern**: New calculators need a logic file, a PDF report file, and a page component.
8. **No comments that narrate code**: Comments should explain non-obvious intent, not describe what the code does.
