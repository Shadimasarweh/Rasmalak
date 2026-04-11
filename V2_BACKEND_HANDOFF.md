# Rasmalak CRM V2 — Backend Developer Handoff

> **Date:** April 11, 2026
> **Branch:** `crm` (not pushed yet — push pending your review)
> **Status:** All 4 waves of V2 code complete. Needs infrastructure wiring, database migrations, and production hardening before go-live.

---

## What's Built (Code Complete)

### Wave 1 — Revenue & Integrations (61 files, commit 02bf4d0)
Billing (Stripe), 7 integration adapters (Google Calendar, Gmail, Microsoft Calendar, Teams, Outlook, Slack, Zoom), privacy layer, email tracking, 4 cron jobs, signup landing page.

### Wave 2 — Automation & Intelligence (~60 files, uncommitted)
- Automation engine (trigger → condition → action → log)
- 20 workflow templates (5 MENA-specific + 15 sales)
- Visual workflow builder UI (7 components)
- AI deal scoring agent + report generator agent
- WhatsApp Business adapter + conversation view
- Lead scoring (rule-based) + lead routing (round-robin, territory, skill)
- CRM dashboard page

### Wave 3 — Platform & Ecosystem (~30 files, uncommitted)
- Public REST API with key auth, rate limiting, CRUD for all entities
- API auth middleware with SHA-256 key hashing + rate limit headers
- OpenAPI 3.0 spec endpoint
- Zapier integration definitions (triggers + actions)
- Document management (template engine, merge fields, quote builder)

### Wave 4 — Vertical Expansion (~10 files, uncommitted)
- 3 vertical templates (real estate, healthcare, retail/distribution)
- Template installer + browser + preview + install wizard UI

---

## What You Need To Do

### Priority 1 — Database (Blocks Everything)

**Run migrations 017-023 against Supabase:**

```
supabase/migrations/017_automation.sql    — crm_workflows, crm_workflow_log, crm_workflow_templates
supabase/migrations/018_deal_scoring.sql  — ALTER crm_deals (ai_score columns)
supabase/migrations/019_whatsapp.sql      — whatsapp_accounts, templates, conversations
supabase/migrations/020_lead_scoring.sql  — scoring/routing rules, ALTER crm_contacts (lead_score)
supabase/migrations/021_api.sql           — api_keys, webhook_subscriptions, request_log
supabase/migrations/022_documents.sql     — document_templates, documents, versions
supabase/migrations/023_verticals.sql     — crm_vertical_templates
```

All migrations use `is_org_member()` and `get_org_role()` RLS helpers from V1 migration 012. Verify these functions exist before running.

**Create 4 Postgres RPC functions** (not in migrations — need to be added):

```sql
-- 1. Atomic workflow run_count increment
CREATE OR REPLACE FUNCTION increment_workflow_run(wf_id UUID)
RETURNS void AS $$
  UPDATE crm_workflows SET run_count = run_count + 1, last_run_at = now() WHERE id = wf_id;
$$ LANGUAGE sql;

-- 2. Atomic tag append (prevents read-modify-write race)
CREATE OR REPLACE FUNCTION array_append_unique(table_name TEXT, row_id UUID, tag TEXT)
RETURNS void AS $$
  -- Implementation depends on which tables need it (crm_contacts, crm_deals)
  -- Use: UPDATE crm_contacts SET tags = array_append(tags, tag) WHERE id = row_id AND NOT (tag = ANY(tags));
$$ LANGUAGE sql;

-- 3. Atomic tag remove
CREATE OR REPLACE FUNCTION array_remove_tag(table_name TEXT, row_id UUID, tag TEXT)
RETURNS void AS $$
  UPDATE crm_contacts SET tags = array_remove(tags, tag) WHERE id = row_id;
$$ LANGUAGE sql;

-- 4. Find stale deals (used by scheduler — optional, fallback exists)
CREATE OR REPLACE FUNCTION find_stale_deals(p_org_id UUID, p_cutoff TIMESTAMPTZ)
RETURNS TABLE(id UUID, title TEXT, value NUMERIC, assigned_to UUID, updated_at TIMESTAMPTZ) AS $$
  SELECT id, title, value, assigned_to, updated_at
  FROM crm_deals
  WHERE org_id = p_org_id AND status NOT IN ('won','lost') AND updated_at < p_cutoff
  LIMIT 50;
$$ LANGUAGE sql;
```

