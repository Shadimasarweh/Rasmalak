# Rasmalak — Feature Summary

Rasmalak is a MENA-focused personal finance web app built with Next.js, Supabase, and AI (Gemini / OpenAI). It supports Arabic (RTL) and English, and is installable as a PWA.

---

## 1. Dashboard (`/`)

- Personalized greeting (time-of-day aware)
- Total balance overview
- Monthly cash flow breakdown (income vs expenses)
- Top savings goal with progress bar
- Weekly spending analysis
- Active budgets summary
- Learning progress snapshot
- Recent transactions table
- AI-generated alerts and goal suggestions

---

## 2. Transactions

### Transaction List (`/transactions`)
- All transactions with date, category, description, type, and amount
- Total income, total expenses, and net balance cards
- Delete with confirmation modal
- True empty state when no transactions exist

### Add Expense (`/transactions/new`)
- Amount input with locale-aware currency display
- 7 expense categories: Food, Transport, Shopping, Housing, Health, Entertainment, Bills
- Date picker and optional description
- Auth-gated submit button with session recovery

### Add Income (`/transactions/new/income`)
- Same flow as expense with income-specific categories
- 7 income categories: Salary, Freelance, Investments, Gifts, Rental, Refunds, Bonus

---

## 3. Budgets (`/budgets`)

- Set an overall monthly spending limit
- Per-category budget limits
- Visual progress bars showing spending vs budget
- Overflow warnings when nearing or exceeding limits
- Save budgets to Supabase

---

## 4. Savings Goals (`/goals`)

- Create goals with name, target amount, deadline, and color
- Add funds to goals incrementally
- Progress bar and percentage tracking
- Overall progress across all goals
- Delete goals with confirmation
- Goal-achieved celebration state

---

## 5. AI Chat — Mustasharak (`/chat`)

- Conversational AI financial advisor
- Context-aware responses using transaction, budget, and goal data
- Quick action buttons for common queries
- File attachments (images, PDFs, text files)
- Suggested follow-up actions
- Powered by Gemini or OpenAI (configurable)

### AI Engine (under the hood)
- **Orchestrator pipeline**: intent classification → agent selection → context injection → deterministic layer → LLM call → validation → memory write
- **Intent classifier**: rule-based, covers spending analysis, budgeting, savings, forecasting, and more
- **Agents**: chat, insight, recommendation, profile, policy
- **Deterministic layer**: financial signals, health scoring, projections
- **Validation pipeline**: schema, tone/risk, policy, and numerical checks
- **Memory service**: reads/writes user financial state to Supabase
- **Audit logging**: every piece of advice is logged to `financial_advice` table

### AI Insights (automatic)
- Spending alerts (overspending, category spikes, recurring charges, low balance predictions)
- Goal suggestions (new goals, adjustments, acceleration opportunities)
- Displayed as banners on the dashboard

---

## 6. Financial Calculators

### Implemented
| Calculator | Route |
|-----------|-------|
| Loan Interest Rate | `/calculators/simple-loan` |
| Credit Card Payoff | `/calculators/credit-card` |
| Home Affordability | `/calculators/home-affordability` |
| Mortgage Payoff | `/calculators/mortgage-payoff` |

### Listed (coming soon)
- Compound Savings
- Rent vs Buy
- Retirement Planner
- Fixed vs Variable Auto Loan
- Leasing vs Buying
- Net Worth Tracker

### Country-Specific Tools
- **Jordan**: Income Tax, Social Security
- **UAE**: Gratuity Calculator
- **KSA**: Zakat, End of Service
- **Egypt**: Income Tax, Social Security
- **Iraq**: Income Tax, Social Security

---

## 7. Learn (`/learn`)

### Tabs
- **Home** — Course cards organized by level (Beginner, Intermediate, Advanced)
- **Articles** — Article cards (coming soon)
- **Videos** — Video cards (coming soon)
- **Topics & Skills** — 12 financial topics (coming soon)
- **Achievements** — 8 badge slots (coming soon)

