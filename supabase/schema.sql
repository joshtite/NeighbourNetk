-- NeighbourNetk (Supabase) schema

-- Requests posted by neighbours (residents).
create table if not exists public.help_requests (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  category text not null default 'Errand / daily life',
  location text not null default '',
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved')),
  created_by_name text not null,
  created_by_email text,
  created_by_role text not null default 'neighbour' check (created_by_role in ('neighbour', 'volunteer')),
  created_by_user_id uuid,
  created_at timestamptz not null default now(),
  status_updated_at timestamptz
);

-- Volunteer responses to a request.
create table if not exists public.help_responses (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.help_requests(id) on delete cascade,
  volunteer_name text not null,
  volunteer_email text,
  volunteer_user_id uuid,
  message text not null,
  responded_at timestamptz not null default now()
);

create index if not exists help_requests_created_at_idx on public.help_requests (created_at desc);
create index if not exists help_requests_status_idx on public.help_requests (status);
create index if not exists help_responses_request_id_idx on public.help_responses (request_id);

alter table public.help_requests enable row level security;
alter table public.help_responses enable row level security;

drop policy if exists "public read help_requests" on public.help_requests;
create policy "public read help_requests"
on public.help_requests
for select
to anon, authenticated
using (true);

-- Only authenticated users can create requests;
-- they can set created_by_user_id only to their own auth.uid().
drop policy if exists "authenticated insert help_requests" on public.help_requests;
create policy "authenticated insert help_requests"
on public.help_requests
for insert
to authenticated
with check (
  auth.uid() is not null
  and (created_by_user_id is null or created_by_user_id = auth.uid())
);

-- Request owners can update their own requests (e.g. status, text).
drop policy if exists "owner update help_requests" on public.help_requests;
create policy "owner update help_requests"
on public.help_requests
for update
to authenticated
using (auth.uid() = created_by_user_id)
with check (auth.uid() = created_by_user_id);

drop policy if exists "public read help_responses" on public.help_responses;
create policy "public read help_responses"
on public.help_responses
for select
to anon, authenticated
using (true);

-- Only authenticated users can add responses, and they can only
-- record their own user id/email.
drop policy if exists "authenticated insert help_responses" on public.help_responses;
create policy "authenticated insert help_responses"
on public.help_responses
for insert
to authenticated
with check (
  auth.uid() is not null
  and (volunteer_user_id is null or volunteer_user_id = auth.uid())
);