### Priority 2 — Supabase Server Client (Security-Critical)

**Problem:** All server-side code (cron jobs, API routes, webhook handlers) currently uses the anon key client (`src/lib/supabaseClient.ts`). This means RLS is the only access control for privileged operations like scoring all orgs' deals or generating reports for all reps.

**Fix:** Create a server-only admin client:

```typescript
// src/lib/supabaseAdmin.ts
import { createClient } from '@supabase/supabase-js';

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // NEVER expose this to the browser
);
```

Then update these files to import `supabaseAdmin` instead of `supabase`:
- `src/app/api/cron/score-deals/route.ts`
- `src/app/api/cron/generate-reports/route.ts`
- `src/app/api/automation/evaluate/route.ts`
- `src/app/api/automation/scheduled/route.ts`
- `src/app/api/webhooks/whatsapp/route.ts`
- `src/app/api/webhooks/stripe/route.ts` (Wave 1)
- `src/middleware/apiAuth.ts`
- `src/automation/engine.ts`
- `src/automation/actions.ts`
- `src/automation/scheduler.ts`
- `src/crm/leadScoring/scorer.ts`
- `src/crm/leadScoring/router.ts`
- `src/integrations/adapters/whatsappBusiness.ts`

**Add to .env:**
```
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # From Supabase dashboard → Settings → API
```

### Priority 3 — Environment Variables

All of these must be set in Vercel (and .env.local for dev):

```bash
# ── ALREADY NEEDED FROM WAVE 1 ──
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # NEW — for admin client
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ENTREPRENEUR_MONTHLY=
STRIPE_PRICE_ENTREPRENEUR_ANNUAL=
STRIPE_PRICE_ORGANIZATION_MONTHLY=
STRIPE_PRICE_ORGANIZATION_ANNUAL=
STRIPE_PRICE_ENTERPRISE_MONTHLY=
STRIPE_PRICE_ENTERPRISE_ANNUAL=
STRIPE_PRICE_ADDON_SEAT=
TOKEN_ENCRYPTION_KEY=               # 64 hex chars (32 bytes): openssl rand -hex 32
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
MICROSOFT_TENANT_ID=
MICROSOFT_REDIRECT_URI=
SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=
SLACK_SIGNING_SECRET=
SLACK_BOT_TOKEN=
SLACK_REDIRECT_URI=
ZOOM_CLIENT_ID=
ZOOM_CLIENT_SECRET=
ZOOM_REDIRECT_URI=
ZOOM_WEBHOOK_SECRET=

# ── NEW FOR WAVE 2-4 ──
META_APP_SECRET=                     # WhatsApp webhook signature verification
WHATSAPP_WEBHOOK_VERIFY_TOKEN=       # Any random string you choose for Meta webhook setup
AUTOMATION_WEBHOOK_SECRET=           # For Supabase database webhooks → automation evaluate endpoint
CRON_SECRET=                         # Vercel auto-sets this for cron jobs
NEXT_PUBLIC_APP_URL=https://crm.rasmalak.com
```

### Priority 4 — External Service Setup

Each has a checkpoint in the spec. Set up in order:

| Service | What To Do | Env Vars It Produces | Blocks |
|---------|-----------|---------------------|--------|
| **Stripe** | Create products + prices for 3 tiers (monthly + annual) + seat addon. Add webhook endpoint `https://crm.rasmalak.com/api/webhooks/stripe` | STRIPE_PRICE_* | Billing |
| **Google Cloud** | OAuth consent screen + credentials. Redirect URI: `/api/integrations/callback` | GOOGLE_CLIENT_* | Calendar + Gmail |
| **Azure AD** | App registration. Redirect URI: `/api/integrations/callback` | MICROSOFT_CLIENT_* | Outlook + Calendar + Teams |
| **Slack** | Create app, enable Event Subscriptions, add bot scopes. Request URL: `/api/webhooks/slack` | SLACK_* | Slack integration |
| **Zoom** | OAuth app. Event subscription URL: `/api/webhooks/zoom` | ZOOM_* | Zoom integration |
| **Meta Business** | Business verification + WABA + register phone number. Webhook URL: `/api/webhooks/whatsapp` | META_APP_SECRET, WHATSAPP_* | WhatsApp Business |

