-- ============================================================
-- IC HQ — demo seed data
-- Run AFTER 0001_init.sql, in the Supabase SQL editor.
--
-- Creates 4 auth users (password for all: `ic-hq-demo-1234`),
-- 3 clients, 8 leads, 1 board with 3 lists, the monthly revenue
-- goal and 4 milestone goals. Replace the emails below with the
-- team's real addresses before running (or later via the
-- Supabase Auth dashboard).
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- users ----------
do $$
declare
  u record;
begin
  for u in
    select * from (values
      ('11111111-1111-1111-1111-111111111111'::uuid, 'rayan@impactcreatives.co',  'Rayan',  'admin'),
      ('22222222-2222-2222-2222-222222222222'::uuid, 'awais@impactcreatives.co',  'Awais',  'admin'),
      ('33333333-3333-3333-3333-333333333333'::uuid, 'baseer@impactcreatives.co', 'Baseer', 'member'),
      ('44444444-4444-4444-4444-444444444444'::uuid, 'anas@impactcreatives.co',   'Anas',   'member')
    ) as t(id, email, full_name, role)
  loop
    -- the empty-string token fields matter: GoTrue errors with 500 on login
    -- if they are NULL on manually inserted users
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      confirmation_token, recovery_token, email_change,
      email_change_token_new, email_change_token_current,
      phone_change, phone_change_token, reauthentication_token
    ) values (
      '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated',
      u.email, crypt('ic-hq-demo-1234', gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', u.full_name, 'role', u.role),
      now(), now(),
      '', '', '', '', '', '', '', ''
    ) on conflict (id) do nothing;

    insert into auth.identities (
      id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), u.id, u.id::text,
      jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
      'email', now(), now(), now()
    ) on conflict do nothing;

    -- the auth trigger creates the profile; make sure role/name are right
    insert into public.profiles (id, full_name, role)
    values (u.id, u.full_name, u.role)
    on conflict (id) do update set full_name = excluded.full_name, role = excluded.role;
  end loop;
end $$;

-- ---------- clients ----------
insert into public.clients (id, company_name, contact_name, contact_handle, package_tier, deal_value, status, start_date, notes) values
  ('aaaa0000-0000-0000-0000-000000000001', 'Loopwell',   'Dana Reyes',  '@dana_loopwell',   'Launch Engine', 8500, 'in production', current_date - 12, 'Series A analytics SaaS. Launch video for their v2 release. Weekly check-in Thursdays.'),
  ('aaaa0000-0000-0000-0000-000000000002', 'Stackpilot', 'Omar Haddad', 'omar@stackpilot.io','Launch Spark',  4500, 'onboarding',    current_date - 3,  'YC W26. Fast turnaround wanted — 3 weeks to Product Hunt launch.'),
  ('aaaa0000-0000-0000-0000-000000000003', 'Nimbus HR',  'Priya Shah',  '@priya_nimbus',    'Custom',       12000, 'review',        current_date - 40, 'Two-video package: launch film + product walkthrough. V2 in review.');

insert into public.client_members (client_id, user_id) values
  ('aaaa0000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111'),
  ('aaaa0000-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333'),
  ('aaaa0000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222'),
  ('aaaa0000-0000-0000-0000-000000000002', '44444444-4444-4444-4444-444444444444'),
  ('aaaa0000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111'),
  ('aaaa0000-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222'),
  ('aaaa0000-0000-0000-0000-000000000003', '33333333-3333-3333-3333-333333333333');

