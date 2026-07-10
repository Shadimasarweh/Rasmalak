-- =============================================================
-- 016_peer_stats.sql
--
-- Peer benchmarking foundation (predictive engine Phase 3, item 12).
--
-- One SECURITY DEFINER function returning ANONYMIZED, AGGREGATE-ONLY
-- savings-rate percentiles for a country cohort. Privacy properties:
--
--   1. k-anonymity: returns NULL unless the cohort has >= 25 users —
--      no aggregate over a small group can be inverted to individuals.
--   2. Ratios only: savings rate = 1 − expense/income per user over
--      their trailing 90 days, computed inside each user's own base
--      currency — no amounts cross the boundary, and ratios compare
--      honestly across currencies without FX.
--   3. Aggregate out only: the function never returns a row of user
--      data; RLS on the underlying tables remains untouched.
--
-- Run manually in the Supabase SQL editor, after 015.
-- =============================================================

create or replace function public.get_peer_savings_stats(p_country text)
returns table (
  cohort_size integer,
  p25 numeric,
  p50 numeric,
  p75 numeric
)
language sql
security definer
set search_path = public
stable
as $$
  with per_user as (
    select
      t.user_id,
      1 - (
        sum(t.amount_base) filter (where t.type = 'expense'
          and (t.category is null or t.category not like 'goal-funding-%'))
        / nullif(sum(t.amount_base) filter (where t.type = 'income'), 0)
      ) as savings_rate
    from public.transactions t
    join public.profiles p on p.id = t.user_id
    where p.country = p_country
      and t.date >= (current_date - interval '90 days')
    group by t.user_id
    having sum(t.amount_base) filter (where t.type = 'income') > 0
  ),
  clamped as (
    select greatest(-1, least(1, savings_rate)) as savings_rate
    from per_user
    where savings_rate is not null
  )
  select
    count(*)::integer as cohort_size,
    percentile_cont(0.25) within group (order by savings_rate)::numeric as p25,
    percentile_cont(0.50) within group (order by savings_rate)::numeric as p50,
    percentile_cont(0.75) within group (order by savings_rate)::numeric as p75
  from clamped
  having count(*) >= 25;
$$;

-- Aggregate-only + k-anonymous, so authenticated users may call it.
grant execute on function public.get_peer_savings_stats(text) to authenticated;

notify pgrst, 'reload schema';