### Priority 5 — Supabase Database Webhooks

The automation engine fires from database changes. Set up Supabase Database Webhooks:

| Table | Events | Webhook URL |
|-------|--------|-------------|
| `crm_deals` | INSERT, UPDATE | `https://crm.rasmalak.com/api/automation/evaluate` |
| `crm_contacts` | INSERT, UPDATE | `https://crm.rasmalak.com/api/automation/evaluate` |
| `crm_tasks` | INSERT, UPDATE | `https://crm.rasmalak.com/api/automation/evaluate` |
| `crm_communications` | INSERT | `https://crm.rasmalak.com/api/automation/evaluate` |

Set the Authorization header to `Bearer {AUTOMATION_WEBHOOK_SECRET}` on each.

The webhook payload should include the full row data + the event type. You may need a Supabase Edge Function to transform the payload into the format expected by the evaluate endpoint:

```json
{
  "type": "deal_created",
  "orgId": "...",
  "entityType": "deal",
  "entityId": "...",
  "data": { /* row data */ },
  "previousData": { /* old row for UPDATE events */ }
}
```

### Priority 6 — Rate Limiting (Production Hardening)

Current rate limiting uses counting rows in `api_request_log` — not atomic, bypassable under concurrency.

**Recommended fix:** Add Upstash Redis via Vercel Marketplace:

```bash
vercel integration add upstash
```

Then replace the rate limit check in `src/middleware/apiAuth.ts` with:

```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, '1 h'),
});

// In authenticateApiRequest:
const { success, limit, remaining, reset } = await ratelimit.limit(apiKey.id);
```

### Priority 7 — Seed Workflow Templates

The 20 workflow template JSON files exist in `src/automation/templates/`. They need to be inserted into `crm_workflow_templates` table. Write a seed script:

```bash
# Pseudocode
for each .json file in src/automation/templates/:
  INSERT INTO crm_workflow_templates (slug, name, name_ar, ...) VALUES (...)
```

Same for the 3 vertical templates in `src/crm/verticals/templates/`.

### Priority 8 — Seed Vertical Templates

Insert the 3 vertical template JSONs into `crm_vertical_templates`:
- `real_estate.json`
- `healthcare.json`
- `retail_distribution.json`

---

## Known Issues From Code Review (28 Fixed, 6 Deferred)

### Fixed Before Handoff
- WhatsApp signature bypass when env var missing → now fails closed
- PostgREST filter injection via search param → sanitized
- Encrypted token exposed to browser → excluded from select
- Cron `Bearer undefined` bypass → timing-safe check with guard
- Arbitrary field write in automation → allowlisted fields
- Webhook action leaked orgId + full data → SSRF guard + safe field set
- N+1 notification inserts → batched
- Conditions null/NaN coercion → guarded
- Scheduler monthly 28-day drift → calendar month check
- Lead scoring null coercion + unknown operator defaults → fixed
- API error messages leaked Supabase internals → sanitized
- DELETE returned 200 for non-existent → now 404
- Empty PATCH silently succeeded → now 400
- Store useEffect race on org switch → cancelled flag cleanup
- WhatsApp message body unbounded → capped at 4096

### Deferred (Need Infrastructure)
1. **Anon key server-side** → Create `supabaseAdmin` client (Priority 2 above)
2. **Rate limiting non-atomic** → Add Upstash Redis (Priority 6 above)
3. **SHA-256 for API keys** → Consider bcrypt. Current SHA-256 is acceptable if keys have high entropy (the generated keys use `crypto.randomUUID` which is 122 bits)
4. **run_count race condition** → Use the RPC function (Priority 1 above)
5. **Tag add/remove race** → Use the array RPC functions (Priority 1 above)
6. **Overdue task dedup** → Scheduler re-fires `task_overdue` every 5 min for the same tasks. Options: (a) add an `overdue_notified_at` column, (b) check `crm_workflow_log` for recent task_overdue entries before firing

---

## File Manifest (New in Waves 2-4)

