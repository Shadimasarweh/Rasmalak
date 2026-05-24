-- =============================================================
-- 012_currency_architecture.sql
-- Multi-Currency Engine: dual-layer transaction model
--
-- Implements the architecture from "Rasmalak Currency Architecture":
--   1. profiles table with country (immutable after onboarding) and
--      base_currency (mutable from settings).
--   2. transactions store BOTH the native amount/currency the user
--      typed AND the locked base-currency value at the moment of entry.
--      Subsequent FX drift never touches historical rows.
--   3. fx_rates is a date-keyed cache of rates fetched from central
--      banks (with aggregator fallback). Used for entry auto-fill,
--      historical recalculation, and any base-currency display
--      conversions for budgets/goals.
--   4. fx_recalculation_jobs tracks the async recompute that runs
--      whenever the user changes their base_currency.
--
-- Backfill rules:
--   - Existing transactions: native columns are populated from the
--     legacy `amount`/`currency` columns. exchange_rate_applied = 1
--     and amount_base = amount, with rate_source = 'backfill'. This
--     assumes pre-migration data was already entered in the user's
--     display currency, which matches the historical entry UX.
--   - Budgets / goals / emergency funds get currency_native set to
--     the user's profile base_currency on first save. The migration
--     does not pick a value — that's the application's job once the
--     user confirms their base currency.
-- =============================================================

-- =============================================================
-- profiles: one row per auth user, source of truth for country +
-- base currency. country is set at onboarding and the app does not
-- expose a way to change it; base_currency is freely editable in
-- Settings and triggers an async recalc on change.
-- =============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  country text,
  base_currency text not null default 'SAR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- =============================================================
-- transactions: dual-layer (native + base) with locked rate.
-- All analytical/predictive code MUST read amount_base and ignore
-- amount_native + exchange_rate_applied for aggregation purposes.
-- =============================================================
alter table public.transactions
  add column if not exists amount_native numeric,
  add column if not exists currency_native text,
  add column if not exists exchange_rate_applied numeric not null default 1,
  add column if not exists amount_base numeric,
  add column if not exists base_currency_at_entry text,
  add column if not exists rate_source text;

-- Backfill from legacy columns. Treat existing rows as already in
-- their native currency at rate=1 (their original currency IS the
-- base they were entered into).
update public.transactions
   set amount_native = coalesce(amount_native, amount),
       currency_native = coalesce(currency_native, currency),
       exchange_rate_applied = coalesce(exchange_rate_applied, 1),
       amount_base = coalesce(amount_base, amount),
       base_currency_at_entry = coalesce(base_currency_at_entry, currency),
       rate_source = coalesce(rate_source, 'backfill')
 where amount_native is null
    or amount_base is null
    or base_currency_at_entry is null
    or rate_source is null;

-- Now that backfill is done, lock the new columns down.
alter table public.transactions
  alter column amount_native set not null,
  alter column currency_native set not null,
  alter column amount_base set not null,
  alter column base_currency_at_entry set not null,
  alter column rate_source set not null;

-- Constrain rate_source values for traceability.
alter table public.transactions
  drop constraint if exists transactions_rate_source_check;
alter table public.transactions
  add constraint transactions_rate_source_check
  check (rate_source in ('central_bank', 'aggregator', 'manual', 'cached', 'backfill'));

-- Index for the recalc job which scans all of a user's rows.
create index if not exists idx_transactions_user_currency_date
  on public.transactions(user_id, currency_native, date);

-- =============================================================
-- budgets / savings_goals / emergency_funds: store the currency the
-- user typed the cap or target in. Display layer converts to base
-- via fx_rates on read (the "store native + display in base" model).
-- Defaults to SAR for legacy rows; the application updates these
-- to the user's actual base on first edit.
-- =============================================================
alter table public.budgets
  add column if not exists currency_native text not null default 'SAR';

alter table public.savings_goals
  add column if not exists currency_native text not null default 'SAR';

alter table public.emergency_funds
  add column if not exists currency_native text not null default 'SAR';

-- =============================================================
-- fx_rates: date-keyed FX cache. One row per (date, from, to) pair.
-- Populated by the daily refresh job (Vercel Cron -> /api/fx/refresh)
-- and by ad-hoc fetches at transaction entry time.
-- =============================================================
create table if not exists public.fx_rates (
  date date not null,
  from_currency text not null,
  to_currency text not null,
  rate numeric not null,
  source text not null,
  fetched_at timestamptz not null default now(),
  primary key (date, from_currency, to_currency)
);

create index if not exists idx_fx_rates_date
  on public.fx_rates(date);

create index if not exists idx_fx_rates_from_to
  on public.fx_rates(from_currency, to_currency);

-- fx_rates is global, not user-scoped. Allow authenticated reads;
-- writes happen from server routes using the service role key.
alter table public.fx_rates enable row level security;

drop policy if exists "Authenticated users can read fx rates" on public.fx_rates;
create policy "Authenticated users can read fx rates"
  on public.fx_rates for select
  to authenticated
  using (true);

-- =============================================================
-- fx_recalculation_jobs: tracks the async recompute that runs after
-- the user changes their base currency in Settings. The job re-reads
-- every transaction, looks up the historical fx_rate for its date,
-- and updates amount_base + base_currency_at_entry accordingly.
-- =============================================================
create table if not exists public.fx_recalculation_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  from_base text not null,
  to_base text not null,
  status text not null default 'pending',
  processed_count integer not null default 0,
  total_count integer not null default 0,
  error text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint fx_recalculation_jobs_status_check
    check (status in ('pending', 'running', 'completed', 'failed'))
);

create index if not exists idx_fx_recalc_user_status
  on public.fx_recalculation_jobs(user_id, status);

alter table public.fx_recalculation_jobs enable row level security;

drop policy if exists "Users can read own recalc jobs" on public.fx_recalculation_jobs;
create policy "Users can read own recalc jobs"
  on public.fx_recalculation_jobs for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own recalc jobs" on public.fx_recalculation_jobs;
create policy "Users can insert own recalc jobs"
  on public.fx_recalculation_jobs for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own recalc jobs" on public.fx_recalculation_jobs;
create policy "Users can update own recalc jobs"
  on public.fx_recalculation_jobs for update
  using (auth.uid() = user_id);
