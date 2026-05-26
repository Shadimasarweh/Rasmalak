-- =============================================================
-- 013_budget_cycles_and_savings.sql
--
-- Implements the Emergency Fund + Goals automation per
-- "Emergency funds and Savings Goals.docx":
--
--   1. Month-stamped budget cycles. Replaces the single-row
--      `budgets` model with one row per (user_id, month_year) so
--      auto-renewal at the start of each month creates a fresh
--      row instead of overwriting history.
--   2. Per-EF replenishment cadence. Adds `frequency`
--      ('monthly' | 'biweekly') and an anchor date so bi-weekly
--      cycles line up with the user's pay schedule.
--   3. Goal status. Adds `status` so paused/deleted/achieved
--      goals stop being injected as savings line items in the
--      next budget cycle.
--
-- The legacy single-row `budgets` table stays during the
-- transition. New code reads `budget_cycles`; old code keeps
-- reading `budgets`. After the migration is verified the legacy
-- table can be dropped in a follow-up.
-- =============================================================

-- =============================================================
-- budget_cycles: one row per user per month. Captures the user's
-- planned caps for that month. Actuals come from `transactions`
-- with `date` falling inside the month.
-- =============================================================
create table if not exists public.budget_cycles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- 'YYYY-MM'. Stored as text rather than a date because cycle
  -- boundaries are calendar months, not specific days.
  month_year text not null,
  monthly_budget numeric not null default 0,
  category_budgets jsonb not null default '{}',
  -- ISO 4217 currency the caps were typed in. Mirrors the
  -- `currency_native` convention from migration 012.
  currency_native text not null default 'SAR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint budget_cycles_user_month_unique unique (user_id, month_year),
  constraint budget_cycles_month_year_format check (month_year ~ '^[0-9]{4}-(0[1-9]|1[0-2])$')
);

create index if not exists idx_budget_cycles_user_month
  on public.budget_cycles(user_id, month_year desc);

alter table public.budget_cycles enable row level security;

drop policy if exists "Users can read own cycles" on public.budget_cycles;
create policy "Users can read own cycles"
  on public.budget_cycles for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own cycles" on public.budget_cycles;
create policy "Users can insert own cycles"
  on public.budget_cycles for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own cycles" on public.budget_cycles;
create policy "Users can update own cycles"
  on public.budget_cycles for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete own cycles" on public.budget_cycles;
create policy "Users can delete own cycles"
  on public.budget_cycles for delete
  using (auth.uid() = user_id);

-- Backfill: copy each existing row from `budgets` into the
-- current month's `budget_cycles` so the Plan page is non-empty
-- on first deploy. Uses `to_char(now(), 'YYYY-MM')` so the
-- migration is timezone-stable in the Supabase server's tz.
insert into public.budget_cycles (
  user_id, month_year, monthly_budget, category_budgets, currency_native
)
select
  b.user_id,
  to_char(now(), 'YYYY-MM'),
  b.monthly_budget,
  b.category_budgets,
  coalesce(b.currency_native, 'SAR')
from public.budgets b
on conflict (user_id, month_year) do nothing;

-- =============================================================
-- emergency_funds: replenishment cadence
-- =============================================================
alter table public.emergency_funds
  add column if not exists frequency text not null default 'monthly',
  add column if not exists frequency_anchor_date date;

alter table public.emergency_funds
  drop constraint if exists emergency_funds_frequency_check;
alter table public.emergency_funds
  add constraint emergency_funds_frequency_check
  check (frequency in ('monthly', 'biweekly'));

-- =============================================================
-- savings_goals: lifecycle status
-- =============================================================
alter table public.savings_goals
  add column if not exists status text not null default 'active';

alter table public.savings_goals
  drop constraint if exists savings_goals_status_check;
alter table public.savings_goals
  add constraint savings_goals_status_check
  check (status in ('active', 'paused', 'achieved'));

create index if not exists idx_savings_goals_user_status
  on public.savings_goals(user_id, status);