### Migrations (7)
```
supabase/migrations/017_automation.sql
supabase/migrations/018_deal_scoring.sql
supabase/migrations/019_whatsapp.sql
supabase/migrations/020_lead_scoring.sql
supabase/migrations/021_api.sql
supabase/migrations/022_documents.sql
supabase/migrations/023_verticals.sql
```

### Backend (30 files)
```
src/automation/engine.ts              — Workflow evaluation orchestrator
src/automation/triggers.ts            — Trigger matching (12 types)
src/automation/conditions.ts          — Condition evaluation (14 operators)
src/automation/actions.ts             — Action execution (12 types)
src/automation/scheduler.ts           — Cron scheduler (overdue, inactivity, scheduled)
src/ai/agents/dealScoringAgent.ts     — AI deal scoring prompt template
src/ai/agents/reportGeneratorAgent.ts — AI report generation prompt template
src/middleware/apiAuth.ts             — Public API auth + rate limiting
src/crm/leadScoring/scorer.ts        — Rule-based contact scoring
src/crm/leadScoring/router.ts        — Contact routing (round-robin, territory, skill)
src/crm/documents/templateEngine.ts   — Merge field substitution
src/crm/documents/mergeFields.ts      — Merge context fetcher
src/crm/verticals/templateInstaller.ts — Vertical template installer
src/integrations/adapters/whatsappBusiness.ts — WhatsApp Business API adapter
src/integrations/zapier/authentication.ts
src/integrations/zapier/triggers.ts
src/integrations/zapier/actions.ts
```

### API Routes (17)
```
src/app/api/automation/evaluate/route.ts
src/app/api/automation/scheduled/route.ts
src/app/api/cron/score-deals/route.ts
src/app/api/cron/generate-reports/route.ts
src/app/api/crm/v1/contacts/route.ts
src/app/api/crm/v1/contacts/[id]/route.ts
src/app/api/crm/v1/companies/route.ts
src/app/api/crm/v1/companies/[id]/route.ts
src/app/api/crm/v1/deals/route.ts
src/app/api/crm/v1/deals/[id]/route.ts
src/app/api/crm/v1/tasks/route.ts
src/app/api/crm/v1/tasks/[id]/route.ts
src/app/api/crm/v1/communications/route.ts
src/app/api/crm/v1/pipelines/route.ts
src/app/api/crm/v1/pipelines/[id]/stages/route.ts
src/app/api/crm/v1/webhooks/route.ts
src/app/api/crm/v1/openapi/route.ts
```

### Templates (23 JSON files)
```
src/automation/templates/*.json          — 20 workflow templates
src/crm/verticals/templates/*.json       — 3 vertical templates
```

### Stores (2)
```
src/store/automationStore.tsx
src/store/whatsappStore.tsx
```

### UI Components (18)
```
src/components/crm/automation/WorkflowBuilder.tsx
src/components/crm/automation/TriggerSelector.tsx
src/components/crm/automation/ConditionEditor.tsx
src/components/crm/automation/ActionList.tsx
src/components/crm/automation/ActionConfigurator.tsx
src/components/crm/automation/TemplateGallery.tsx
src/components/crm/automation/WorkflowLog.tsx
src/components/crm/deals/DealScore.tsx
src/components/crm/whatsapp/ConversationView.tsx
src/components/crm/whatsapp/TemplateManager.tsx
src/components/crm/whatsapp/AccountSetup.tsx
src/components/crm/documents/TemplateEditor.tsx
src/components/crm/documents/ProposalGenerator.tsx
src/components/crm/documents/QuoteBuilder.tsx
src/components/crm/documents/DocumentList.tsx
src/components/crm/verticals/TemplateBrowser.tsx
src/components/crm/verticals/TemplatePreview.tsx
src/components/crm/verticals/InstallWizard.tsx
```

### Pages (6)
```
src/app/(crm)/crm/automation/page.tsx
src/app/(crm)/crm/dashboard/page.tsx
src/app/(crm)/crm/documents/page.tsx
src/app/(crm)/crm/settings/whatsapp/page.tsx
src/app/(crm)/crm/settings/api/page.tsx
src/app/(crm)/crm/settings/verticals/page.tsx
```

