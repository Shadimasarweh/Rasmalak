-- financial_advice: ensure target_metric CHECK matches app (spending | savings, any case).
-- Resolves: new row violates check constraint "financial_advice_target_metric_check"

CREATE TABLE IF NOT EXISTS public.financial_advice (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source text NOT NULL,
  rule_id text,
  advice_text text NOT NULL,
  target_metric text,
  confidence numeric,
  conversation_id text,
  context_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.financial_advice DROP CONSTRAINT IF EXISTS financial_advice_target_metric_check;

-- Backfill so every row satisfies the new rule (matches src/ai/adviceLogger.ts)
UPDATE public.financial_advice
SET target_metric = CASE
  WHEN target_metric IS NULL OR btrim(target_metric) = '' THEN 'spending'
  WHEN lower(btrim(target_metric)) IN ('savings', 'saving', 'goals', 'goal') THEN 'savings'
  ELSE 'spending'
END;

ALTER TABLE public.financial_advice ADD CONSTRAINT financial_advice_target_metric_check
  CHECK (
    target_metric IS NULL
    OR lower(btrim(target_metric)) IN ('spending', 'savings')
  );

ALTER TABLE public.financial_advice ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "financial_advice_select_own" ON public.financial_advice;
DROP POLICY IF EXISTS "financial_advice_insert_own" ON public.financial_advice;

CREATE POLICY "financial_advice_select_own"
  ON public.financial_advice FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "financial_advice_insert_own"
  ON public.financial_advice FOR INSERT
  WITH CHECK (auth.uid() = user_id);
