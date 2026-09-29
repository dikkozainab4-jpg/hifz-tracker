-- Hifzly: one private row per signed-in user.
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run.

create table if not exists public.user_data (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

-- Row-level security: a user can only ever see and change their own row.
alter table public.user_data enable row level security;

drop policy if exists "own row: select" on public.user_data;
drop policy if exists "own row: insert" on public.user_data;
drop policy if exists "own row: update" on public.user_data;
drop policy if exists "own row: delete" on public.user_data;

create policy "own row: select" on public.user_data
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "own row: insert" on public.user_data
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own row: update" on public.user_data
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own row: delete" on public.user_data
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Signed-out visitors get nothing; signed-in users may touch the table (the policies above limit them to their own row).
revoke all on public.user_data from anon;
grant select, insert, update, delete on public.user_data to authenticated;

-- Reject absurdly large payloads (the app's own limit is far below this).
alter table public.user_data drop constraint if exists user_data_size;
alter table public.user_data add constraint user_data_size check (pg_column_size(data) < 5000000);
