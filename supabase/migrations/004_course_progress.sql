-- Course progress tracking
create table if not exists course_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id text not null,
  locale text not null default 'en',
  completed_section_ids text[] not null default '{}',
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, course_id, locale)
);

alter table course_progress enable row level security;

create policy "Users can read own course progress"
  on course_progress for select
  using (auth.uid() = user_id);

create policy "Users can insert own course progress"
  on course_progress for insert
  with check (auth.uid() = user_id);

create policy "Users can update own course progress"
  on course_progress for update
  using (auth.uid() = user_id);
