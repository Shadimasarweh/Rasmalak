# CLAUDE.md — Rasmalak

This file is the primary reference for any AI assistant working on the Rasmalak codebase. Read it fully before making any changes.

---

## What This Project Is

**Rasmalak** (رَسمالَك — "Your Capital") is a bilingual, Arabic-first personal finance PWA for the MENA region. It covers financial literacy education, expense tracking, budgeting, savings goals, AI-powered financial advice, and regional financial tools. Arabic is the default language. RTL is the default layout direction.

Deployed at: `rasmalak.vercel.app` (production, `main` branch only)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 — App Router, webpack mode |
| UI | React 19, TypeScript 5 |
| Styling | Tailwind CSS 4 via `@tailwindcss/postcss` |
| Backend / Auth / DB | Supabase (Auth + PostgreSQL + RLS) |
| Client state | Zustand 5 |
| i18n | react-intl 8 |
| Charts | Recharts 3 |
| PDF | pdfmake 0.3 |
| Icons | lucide-react |
| Dates | date-fns 4 |
| PWA | next-pwa |
| AI default | Google Gemini `gemini-2.5-flash` via REST |
| AI alternate | OpenAI `gpt-4o` / `gpt-4o-mini` via REST |

---

## Project Structure

```
src/
├── app/
│   ├── (dashboard)/          # All authenticated routes
│   │   ├── layout.tsx        # AuthGuard + Sidebar + Header shell
│   │   ├── page.tsx          # Dashboard
│   │   ├── transactions/
│   │   ├── budgets/
│   │   ├── goals/
│   │   ├── chat/             # Mustasharak AI
│   │   ├── learn/            # /learn + /learn/courses/[courseId]
│   │   ├── tools/
│   │   ├── calculators/      # 5 calculators
│   │   ├── settings/
│   │   └── community/        # Placeholder
│   ├── login/ signup/ forgot-password/ reset-password/ onboarding/
│   ├── auth/callback/
│   ├── api/chat/             # AI endpoint
│   ├── globals.css           # CSS variables, ds-* classes, theme tokens
│   └── layout.tsx            # Root: lang/dir, IntlProviderWrapper, ThemeProvider
│
├── ai/                       # All AI logic lives here
│   ├── orchestrator.ts       # Single entry point for all LLM calls
│   ├── orchestrator/         # Intent classifier, prompt composer, types
│   ├── agents/               # chat, insight, profile, recommendation, policy
│   ├── providers/            # gemini.ts, openai.ts
│   ├── validation/           # Schema + tone/risk + numerical validation, audit logger
│   ├── memory/               # Semantic memory service
│   ├── deterministic/        # Pure-math finance: signals, health score, projections
│   ├── context/              # Context selector, token budgeting
│   └── config.ts             # Provider selection, feature flags, safety settings
│
├── components/
│   ├── courses/              # CourseContent, CourseHero, CourseSidebar, CourseTutorChat
│   ├── ui/                   # Skeleton, Toast
│   ├── Header.tsx, Sidebar.tsx, AuthGuard.tsx
│   ├── QuickAddFAB.tsx, NotificationPanel.tsx
│   └── ThemeProvider.tsx, IntlProviderWrapper.tsx
│
├── data/courses/             # 60+ static JSON course files (10 subjects × 3 levels × 2 locales)
│   └── index.ts              # getCourse(), getAllCourses(), getCourseNumber(), SUBJECT_ORDER
│
├── messages/                 # i18n translation files
│   ├── en/                   # app, auth, categories, chat, common, dashboard, learn, nav, onboarding, settings, tools, transactions
│   └── ar/                   # same modules in Arabic
│
├── store/
│   ├── transactionStore.tsx  # Supabase-backed transaction state
│   ├── budgetStore.tsx, goalsStore.tsx, authStore.ts, notificationStore.ts
│   └── index.ts              # Persisted store: language, currency, theme, accent, onboarding
│
├── calculators/              # Pure logic + PDF report files (see Calculator Pattern below)
├── lib/                      # supabaseClient.ts, healthScore.ts, constants, utils
├── types/                    # index.ts (core types), course.ts (course schema)
└── supabase/migrations/      # SQL migrations 001–005
```

---

## Core Conventions — Read Before Touching Anything

### 1. Arabic-first, RTL-first
- Arabic is the **default language**. Every user-facing string must have an Arabic translation.
- RTL is the default layout direction. Root `<html>` defaults to `lang="ar" dir="rtl"`.
- Use logical CSS properties: `padding-inline-start` not `padding-left`, `margin-inline-end` not `margin-right`.
- Arabic-Indic numerals (`٠١٢٣٤٥٦٧٨٩`) must be used in Arabic UI via the `ar-JO-u-nu-arab` locale setting.
- **Always test UI changes in both LTR and RTL before marking work done.**

### 2. i18n keys by domain
- All user-facing strings use `react-intl` with ICU message syntax.
- Add keys to the appropriate domain file: `src/messages/{en,ar}/<domain>.ts`
- Course content is **not** in the i18n system — it lives as separate JSON files per course per locale.

### 3. Never call LLM providers directly from components
- All AI interactions go through `src/ai/orchestrator.ts`. This is non-negotiable.
- Never import `gemini.ts` or `openai.ts` directly from a component or page.
- To switch providers, edit `src/ai/config.ts` only.

### 4. Supabase is the source of truth
- All user data (transactions, budgets, goals, course progress, auth) lives in Supabase with Row Level Security.
- Zustand stores are client-side caches, not the source of truth.
- The persisted Zustand store (`rasmalak-storage` in localStorage) holds UI preferences only: language, currency, theme, accent, onboarding state.

