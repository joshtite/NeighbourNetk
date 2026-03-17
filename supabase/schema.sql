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
  created_at timestamptz not null default now(),
  status_updated_at timestamptz
);

-- Volunteer responses to a request.
create table if not exists public.help_responses (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.help_requests(id) on delete cascade,
  volunteer_name text not null,
  volunteer_email text,
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

drop policy if exists "public insert help_requests" on public.help_requests;
create policy "public insert help_requests"
on public.help_requests
for insert
to anon, authenticated
with check (true);

drop policy if exists "public update help_requests" on public.help_requests;
create policy "public update help_requests"
on public.help_requests
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "public read help_responses" on public.help_responses;
create policy "public read help_responses"
on public.help_responses
for select
to anon, authenticated
using (true);

drop policy if exists "public insert help_responses" on public.help_responses;
create policy "public insert help_responses"
on public.help_responses
for insert
to anon, authenticated
with check (true);