-- ---------- team tasks ----------
insert into public.tasks (title, description, assignee, due_date, priority, status, created_by, client_id) values
  ('Storyboard v2 for Loopwell',        'Incorporate feedback from Thursday call', '33333333-3333-3333-3333-333333333333', current_date,     'high', 'doing', '11111111-1111-1111-1111-111111111111', 'aaaa0000-0000-0000-0000-000000000001'),
  ('Send Stackpilot onboarding form',   null,                                      '22222222-2222-2222-2222-222222222222', current_date,     'med',  'todo',  '22222222-2222-2222-2222-222222222222', 'aaaa0000-0000-0000-0000-000000000002'),
  ('Nimbus HR v2 review notes',         'Collect all comments into one doc',       '11111111-1111-1111-1111-111111111111', current_date - 1, 'high', 'todo',  '11111111-1111-1111-1111-111111111111', 'aaaa0000-0000-0000-0000-000000000003'),
  ('Cut 15s teaser for X',              null,                                      '44444444-4444-4444-4444-444444444444', current_date,     'med',  'todo',  '22222222-2222-2222-2222-222222222222', null),
  ('Update showreel with Loopwell shots', null,                                    '33333333-3333-3333-3333-333333333333', current_date + 2, 'low',  'todo',  '11111111-1111-1111-1111-111111111111', null),
  ('Invoice Nimbus HR (milestone 2)',   null,                                      '11111111-1111-1111-1111-111111111111', current_date,     'high', 'done',  '11111111-1111-1111-1111-111111111111', 'aaaa0000-0000-0000-0000-000000000003');

-- ---------- leads ----------
insert into public.leads (id, name, company, source, country, icp_fit, estimated_value, owner, stage, last_touch_date, next_follow_up_date, notes, halal_gate, flagged) values
  ('bbbb0000-0000-0000-0000-000000000001', 'Jake Miller',    'Sendly',      'X',        'USA',       true,  5000, '11111111-1111-1111-1111-111111111111', 'new',         null,             null,             'Posted about launching in Q3. Funded seed round.', true, false),
  ('bbbb0000-0000-0000-0000-000000000002', 'Lena Fischer',   'Datafold AI', 'referral', 'Germany',   true,  9000, '22222222-2222-2222-2222-222222222222', 'replied',     current_date - 1, current_date + 1, 'Referred by Loopwell. Wants pricing.', true, false),
  ('bbbb0000-0000-0000-0000-000000000003', 'Tom Okafor',     'Shiplane',    'X',        'UK',        true,  4500, '11111111-1111-1111-1111-111111111111', 'touch_1',     current_date - 2, current_date,     'Opened DM, no reply yet.', true, false),
  ('bbbb0000-0000-0000-0000-000000000004', 'Sara Kim',       'Finlio',      'email',    'Singapore', false, 3000, '22222222-2222-2222-2222-222222222222', 'touch_2',     current_date - 4, current_date - 1, 'Fintech budgeting app — not core ICP but promising.', true, true),
  ('bbbb0000-0000-0000-0000-000000000005', 'Marco Deluca',   'Cloudprint',  'X',        'Italy',     true,  6000, '11111111-1111-1111-1111-111111111111', 'call_booked', current_date - 1, current_date + 2, 'Call Friday 6pm PKT.', true, false),
  ('bbbb0000-0000-0000-0000-000000000006', 'Aisha Rahman',   'Teamloop',    'referral', 'UAE',       true,  7500, '22222222-2222-2222-2222-222222222222', 'converted',   current_date - 6, null,             'Closed on the second call.', true, false),
  ('bbbb0000-0000-0000-0000-000000000007', 'Chris Nolanber', 'Betstream',   'X',        'USA',       false, 8000, '11111111-1111-1111-1111-111111111111', 'dead',        current_date - 10, null,            'Failed category gate on closer look — betting adjacent.', true, false),
  ('bbbb0000-0000-0000-0000-000000000008', 'Yuki Tanaka',    'Formary',     'other',    'Japan',     true,  5500, '22222222-2222-2222-2222-222222222222', 'touch_1',     current_date - 3, current_date,     'Met at online design meetup.', true, false);

update public.leads set deal_value = 7500, closed_at = current_date - 6 where id = 'bbbb0000-0000-0000-0000-000000000006';

