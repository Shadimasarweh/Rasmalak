-- =============================================================
-- Security Hardening Migration (SEC-023, SEC-024)
-- =============================================================

-- SEC-023: Restrict audit log INSERT.
-- Ideally, audit log inserts should come from the server via service role only.
-- Since the current setup uses anon key for server-side inserts, we keep the
-- INSERT policy but ensure users can only insert their own entries.
-- When a SUPABASE_SERVICE_ROLE_KEY is configured, drop this policy and use
-- a service-role client in the audit logger instead.
-- The existing policy "Users can insert own audit logs" is retained for now.

-- SEC-024: Add DELETE policies for GDPR right-to-erasure compliance.

-- budgets
CREATE POLICY "Users can delete own budgets"
  ON public.budgets FOR DELETE
  USING (auth.uid() = user_id);

-- course_progress
CREATE POLICY "Users can delete own course progress"
  ON public.course_progress FOR DELETE
  USING (auth.uid() = user_id);

-- user_semantic_state
CREATE POLICY "Users can delete own semantic state"
  ON public.user_semantic_state FOR DELETE
  USING (auth.uid() = user_id);

-- financial_advice: users can delete their own advice records
CREATE POLICY "Users can delete own financial advice"
  ON public.financial_advice FOR DELETE
  USING (auth.uid() = user_id);
