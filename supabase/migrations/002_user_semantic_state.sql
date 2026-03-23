-- =============================================================
-- User Semantic State: persistent structured memory for AI layer
-- =============================================================
-- Replaces chat-history-based memory with versioned, selective fields.
-- Written by authorized agents via the memory service.
-- Never injected in full into prompts — only relevant fields.

CREATE TABLE IF NOT EXISTS public.user_semantic_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version integer NOT NULL DEFAULT 1,
  financial_health_band text,
  risk_profile jsonb DEFAULT '{}',
  income_stability_score numeric,
  behavior_signals jsonb DEFAULT '{}',
  preferences jsonb DEFAULT '{}',
  correction_history jsonb DEFAULT '[]',
  engagement_signals jsonb DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_semantic_state_user_unique UNIQUE (user_id)
);

ALTER TABLE public.user_semantic_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own semantic state"
  ON public.user_semantic_state FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own semantic state"
  ON public.user_semantic_state FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own semantic state"
  ON public.user_semantic_state FOR UPDATE
  USING (auth.uid() = user_id);
