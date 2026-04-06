-- Add monthly_contribution to emergency_funds so the amount
-- can be reserved automatically in the user's monthly budget.
alter table public.emergency_funds
  add column if not exists monthly_contribution numeric not null default 0;
