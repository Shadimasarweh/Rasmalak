-- =============================================================
-- 015_predictive_engine.sql
--
-- Predictive engine Phase 1 persistence (see
-- docs/PREDICTIVE_ENGINE_AUDIT_AND_ROADMAP.md):
--
--   1. recurring_series — client-computed cache of detected series
--      (rent, salary, subscriptions). Upserted idempotently on
--      (user_id, series_key); a future service-role nightly job can
--      supersede rows via engine_version without schema change.
--   2. category_baselines — per-category median+MAD over completed
--      months. Upserted on (user_id, category_id).
--   3. prediction_log — APPEND-ONLY forecast ledger. Predictions are
--      immutable once written (inserts use ignoreDuplicates);
--      reconciliation only fills the actual/error columns. This is
--      what lets "accurate" be a measured claim, not a slogan.
--   4. increment_semantic_state_version — the RPC memoryService has
--      always called but which never existed (silent no-op until now).
--   5. user_semantic_state DELETE policy — parity with the 006
--      hardening pass (002 created only select/insert/update).
--   6. profiles payday/cycle columns — the user's A2 budget-cycle
--      setting, mirrored from the client store.
--
-- Run manually in the Supabase SQL editor, after 014.
-- =============================================================

-- =============================================================
-- 1. recurring_series
-- =============================================================
create table if not exists public.recurring_series (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  series_key text not null,
  direction text not null check (direction in ('income', 'expense')),
  category_id text not null,
  subcategory_id text,
  merchant_label text not null default '',
  cadence text not null check (cadence in ('weekly', 'biweekly', 'monthly', 'quarterly', 'yearly')),
  median_interval_days numeric not null,
  interval_mad_days numeric not null default 0,
  amount_median numeric not null,
  amount_mad numeric not null default 0,
  anchor_day_of_month integer check (anchor_day_of_month between 1 and 31),
  first_date date not null,
  last_date date not null,
  next_due_date date not null,
  occurrences integer not null,
  confidence numeric not null,
  active boolean not null default true,
  source text not null check (source in ('detected', 'user_flag', 'both')),
  engine_version text not null,
  computed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recurring_series_user_key_unique unique (user_id, series_key)
);

create index if not exists idx_recurring_series_user_due
  on public.recurring_series(user_id, active, next_due_date);

alter table public.recurring_series enable row level security;

drop policy if exists "Users can view own recurring series" on public.recurring_series;
create policy "Users can view own recurring series"
  on public.recurring_series for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own recurring series" on public.recurring_series;
create policy "Users can insert own recurring series"
  on public.recurring_series for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own recurring series" on public.recurring_series;
create policy "Users can update own recurring series"
  on public.recurring_series for update using (auth.uid() = user_id);

drop policy if exists "Users can delete own recurring series" on public.recurring_series;
create policy "Users can delete own recurring series"
  on public.recurring_series for delete using (auth.uid() = user_id);

-- =============================================================
-- 2. category_baselines
-- =============================================================
create table if not exists public.category_baselines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id text not null,
  window_months integer not null,
  months_with_data integer not null,
  monthly_median numeric not null,
  monthly_mad numeric not null,
  monthly_values jsonb not null default '[]',
  eligible boolean not null default false,
  engine_version text not null,
  computed_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint category_baselines_user_cat_unique unique (user_id, category_id)
);

alter table public.category_baselines enable row level security;

drop policy if exists "Users can view own category baselines" on public.category_baselines;
create policy "Users can view own category baselines"
  on public.category_baselines for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own category baselines" on public.category_baselines;
create policy "Users can insert own category baselines"
  on public.category_baselines for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own category baselines" on public.category_baselines;
create policy "Users can update own category baselines"
  on public.category_baselines for update using (auth.uid() = user_id);

drop policy if exists "Users can delete own category baselines" on public.category_baselines;
create policy "Users can delete own category baselines"
  on public.category_baselines for delete using (auth.uid() = user_id);

-- =============================================================
-- 3. prediction_log (append-only ledger)
-- =============================================================
create table if not exists public.prediction_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- Extend this list in later migrations as new prediction kinds ship.
  kind text not null check (kind in ('cycle_end_balance', 'category_month')),
  -- '' for balance forecasts; category_id for category_month.
  target_id text not null default '',
  cycle_start date not null,
  horizon_date date not null,
  snapshot text not null default 'cycle_start' check (snapshot in ('cycle_start', 'mid_cycle')),
  predicted_p25 numeric,
  predicted_p50 numeric not null,
  predicted_p75 numeric,
  basis jsonb not null default '{}',
  engine_version text not null,
  created_at timestamptz not null default now(),
  -- Reconciliation fields — the ONLY columns ever updated after insert.
  actual_value numeric,
  abs_error numeric,
  pct_error numeric,
  within_band boolean,
  reconciled_at timestamptz,
  constraint prediction_log_unique unique (user_id, kind, target_id, horizon_date, snapshot)
);

create index if not exists idx_prediction_log_unreconciled
  on public.prediction_log(user_id, horizon_date)
  where reconciled_at is null;

alter table public.prediction_log enable row level security;

drop policy if exists "Users can view own predictions" on public.prediction_log;
create policy "Users can view own predictions"
  on public.prediction_log for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own predictions" on public.prediction_log;
create policy "Users can insert own predictions"
  on public.prediction_log for insert with check (auth.uid() = user_id);

-- UPDATE is required for client-side reconciliation (filling actuals).
drop policy if exists "Users can update own predictions" on public.prediction_log;
create policy "Users can update own predictions"
  on public.prediction_log for update using (auth.uid() = user_id);

drop policy if exists "Users can delete own predictions" on public.prediction_log;
create policy "Users can delete own predictions"
  on public.prediction_log for delete using (auth.uid() = user_id);

-- =============================================================
-- 4. Version-bump RPC (memoryService already calls this)
-- =============================================================
create or replace function public.increment_semantic_state_version(p_user_id uuid)
returns void
language sql
security invoker
as $$
  update public.user_semantic_state
  set version = version + 1
  where user_id = p_user_id;
$$;

grant execute on function public.increment_semantic_state_version(uuid) to authenticated;

-- =============================================================
-- 5. user_semantic_state DELETE policy (006-parity)
-- =============================================================
drop policy if exists "Users can delete own semantic state" on public.user_semantic_state;
create policy "Users can delete own semantic state"
  on public.user_semantic_state for delete using (auth.uid() = user_id);

-- =============================================================
-- 6. profiles: payday/cycle settings (A2)
-- =============================================================
alter table public.profiles
  add column if not exists payday_day_of_month integer,
  add column if not exists budget_cycle_mode text not null default 'calendar',
  add column if not exists payday_source text;

alter table public.profiles drop constraint if exists profiles_payday_check;
alter table public.profiles add constraint profiles_payday_check
  check (payday_day_of_month is null or payday_day_of_month between 1 and 31);

alter table public.profiles drop constraint if exists profiles_cycle_mode_check;
alter table public.profiles add constraint profiles_cycle_mode_check
  check (budget_cycle_mode in ('calendar', 'payday'));

alter table public.profiles drop constraint if exists profiles_payday_source_check;
alter table public.profiles add constraint profiles_payday_source_check
  check (payday_source is null or payday_source in ('detected', 'manual'));

-- Force PostgREST to pick up the new tables/columns immediately.
notify pgrst, 'reload schema';
