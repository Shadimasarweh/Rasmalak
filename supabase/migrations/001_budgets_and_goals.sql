-- =============================================================
-- Budgets table: one row per user
-- =============================================================
create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  monthly_budget numeric not null default 0,
  category_budgets jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  constraint budgets_user_id_unique unique (user_id)
);

alter table public.budgets enable row level security;

create policy "Users can read own budget"
  on public.budgets for select
  using (auth.uid() = user_id);

create policy "Users can insert own budget"
  on public.budgets for insert
  with check (auth.uid() = user_id);

create policy "Users can update own budget"
  on public.budgets for update
  using (auth.uid() = user_id);

-- =============================================================
-- Savings goals table: multiple rows per user
-- =============================================================
create table if not exists public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  name_ar text not null,
  target_amount numeric not null,
  current_amount numeric not null default 0,
  deadline date,
  color text not null,
  created_at timestamptz not null default now()
);

alter table public.savings_goals enable row level security;

create policy "Users can read own goals"
  on public.savings_goals for select
  using (auth.uid() = user_id);

create policy "Users can insert own goals"
  on public.savings_goals for insert
  with check (auth.uid() = user_id);

create policy "Users can update own goals"
  on public.savings_goals for update
  using (auth.uid() = user_id);

create policy "Users can delete own goals"
  on public.savings_goals for delete
  using (auth.uid() = user_id);
