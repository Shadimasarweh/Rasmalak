-- =============================================================
-- 014_onboarding_fields.sql
--
-- Captures the four onboarding answers from
-- "The onboarding process.docx":
--   - primary_focuses (multi-select: emergency_fund / debt /
--     monthly_budget / learn_invest)
--   - persona ('salaried' | 'variable' | 'student')
--   - monthly_income (numeric, exact amount)
--   - expense_preset ('lean' | 'average' | 'heavy')
--
-- Country and base_currency are already on `profiles` from
-- migration 012. This migration only adds the four new fields.
--
-- All idempotent (`add column if not exists`, drop-then-recreate
-- constraints) so re-runs are safe.
-- =============================================================

alter table public.profiles
  add column if not exists primary_focuses text[] not null default '{}',
  add column if not exists persona text,
  add column if not exists monthly_income numeric,
  add column if not exists expense_preset text;

alter table public.profiles
  drop constraint if exists profiles_persona_check;
alter table public.profiles
  add constraint profiles_persona_check
  check (persona is null or persona in ('salaried', 'variable', 'student'));

alter table public.profiles
  drop constraint if exists profiles_expense_preset_check;
alter table public.profiles
  add constraint profiles_expense_preset_check
  check (expense_preset is null or expense_preset in ('lean', 'average', 'heavy'));

-- Force PostgREST to pick up the new columns immediately so the
-- API doesn't return "column not found in schema cache".
notify pgrst, 'reload schema';
