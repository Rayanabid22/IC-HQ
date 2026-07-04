-- ============================================================
-- IC HQ — initial schema
-- Run this in the Supabase SQL editor (or `supabase db push`).
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- helpers ----------

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- profiles must exist before is_admin()
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  avatar_url text,
  role text not null default 'member' check (role in ('admin','member')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

-- auto-create a profile whenever an auth user is created
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'member')
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- tables ----------

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  assignee uuid references public.profiles(id) on delete set null,
  due_date date,
  priority text not null default 'med' check (priority in ('low','med','high')),
  status text not null default 'todo' check (status in ('todo','doing','done')),
  is_personal boolean not null default false,
  client_id uuid, -- fk added after clients table
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.whiteboards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  document jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  logo_url text,
  contact_name text,
  contact_handle text,
  package_tier text not null default 'Launch Spark' check (package_tier in ('Launch Spark','Launch Engine','Custom')),
  deal_value numeric not null default 0,
  status text not null default 'onboarding' check (status in ('onboarding','in production','review','delivered','retainer')),
  start_date date,
  notes text,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tasks
  add constraint tasks_client_id_fkey foreign key (client_id) references public.clients(id) on delete cascade;

create table public.client_members (
  client_id uuid not null references public.clients(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (client_id, user_id)
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text,
  source text not null default 'X' check (source in ('X','referral','email','other')),
  country text,
  icp_fit boolean not null default false,
  estimated_value numeric not null default 0,
  owner uuid references public.profiles(id) on delete set null,
  stage text not null default 'new' check (stage in ('new','replied','touch_1','touch_2','call_booked','converted','dead')),
  last_touch_date date,
  next_follow_up_date date,
  notes text,
  halal_gate boolean not null default false check (halal_gate), -- cannot be saved unchecked
  flagged boolean not null default false,
  deal_value numeric,          -- final value, set on conversion
  closed_at date,              -- close date, set on conversion
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.lead_activity (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  actor uuid references public.profiles(id) on delete set null,
  from_stage text,
  to_stage text,
  note text,
  created_at timestamptz not null default now()
);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'milestone' check (type in ('milestone','revenue')),
  title text not null,
  description text,
  target_date date,
  status text not null default 'not_started' check (status in ('not_started','in_progress','achieved')),
  metric text,
  target_amount numeric,      -- revenue goals
  month text,                 -- revenue goals: 'YYYY-MM'
  achieved_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.revenue_entries (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'manual' check (source in ('pipeline','manual')),
  amount numeric not null,
  month text not null,        -- 'YYYY-MM'
  lead_id uuid references public.leads(id) on delete set null,
  note text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.boards (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  color text not null default '#2E6BFF',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.board_members (
  board_id uuid not null references public.boards(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (board_id, user_id)
);

create table public.board_lists (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  name text not null,
  position double precision not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cards (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  list_id uuid not null references public.board_lists(id) on delete cascade,
  title text not null,
  description text,
  due_date date,
  labels jsonb not null default '[]'::jsonb,
  checklist jsonb not null default '[]'::jsonb,
  position double precision not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.card_assignees (
  card_id uuid not null references public.cards(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (card_id, user_id)
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('client','lead','card','task')),
  entity_id uuid not null,
  author uuid references public.profiles(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.files_meta (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  path text not null unique,
  size bigint not null default 0,
  mime_type text,
  folder text not null default 'General',
  client_id uuid references public.clients(id) on delete set null,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- updated_at triggers ----------

do $$
declare t text;
begin
  foreach t in array array[
    'profiles','tasks','whiteboards','clients','leads','goals',
    'revenue_entries','boards','board_lists','cards','comments','files_meta'
  ] loop
    execute format(
      'create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t
    );
  end loop;
end $$;

-- ---------- indexes ----------

create index tasks_assignee_idx on public.tasks (assignee);
create index tasks_client_idx on public.tasks (client_id);
create index leads_stage_idx on public.leads (stage);
create index leads_follow_up_idx on public.leads (next_follow_up_date);
create index lead_activity_lead_idx on public.lead_activity (lead_id);
create index cards_list_idx on public.cards (list_id);
create index cards_board_idx on public.cards (board_id);
create index board_lists_board_idx on public.board_lists (board_id);
create index comments_entity_idx on public.comments (entity_type, entity_id);
create index revenue_month_idx on public.revenue_entries (month);
create index files_meta_folder_idx on public.files_meta (folder);

-- ---------- board membership helper (bypasses RLS recursion) ----------

create or replace function public.is_board_member(b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from board_members where board_id = b and user_id = auth.uid())
      or exists (select 1 from boards where id = b and created_by = auth.uid());
$$;

-- ---------- RLS ----------

alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.whiteboards enable row level security;
alter table public.clients enable row level security;
alter table public.client_members enable row level security;
alter table public.leads enable row level security;
alter table public.lead_activity enable row level security;
alter table public.goals enable row level security;
alter table public.revenue_entries enable row level security;
alter table public.boards enable row level security;
alter table public.board_members enable row level security;
alter table public.board_lists enable row level security;
alter table public.cards enable row level security;
alter table public.card_assignees enable row level security;
alter table public.comments enable row level security;
alter table public.files_meta enable row level security;

-- profiles: everyone signed in can read the team; users edit themselves; admins edit anyone
create policy "profiles read" on public.profiles for select using (auth.uid() is not null);
create policy "profiles self update" on public.profiles for update
  using (id = auth.uid() or is_admin()) with check (id = auth.uid() or is_admin());
create policy "profiles admin insert" on public.profiles for insert with check (is_admin() or id = auth.uid());
create policy "profiles admin delete" on public.profiles for delete using (is_admin());

-- tasks: personal tasks visible only to owner; team/client tasks visible to all members.
-- Members update tasks assigned to them or created by them; admins anything.
create policy "tasks read" on public.tasks for select
  using (auth.uid() is not null and (not is_personal or assignee = auth.uid() or created_by = auth.uid()));
create policy "tasks insert" on public.tasks for insert
  with check (
    auth.uid() is not null
    and created_by = auth.uid()
    and (is_admin() or is_personal or assignee = auth.uid())
  );
create policy "tasks update" on public.tasks for update
  using (is_admin() or assignee = auth.uid() or created_by = auth.uid());
create policy "tasks delete" on public.tasks for delete
  using (is_admin() or created_by = auth.uid() or (is_personal and assignee = auth.uid()));

-- whiteboards: strictly private
create policy "whiteboards owner" on public.whiteboards for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- clients: all members see; only admins create/update/delete
create policy "clients read" on public.clients for select using (auth.uid() is not null);
create policy "clients admin write" on public.clients for insert with check (is_admin());
create policy "clients admin update" on public.clients for update using (is_admin());
create policy "clients admin delete" on public.clients for delete using (is_admin());

create policy "client_members read" on public.client_members for select using (auth.uid() is not null);
create policy "client_members admin write" on public.client_members for insert with check (is_admin());
create policy "client_members admin delete" on public.client_members for delete using (is_admin());

-- leads: all members read + create + update (stage moves); only admins delete
create policy "leads read" on public.leads for select using (auth.uid() is not null);
create policy "leads insert" on public.leads for insert with check (auth.uid() is not null);
create policy "leads update" on public.leads for update using (auth.uid() is not null);
create policy "leads admin delete" on public.leads for delete using (is_admin());

create policy "lead_activity read" on public.lead_activity for select using (auth.uid() is not null);
create policy "lead_activity insert" on public.lead_activity for insert
  with check (auth.uid() is not null and actor = auth.uid());

-- goals: everyone reads, admins write
create policy "goals read" on public.goals for select using (auth.uid() is not null);
create policy "goals admin insert" on public.goals for insert with check (is_admin());
create policy "goals admin update" on public.goals for update using (is_admin());
create policy "goals admin delete" on public.goals for delete using (is_admin());

-- revenue entries: everyone reads; pipeline entries by anyone (conversion flow), manual by admins
create policy "revenue read" on public.revenue_entries for select using (auth.uid() is not null);
create policy "revenue insert" on public.revenue_entries for insert
  with check (auth.uid() is not null and (source = 'pipeline' or is_admin()));
create policy "revenue admin update" on public.revenue_entries for update using (is_admin());
create policy "revenue admin delete" on public.revenue_entries for delete using (is_admin());

-- boards: visible to members + admins; anyone can create
create policy "boards read" on public.boards for select using (is_admin() or is_board_member(id));
create policy "boards insert" on public.boards for insert with check (created_by = auth.uid());
create policy "boards update" on public.boards for update using (is_admin() or created_by = auth.uid());
create policy "boards delete" on public.boards for delete using (is_admin() or created_by = auth.uid());

create policy "board_members read" on public.board_members for select
  using (is_admin() or is_board_member(board_id));
create policy "board_members write" on public.board_members for insert
  with check (is_admin() or is_board_member(board_id));
create policy "board_members delete" on public.board_members for delete
  using (is_admin() or is_board_member(board_id));

create policy "board_lists all" on public.board_lists for all
  using (is_admin() or is_board_member(board_id))
  with check (is_admin() or is_board_member(board_id));

create policy "cards all" on public.cards for all
  using (is_admin() or is_board_member(board_id))
  with check (is_admin() or is_board_member(board_id));

create policy "card_assignees all" on public.card_assignees for all
  using (is_admin() or exists (select 1 from cards c where c.id = card_id and is_board_member(c.board_id)))
  with check (is_admin() or exists (select 1 from cards c where c.id = card_id and is_board_member(c.board_id)));

-- comments: readable by all signed-in users (card comments are only reachable via visible boards)
create policy "comments read" on public.comments for select using (auth.uid() is not null);
create policy "comments insert" on public.comments for insert
  with check (auth.uid() is not null and author = auth.uid());
create policy "comments own update" on public.comments for update using (author = auth.uid() or is_admin());
create policy "comments delete" on public.comments for delete using (author = auth.uid() or is_admin());

-- files: everyone reads; uploaders delete their own; admins delete anything
create policy "files read" on public.files_meta for select using (auth.uid() is not null);
create policy "files insert" on public.files_meta for insert
  with check (auth.uid() is not null and uploaded_by = auth.uid());
create policy "files delete" on public.files_meta for delete
  using (is_admin() or uploaded_by = auth.uid());

-- ---------- storage ----------

insert into storage.buckets (id, name, public, file_size_limit)
values ('files', 'files', false, 52428800) -- 50MB cap
on conflict (id) do nothing;

create policy "storage read" on storage.objects for select
  using (bucket_id = 'files' and auth.uid() is not null);
create policy "storage insert" on storage.objects for insert
  with check (bucket_id = 'files' and auth.uid() is not null);
create policy "storage delete own or admin" on storage.objects for delete
  using (bucket_id = 'files' and (owner = auth.uid() or public.is_admin()));

-- ---------- realtime ----------

alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.leads;
alter publication supabase_realtime add table public.cards;
alter publication supabase_realtime add table public.board_lists;
alter publication supabase_realtime add table public.comments;