insert into public.lead_activity (lead_id, actor, from_stage, to_stage, note) values
  ('bbbb0000-0000-0000-0000-000000000006', '22222222-2222-2222-2222-222222222222', 'call_booked', 'converted', 'Closed at $7,500'),
  ('bbbb0000-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'replied', 'call_booked', null),
  ('bbbb0000-0000-0000-0000-000000000007', '11111111-1111-1111-1111-111111111111', 'touch_2', 'dead', 'Category gate fail');

-- ---------- goals + revenue ----------
insert into public.goals (type, title, target_amount, month, status) values
  ('revenue', 'Monthly revenue target', 20000, to_char(now(), 'YYYY-MM'), 'in_progress');

insert into public.goals (type, title, description, target_date, status, metric) values
  ('milestone', 'First $10k month',      'One calendar month with $10k+ closed revenue.', (date_trunc('month', now()) + interval '1 month - 1 day')::date, 'in_progress', '$10,000 closed'),
  ('milestone', 'Move into an office',   'A real studio space in Islamabad.',             (now() + interval '4 months')::date, 'not_started', null),
  ('milestone', 'Grow team to 6',        'Two more motion designers on board.',           (now() + interval '6 months')::date, 'not_started', '6 people'),
  ('milestone', 'Bali departure ready',  'Enough MRR + savings for the team trip.',       (now() + interval '9 months')::date, 'not_started', null);

insert into public.revenue_entries (source, amount, month, lead_id, note, created_by) values
  ('pipeline', 7500, to_char(now(), 'YYYY-MM'), 'bbbb0000-0000-0000-0000-000000000006', 'Teamloop — launch video', '22222222-2222-2222-2222-222222222222'),
  ('manual',   4500, to_char(now(), 'YYYY-MM'), null, 'Stackpilot — closed via warm intro outside pipeline', '11111111-1111-1111-1111-111111111111');

-- ---------- board ----------
insert into public.boards (id, name, description, color, created_by) values
  ('cccc0000-0000-0000-0000-000000000001', 'Content Calendar', 'X posts, case studies and behind-the-scenes clips.', '#BF5AF2', '11111111-1111-1111-1111-111111111111');

insert into public.board_members (board_id, user_id) values
  ('cccc0000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111'),
  ('cccc0000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222'),
  ('cccc0000-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444');

insert into public.board_lists (id, board_id, name, position) values
  ('dddd0000-0000-0000-0000-000000000001', 'cccc0000-0000-0000-0000-000000000001', 'Ideas',       1),
  ('dddd0000-0000-0000-0000-000000000002', 'cccc0000-0000-0000-0000-000000000001', 'In Progress', 2),
  ('dddd0000-0000-0000-0000-000000000003', 'cccc0000-0000-0000-0000-000000000001', 'Published',   3);

insert into public.cards (board_id, list_id, title, description, position, labels, checklist, created_by) values
  ('cccc0000-0000-0000-0000-000000000001', 'dddd0000-0000-0000-0000-000000000001', 'Case study: Loopwell launch', 'Full breakdown thread with stills.', 1, '["case study"]', '[]', '11111111-1111-1111-1111-111111111111'),
  ('cccc0000-0000-0000-0000-000000000001', 'dddd0000-0000-0000-0000-000000000001', 'BTS: styleframe process', null, 2, '["bts"]', '[]', '22222222-2222-2222-2222-222222222222'),
  ('cccc0000-0000-0000-0000-000000000001', 'dddd0000-0000-0000-0000-000000000002', '15s teaser — Nimbus HR', 'Waiting on final color pass.', 1, '["teaser"]', '[{"id":"1","text":"Pick best 3 shots","done":true},{"id":"2","text":"Sound design","done":false}]', '22222222-2222-2222-2222-222222222222'),
  ('cccc0000-0000-0000-0000-000000000001', 'dddd0000-0000-0000-0000-000000000003', 'Founder story post', 'Did 48k impressions.', 1, '["published"]', '[]', '11111111-1111-1111-1111-111111111111');
