ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS is_recurring boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS recurring_end_date date DEFAULT NULL;