### 5. Course content is static JSON
- Courses are not in the database. They are static JSON files in `src/data/courses/`.
- Every new course file must be imported and registered in `src/data/courses/index.ts`.
- Course ID format: `{subject_slug}_{level}_{locale}` e.g. `foundations_of_money_intermediate_ar`
- `SUBJECT_ORDER` in `index.ts` defines canonical ordering — do not reorder it.

### 6. Calculator three-part pattern
Every calculator requires exactly three files:
1. `src/calculators/<n>Calculator.ts` — pure logic, typed input/output, no side effects
2. `src/calculators/<n>Report.ts` — bilingual PDF via pdfmake (EN + AR objects, Amiri font for Arabic)
3. `src/app/(dashboard)/calculators/<n>/page.tsx` — form, validation, results, download button

### 7. Comments policy
Comments must explain non-obvious **intent or reasoning** only. Do not narrate what the code does.

---

## Data Models

```typescript
// Core types — src/types/index.ts
Transaction: { id, type: 'income'|'expense', amount, currency, category, description, date, createdAt, updatedAt }
Category:    { id, name, nameAr, icon, color, type }
Budget:      { id, categoryId, amount, spent, period: 'weekly'|'monthly'|'yearly', startDate, endDate }
User:        { id, email, name, currency, language, createdAt }
AuthUser:    { id, email, name, phone? }

// Course types — src/types/course.ts
CourseData:  { courseId, locale, title, description, level, estimatedTime, lessons[] }
Lesson:      { lessonId, title, order, sections[] }
Section:     { id, title, blocks[] }
Block:       'p' | 'ul' | 'key_insight' | 'example' | 'comparison' | 'action_prompt' | 'checkpoint'
```

### Supabase Tables
- `transactions`, `budgets`, `savings_goals` — user financial data, all RLS-protected
- `course_progress` — per-user section completion
- `financial_advice` — logged AI advice (`target_metric` check constraint: `spending/savings`)
- `ai_audit_log` — full audit trail of AI interactions
- `user_semantic_state` — AI memory/context persistence per user

---

## AI Architecture

The AI pipeline in `src/ai/` is fully provider-agnostic:

```
User message
  → orchestrator.ts (single entry point)
    → intent classifier
    → agent selection (chat / insight / profile / recommendation / policy)
    → deterministic finance layer (pure math — no LLM)
    → context selector + token budgeting
    → prompt composer
    → single LLM call (Gemini or OpenAI)
    → output validation (schema + tone/risk + numerical, 1 retry)
    → memory update
    → audit log
  → response to client
```

**Safety rules enforced at the validation layer:**
- Blocked topics: specific stock picks, legal advice, tax evasion
- Max input length enforced
- Rate limit: 20 requests/minute per user
- All advice logged to `financial_advice` and `ai_audit_log`

---

## Design System

CSS variables and `ds-*` utility classes are defined in `src/app/globals.css`. Light/dark themes switch via `data-theme` on the root element.

**Canonical design tokens:**

| Token | Value | Usage |
|---|---|---|
| `--color-bg-page` | `#F5F0EB` | Page background (cream) |
| `--color-bg-card` | `#FFFFFF` | Standard card surface |
| `--color-bg-card-dark` | `#0F1914` | Dark glass card surface |
| `--color-primary` | `#2D6A4F` | Buttons, active states, progress fills |
| `--color-primary-light` | `#F0F7F4` | Tinted backgrounds, hover states |
| `--color-accent-gold` | `#D97706` | Achievements and badges only |

**Purple, violet, and indigo are not part of the design system. Do not introduce them.**

---

## Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=        # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # Supabase anonymous key
GOOGLE_AI_API_KEY=               # Gemini (default provider)
OPENAI_API_KEY=                  # OpenAI (alternate provider)
```

---

## Commands

```bash
npm run dev      # Development server
npm run build    # Production build
npm run start    # Production server
npm run lint     # ESLint
```

---

## Branch and Deployment Rules

- `main` is the only branch deployed to Vercel. Do not push unreviewed changes to `main`.
- All feature work goes on a named branch (e.g. `redesign`, `feature/sme-tools`).
- Open a Pull Request against `main` and get approval before merging.

---

## Pages and Feature Inventory

| Route | Description |
|---|---|
| `/` | Dashboard — balance, cash flow, budgets, AI insights, health score |
| `/transactions` | Full CRUD income/expense with filters and search |
| `/budgets` | Monthly budget + per-category limits |
| `/goals` | Savings goals tracking |
| `/chat` | Mustasharak — full conversational AI |
| `/learn` | Course library — 30 courses across 3 levels |
| `/learn/courses/[courseId]` | Course viewer with progress tracking and tutor chat |
| `/tools` | Country-specific financial tools and resources |
| `/calculators/simple-loan` | Loan calculator + bilingual PDF |
| `/calculators/credit-card` | Credit card payoff calculator + bilingual PDF |
| `/calculators/home-affordability` | Home affordability calculator + bilingual PDF |
| `/calculators/mortgage-payoff` | Mortgage payoff calculator + bilingual PDF |
| `/calculators/compound-savings` | Compound savings calculator + bilingual PDF |
| `/settings` | Profile, currency, language, theme, security, notifications |
| `/onboarding` | 4-step wizard: goals → segment → topics → income |
| `/community` | Placeholder — not yet built |

---

## SME Section

> 🚧 To be added. The SME (Small & Medium Enterprise) feature set is a major planned expansion targeting business owners across the MENA region. This section will document all SME-specific routes, data models, and conventions once the feature scope is finalized. Do not build SME features without consulting this section first.