### Courses (30 total, in English and Arabic)
- Foundations of Money
- Budgeting & Money Management
- Saving & Emergency Planning
- Debt and Credit
- Investment Fundamentals
- Insurance Literacy
- Taxes and Legal
- SME Financial Management
- Islamic Finance Basics
- Life Stage Financial Planning

Each course available in beginner, intermediate, and advanced levels.

### Course Viewer (`/learn/courses/[courseId]`)
- Sidebar navigation with sections
- Block types: Text, Key Insight, Example, Comparison, Checkpoint Quiz, Bullet List, Action Prompt
- Progress tracking (stored locally and synced to Supabase)

---

## 8. Community (`/community`)

- Available to SME and self-employed users
- Post types: Question, Collaboration, Experience Sharing, Poll
- Filter and browse posts
- Create new posts

---

## 9. Financial Tools Directory (`/tools`)

- Browse financial tools filtered by country and category
- Tool cards with descriptions and links
- Covers Jordan, UAE, KSA, Egypt, Iraq

---

## 10. Settings (`/settings`)

### Profile Tab
- First name, last name, phone number
- Email (read-only)
- Avatar placeholder

### Security Tab
- **Two-Factor Authentication** — TOTP setup with QR code, verification, and recovery codes
- **Change Password** — Current + new password with validation
- **Active Sessions** — View and sign out individual or all sessions
- **Danger Zone** — Delete account (requires typing DELETE + password)

### Preferences Tab
- **Language** — English / Arabic (العربية)
- **Currency** — Multiple supported currencies
- **Theme** — Light / Dark mode
- **Accent Color** — Customizable accent via color palette
- **Notifications** — Email alerts, push notifications, weekly summary toggles

---

## 11. Authentication

| Feature | Details |
|---------|---------|
| Login | Email + password via Supabase Auth |
| Signup | Name, email, password, terms agreement |
| Forgot Password | Email-based reset link via Supabase |
| Reset Password | New password form (accessed from email link) |
| OAuth | Google and Apple sign-in buttons (UI ready) |
| Session Management | Supabase Auth with auto-refresh, persisted in localStorage |
| Auth Guard | Protected routes redirect unauthenticated users to `/login` |

---

## 12. Onboarding (`/onboarding`)

4-step flow for new users after signup:

1. **Financial Goal** — Buy a home, invest, retire early, clear debt, build emergency fund, or other
2. **User Segment** — Individual, Self-employed, or SME
3. **Topics of Interest** — Budgeting, Saving, Debt Management, Investing, Islamic Finance, Business Cash Flow
4. **Income Range** — Under $1K to Over $10K, or prefer not to say

- Skip option available
- Data stored in app state for personalization

---

## 13. Internationalization (i18n)

- **Languages**: Arabic (ar) and English (en)
- **RTL Support**: Full right-to-left layout for Arabic
- **Translation System**: `react-intl` + custom translation files
- **Locale-Aware**: Numbers, dates, and currencies formatted per locale
- **Courses**: Separate content files per language
- **Language Switcher**: Available on login, signup, forgot-password, reset-password, and in settings

---

## 14. Theming

- Light and Dark modes
- Customizable accent color
- Theme toggle accessible from auth pages and settings
- Persisted in localStorage

---

## 15. PWA (Progressive Web App)

- Installable on mobile and desktop
- Service worker via `next-pwa`
- App manifest with Arabic name, standalone display, and icons (72px–512px)
- Home screen shortcuts: Add Transaction, Calculators
- Disabled in development mode

---

## 16. Data & Backend

- **Supabase** — Auth, database (transactions, budgets, goals, financial_advice, ai_audit_log, course_progress, user_semantic_state), Row Level Security
- **Zustand** — Client-side state management with localStorage persistence
- **Migrations** — SQL migrations for schema changes (in `supabase/migrations/`)
