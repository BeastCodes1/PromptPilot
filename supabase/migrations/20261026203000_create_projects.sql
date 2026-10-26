create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  plan jsonb not null check (jsonb_typeof(plan) = 'object'),
  tasks jsonb not null check (jsonb_typeof(tasks) = 'object'),
  launch_checklist jsonb not null
    check (
      case
        when jsonb_typeof(launch_checklist) = 'array'
          then jsonb_array_length(launch_checklist) = 6
        else false
      end
    ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_user_updated_at_idx
  on public.projects (user_id, updated_at desc);

alter table public.projects enable row level security;

drop policy if exists "Users can read their own projects" on public.projects;
create policy "Users can read their own projects"
  on public.projects for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own projects" on public.projects;
create policy "Users can create their own projects"
  on public.projects for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own projects" on public.projects;
create policy "Users can update their own projects"
  on public.projects for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own projects" on public.projects;
create policy "Users can delete their own projects"
  on public.projects for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.set_project_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;

drop trigger if exists set_project_updated_at on public.projects;
create trigger set_project_updated_at
  before update on public.projects
  for each row
  execute function public.set_project_updated_at();

grant select, insert, update, delete on public.projects to authenticated;
revoke all on public.projects from anon;