### i18n (10 files)
```
src/messages/{en,ar}/automation.ts   — 130+ keys each
src/messages/{en,ar}/whatsapp.ts     — 50+ keys each
src/messages/{en,ar}/api.ts          — 30+ keys each
src/messages/{en,ar}/documents.ts    — 40+ keys each
src/messages/{en,ar}/verticals.ts    — 30+ keys each
```

### Modified Files (9)
```
vercel.json                          — +3 cron entries
src/components/crm/layout/CrmSidebar.tsx — +Dashboard, Automation, Documents nav
src/components/crm/pipeline/DealCard.tsx — +AI score badge
src/messages/{en,ar}/crm.ts          — +nav keys
src/messages/{en,ar}/index.ts        — +5 domain registrations
src/types/crm.ts                     — +CrmDealWithScore, CrmContactWithScore
src/app/api/webhooks/whatsapp/route.ts — Completed from stub
```

---

## Cron Schedule (vercel.json)

| Path | Schedule | Purpose |
|------|----------|---------|
| `/api/cron/sync-emails` | Every 5 min | Fetch new emails from connected accounts |
| `/api/cron/refresh-tokens` | Hourly | Refresh expiring OAuth tokens |
| `/api/cron/renew-webhooks` | Daily 3 AM | Renew expiring webhook subscriptions |
| `/api/cron/health-check` | Every 6 hrs | Test all active integrations |
| `/api/automation/scheduled` | Every 5 min | Run scheduled workflows + overdue checks |
| `/api/cron/score-deals` | Daily 2 AM | AI score all open deals |
| `/api/cron/generate-reports` | Daily 4 AM | Generate manager + rep reports |

---

## Testing Sequence

### Phase A — Database + Auth
1. Run migrations 017-023
2. Create RPC functions
3. Create supabaseAdmin client
4. Verify all tables exist with correct RLS

### Phase B — Automation
5. Create a test workflow via UI
6. Trigger it by creating a deal → verify log entry
7. Install a template → verify workflow created
8. Test scheduler cron manually: `curl -H "Authorization: Bearer $CRON_SECRET" /api/automation/scheduled`

### Phase C — AI
9. Run score-deals cron manually → verify ai_score columns populated
10. Check score badge appears on pipeline cards
11. Run generate-reports → verify notification created

### Phase D — WhatsApp
12. Set up Meta Business webhook → verify GET challenge
13. Send test inbound message → verify it's logged
14. Send template message from CRM → verify delivery

### Phase E — Public API
15. Create API key via settings page
16. `curl -H "Authorization: Bearer rsk_..." /api/crm/v1/contacts` → verify response
17. Hit rate limit → verify 429 + headers
18. Create webhook subscription → verify secret returned once

### Phase F — Documents
19. Create a document template with merge fields
20. Generate proposal from template + deal → verify rendered output

### Phase G — Verticals
21. Browse templates page → verify 3 templates visible
22. Install real estate → verify pipeline + stages + workflows created

---

## Architecture Notes

- **Automation engine flow:** Event → `/api/automation/evaluate` → `processEvent()` → iterates active workflows → `doesTriggerMatch()` → `evaluateConditions()` → sequential `executeAction()` → `logExecution()`
- **AI agents** follow the `AgentDefinition` pattern from V1. They are prompt templates, not separate LLM invocations. The orchestrator picks the agent and calls the provider.
- **All stores** use the Context Provider pattern matching `transactionStore.tsx` from V1.
- **All API routes** use snake_case responses (external convention) while internal code uses camelCase.
- **Plan gating map** is in `src/types/crm.ts` as `PLAN_FEATURE_MAP`. The `planGate.ts` middleware checks it server-side.
- **V1 code was never modified** — only extended (DealCard, Sidebar, types).

---

## Contact

Code was built by Claude Code across 3 sessions. If anything is unclear, the three reference documents have full context:
- `RASMALAK_CRM_V2_CLAUDE_CODE_SPEC.md` — Rules and env vars
- `RASMALAK_CRM_V2_PROMPT_PLAYBOOK.md` — Phase-by-phase build instructions
- `RASMALAK_CRM_V2_TECHNICAL_ARCHITECTURE.md` — SQL schemas, adapter interfaces, API specs
