-- =============================================================
-- Add monthly funding columns to savings_goals
-- funding_type: 'none' | 'fixed' | 'percentage'
-- funding_value: the amount (fixed) or percentage value
-- =============================================================
ALTER TABLE public.savings_goals
  ADD COLUMN IF NOT EXISTS funding_type text NOT NULL DEFAULT 'none'
    CHECK (funding_type IN ('none', 'fixed', 'percentage')),
  ADD COLUMN IF NOT EXISTS funding_value numeric NOT NULL DEFAULT 0;
