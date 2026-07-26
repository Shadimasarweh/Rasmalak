-- Course progress repair — reconciles the deployed table with migration 004.
--
-- 004 uses `create table if not exists`, so on projects where an earlier
-- version of the table already existed it silently no-ops and never adds the
-- `locale` column. PostgREST then rejects the client upsert with
-- "Could not find the 'locale' column of 'course_progress' in the schema cache".
--
-- Idempotent; safe to run repeatedly.

-- 1. Create the table if it was never created at all.
create table if not exists public.course_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id text not null,
  locale text not null default 'en',
  completed_section_ids text[] not null default '{}',
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

-- 2. Add any columns missing from an older version of the table.
alter table public.course_progress
  add column if not exists locale text not null default 'en',
  add column if not exists completed_section_ids text[] not null default '{}',
  add column if not exists completed_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

-- 3. Backfill locale for rows created before the column existed.
--    Course ids are suffixed `_en` / `_ar`.
update public.course_progress
   set locale = case when course_id like '%\_ar' then 'ar' else 'en' end
 where locale is null or locale = '';

-- 4. The client upserts with onConflict 'user_id,course_id,locale', so a
--    unique constraint on exactly those three columns must exist.
alter table public.course_progress
  drop constraint if exists course_progress_user_id_course_id_key;

-- Collapse any duplicates a missing constraint could have allowed, keeping
-- the most recently updated row per key.
delete from public.course_progress a
 using public.course_progress b
 where a.user_id   = b.user_id
   and a.course_id = b.course_id
   and a.locale    = b.locale
   and (a.updated_at, a.id) < (b.updated_at, b.id);

do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conrelid = 'public.course_progress'::regclass
       and contype  = 'u'
       and conname  = 'course_progress_user_id_course_id_locale_key'
  ) then
    alter table public.course_progress
      add constraint course_progress_user_id_course_id_locale_key
      unique (user_id, course_id, locale);
  end if;
end $$;

-- 5. Row Level Security and the four policies the app relies on.
alter table public.course_progress enable row level security;

drop policy if exists "Users can read own course progress"   on public.course_progress;
drop policy if exists "Users can insert own course progress" on public.course_progress;
drop policy if exists "Users can update own course progress" on public.course_progress;
drop policy if exists "Users can delete own course progress" on public.course_progress;

create policy "Users can read own course progress"
  on public.course_progress for select
  using (auth.uid() = user_id);

create policy "Users can insert own course progress"
  on public.course_progress for insert
  with check (auth.uid() = user_id);

-- The `with check` clause is stricter than 004: it stops a user from
-- reassigning a row's user_id to somebody else during an update.
create policy "Users can update own course progress"
  on public.course_progress for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own course progress"
  on public.course_progress for delete
  using (auth.uid() = user_id);

-- 6. PostgREST caches the schema; without this the API keeps reporting the
--    column as missing even after it exists.
notify pgrst, 'reload schema';
