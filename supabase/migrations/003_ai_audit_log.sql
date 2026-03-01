-- =============================================================
-- AI Audit Log: full trace of every orchestrator interaction
-- =============================================================
-- Stores the explanation trace for each AI interaction.
-- Used for accountability, debugging, and governance.

CREATE TABLE IF NOT EXISTS public.ai_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  intent text NOT NULL,
  intent_confidence text,
  agent_used text NOT NULL,
  context_injected jsonb DEFAULT '{}',
  memory_read jsonb DEFAULT '[]',
  memory_written jsonb DEFAULT '[]',
  deterministic_values jsonb DEFAULT '{}',
  validation_results jsonb DEFAULT '[]',
  confidence_score numeric,
  processing_time_ms integer,
  retried boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own audit logs"
  ON public.ai_audit_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own audit logs"
  ON public.ai_audit_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Index for efficient queries by user and time
CREATE INDEX IF NOT EXISTS idx_ai_audit_log_user_time
  ON public.ai_audit_log (user_id, created_at DESC);
