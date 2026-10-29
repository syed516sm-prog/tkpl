-- ============================================================================
-- T-KPL (Tennis Ball Kadapa Premier League)
-- Complete database setup for a FRESH Supabase project.
-- Paste this whole file into Supabase -> SQL Editor -> New query -> Run.
-- Safe to run once. (Re-running mostly works too, because of "if not exists".)
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. TABLES
-- ----------------------------------------------------------------------------

create sequence if not exists public.tkpl_registration_seq start 101 increment 1;

-- Organizers who can sign in to the admin desk (linked to Supabase Auth users)
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null,
  role text not null check (role in ('super_admin', 'registration_reviewer', 'payment_verifier', 'read_only_helper')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- One single row (id = 1) holding fee, deadline, rules, etc.
create table if not exists public.tournament_settings (
  id integer primary key default 1 check (id = 1),
  tournament_name text not null default 'T-KPL · Tennis Ball Kadapa Premier League',
  organizer_line text not null default 'SULTAN SPORTS (KADAPA) · 9110744945',
  partner_line text not null default 'NR SPORTS (VEMPALLI) · 8919155512',
  season text not null default 'Grand Launch · Guru Laser Ball League',
  fee_paise integer not null default 39900 check (fee_paise >= 0),
  currency text not null default 'INR',
  upi_id text not null default 'sultansports.tkpl@upi',
  registration_open boolean not null default true,
  deadline timestamptz not null default '2026-11-30T18:29:59Z',
  min_age integer not null default 15,
  max_age integer not null default 50,
  rules_text text not null default 'New Kadapa and Old Kadapa players only. Players are picked by the official auction (15 players per team; base price Rs 1,000 for best batsman/bowler, Rs 2,000 for all-rounder). Every selected player gets 1 dress set + 1 extra T-shirt. All matches are streamed live on YouTube.',
  refund_policy text not null default 'Payments are verified against official bank/UPI statements. A screenshot alone is never treated as proof of payment.',
  privacy_notice text not null default 'Player photos, date of birth, locality and phone numbers are stored privately for Kadapa eligibility checks and the official T-KPL player auction.',
  contact_text text not null default 'Sultan Sports Kadapa: 9110744945 | NR Sports Vempalli: 8919155512',
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

insert into public.tournament_settings (id) values (1) on conflict (id) do nothing;

-- Players
create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  registration_no text unique not null,
  full_name text not null check (char_length(trim(full_name)) >= 2),
  phone text not null check (phone ~ '^[6-9][0-9]{9}$'),
  date_of_birth date not null,
  locality text not null check (char_length(trim(locality)) >= 2),
  role text not null check (role in ('batter', 'bowler', 'all_rounder', 'wicketkeeper')),
  batting_hand text not null default 'right_hand' check (batting_hand in ('right_hand', 'left_hand')),
  bowling_style text not null default 'none' check (bowling_style in ('right_arm_pace', 'right_arm_spin', 'left_arm_pace', 'left_arm_spin', 'none')),
  experience text not null default '',
  emergency_contact text not null default '',
  photo_path text not null check (photo_path like 'registrations/%'),
  registration_status text not null default 'submitted' check (
    registration_status in ('submitted', 'under_review', 'needs_correction', 'approved', 'rejected', 'withdrawn')
  ),
  auction_status text not null default 'not_reviewed' check (
    auction_status in ('not_reviewed', 'eligible', 'ineligible', 'drafted')
  ),
  review_notes text not null default '',
  rules_acknowledged boolean not null default true check (rules_acknowledged = true),
  marketing_consent boolean not null default false,
  consent_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint players_unique_phone unique (phone)
);

create index if not exists idx_players_registration_status on public.players(registration_status);
create index if not exists idx_players_auction_status on public.players(auction_status);
create index if not exists idx_players_locality on public.players(locality);

-- Payments (money kept as integer paise: Rs 399 = 39900)
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  amount_paise integer not null check (amount_paise >= 0),
  currency text not null default 'INR',
  method text not null default 'upi' check (method in ('upi', 'bank_transfer', 'cash_organizer')),
  transaction_ref text not null default '',
  receipt_path text not null default '',
  status text not null default 'pending' check (
    status in ('pending', 'submitted', 'verified', 'failed', 'refunded')
  ),
  verified_by uuid references auth.users(id),
  verifier_name text not null default '',
  verified_at timestamptz,
  refund_ref text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_payments_player_id on public.payments(player_id);
create index if not exists idx_payments_status on public.payments(status);

-- Audit trail (filled in automatically by triggers; nobody writes to it by hand)
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id),
  actor_name text not null default 'Public Applicant',
  actor_role text not null default 'applicant',
  action text not null,
  entity_type text not null,
  entity_id text not null,
  old_values jsonb,
  new_values jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_created_at on public.audit_logs(created_at desc);

-- Franchise (team owner) enquiries: Rs 1.6 lakh deposit teams
create table if not exists public.franchise_enquiries (
  id uuid primary key default gen_random_uuid(),
  owner_name text not null check (char_length(trim(owner_name)) >= 2),
  phone text not null check (phone ~ '^[6-9][0-9]{9}$'),
  town text not null default '',
  team_name text not null default '',
  message text not null default '',
  status text not null default 'new' check (status in ('new', 'contacted', 'confirmed', 'declined')),
  created_at timestamptz not null default now()
);

-- Phase 2 (auction) tables, created now so we do not need to migrate later
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  team_name text unique not null,
  owner_name text not null,
  captain_player_id uuid references public.players(id),
  purse_paise integer not null default 8000000,
  created_at timestamptz not null default now()
);

create table if not exists public.team_memberships (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  sold_price_paise integer not null default 0,
  assigned_at timestamptz not null default now(),
  unique (player_id)
);

create table if not exists public.auction_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_date timestamptz,
  status text not null default 'planned' check (status in ('planned', 'live', 'completed')),
  rules_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.auction_bids (
  id uuid primary key default gen_random_uuid(),
  auction_event_id uuid not null references public.auction_events(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  amount_paise integer not null check (amount_paise > 0),
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 2. HELPER FUNCTIONS
-- ----------------------------------------------------------------------------

-- Is the signed-in user an active admin with one of these roles?
create or replace function public.has_admin_role(allowed_roles text[])
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users au
    where au.user_id = auth.uid()
      and au.active = true
      and au.role = any(allowed_roles)
  );
$$;

-- ----------------------------------------------------------------------------
-- 3. TRIGGERS (rules the database enforces by itself)
-- ----------------------------------------------------------------------------

-- 3a. New players get a server-made number: TKPL-2026-0101, 0102, ...
create or replace function public.assign_registration_no()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.registration_no := 'TKPL-2026-' || lpad(nextval('public.tkpl_registration_seq')::text, 4, '0');
  return new;
end;
$$;

drop trigger if exists trg_players_assign_reg_no on public.players;
create trigger trg_players_assign_reg_no
before insert on public.players
for each row execute function public.assign_registration_no();

-- 3b. Player update rules
create or replace function public.guard_player_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_paid boolean;
begin
  if new.id <> old.id or new.registration_no <> old.registration_no then
    raise exception 'IMMUTABLE_FIELD: id and registration number can never be changed.';
  end if;

  -- Only the super admin may edit identity details (name, phone, DOB, photo).
  if auth.uid() is not null and not public.has_admin_role(array['super_admin']) then
    if new.full_name is distinct from old.full_name
       or new.phone is distinct from old.phone
       or new.date_of_birth is distinct from old.date_of_birth
       or new.photo_path is distinct from old.photo_path then
      raise exception 'FORBIDDEN_FIELD: only the Super Admin can edit player identity details.';
    end if;
  end if;

  -- Auction eligibility needs: profile approved AND fee verified.
  if new.auction_status in ('eligible', 'drafted') then
    if new.registration_status <> 'approved' then
      raise exception 'NOT_APPROVED: a player must be Approved before becoming Auction Eligible.';
    end if;
    select exists (select 1 from public.payments where player_id = new.id and status = 'verified') into v_paid;
    if not v_paid then
      raise exception 'PAYMENT_NOT_VERIFIED: fee payment must be Verified before a player becomes Auction Eligible.';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_players_guard_update on public.players;
create trigger trg_players_guard_update
before update on public.players
for each row execute function public.guard_player_update();

-- 3c. Payment update rules (who verified and when is stamped automatically)
create or replace function public.guard_payment_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
begin
  if new.status = 'verified' and old.status is distinct from 'verified' then
    if char_length(trim(new.transaction_ref)) < 3 then
      raise exception 'REFERENCE_REQUIRED: record a UPI UTR, bank reference or cash receipt number before verifying.';
    end if;
    select full_name into v_name from public.admin_users where user_id = auth.uid();
    new.verified_by := auth.uid();
    new.verifier_name := coalesce(v_name, '');
    new.verified_at := now();
  end if;

  if new.status = 'refunded' and char_length(trim(new.refund_ref)) < 3 then
    raise exception 'REFUND_REF_REQUIRED: record a refund reference before marking Refunded.';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_payments_guard_update on public.payments;
create trigger trg_payments_guard_update
before update on public.payments
for each row execute function public.guard_payment_update();

-- 3d. If a payment stops being Verified, the player drops out of the auction pool
create or replace function public.downgrade_player_if_unpaid()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status <> 'verified' then
    update public.players
       set auction_status = 'not_reviewed'
     where id = new.player_id and auction_status in ('eligible', 'drafted');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_payments_downgrade on public.payments;
create trigger trg_payments_downgrade
after update on public.payments
for each row execute function public.downgrade_player_if_unpaid();

-- 3e. Settings: remember who changed them
create or replace function public.stamp_settings_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_by := auth.uid();
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_settings_stamp on public.tournament_settings;
create trigger trg_settings_stamp
before update on public.tournament_settings
for each row execute function public.stamp_settings_update();

-- 3f. Automatic audit log for players, payments and settings
create or replace function public.log_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_role text;
  v_new jsonb := to_jsonb(new);
  v_old jsonb := case when tg_op = 'UPDATE' then to_jsonb(old) else null end;
  v_entity text;
begin
  if tg_op = 'UPDATE' and (v_new - 'updated_at') = (v_old - 'updated_at') then
    return new;
  end if;

  select full_name, role into v_name, v_role from public.admin_users where user_id = auth.uid();

  v_entity := case tg_table_name
    when 'players' then v_new ->> 'registration_no'
    when 'payments' then (select registration_no from public.players where id = (v_new ->> 'player_id')::uuid)
    else '1'
  end;

  insert into public.audit_logs (actor_user_id, actor_name, actor_role, action, entity_type, entity_id, old_values, new_values)
  values (
    auth.uid(),
    coalesce(v_name, 'Public Applicant'),
    coalesce(v_role, 'applicant'),
    upper(tg_table_name) || '_' || tg_op,
    tg_table_name,
    coalesce(v_entity, 'unknown'),
    v_old,
    v_new
  );
  return new;
end;
$$;

drop trigger if exists trg_audit_players on public.players;
create trigger trg_audit_players after insert or update on public.players
for each row execute function public.log_audit();

drop trigger if exists trg_audit_payments on public.payments;
create trigger trg_audit_payments after insert or update on public.payments
for each row execute function public.log_audit();

drop trigger if exists trg_audit_settings on public.tournament_settings;
create trigger trg_audit_settings after update on public.tournament_settings
for each row execute function public.log_audit();

-- ----------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY (who can see / change what)
-- ----------------------------------------------------------------------------
-- RLS ON + no policy = nobody (except the database owner) can touch the table.
-- The public website talks ONLY to the safe functions in section 5.

alter table public.admin_users enable row level security;
alter table public.tournament_settings enable row level security;
alter table public.players enable row level security;
alter table public.payments enable row level security;
alter table public.audit_logs enable row level security;
alter table public.franchise_enquiries enable row level security;
alter table public.teams enable row level security;
alter table public.team_memberships enable row level security;
alter table public.auction_events enable row level security;
alter table public.auction_bids enable row level security;

drop policy if exists "Public can view tournament settings" on public.tournament_settings;
create policy "Public can view tournament settings"
  on public.tournament_settings for select using (true);

drop policy if exists "Super admin can update tournament settings" on public.tournament_settings;
create policy "Super admin can update tournament settings"
  on public.tournament_settings for update
  using (public.has_admin_role(array['super_admin']))
  with check (public.has_admin_role(array['super_admin']));

drop policy if exists "Admins can view own admin profile" on public.admin_users;
create policy "Admins can view own admin profile"
  on public.admin_users for select
  using (auth.uid() = user_id or public.has_admin_role(array['super_admin']));

drop policy if exists "Super admin manages admin users" on public.admin_users;
create policy "Super admin manages admin users"
  on public.admin_users for all
  using (public.has_admin_role(array['super_admin']))
  with check (public.has_admin_role(array['super_admin']));

drop policy if exists "Authorized admins can read players" on public.players;
create policy "Authorized admins can read players"
  on public.players for select
  using (public.has_admin_role(array['super_admin', 'registration_reviewer', 'payment_verifier', 'read_only_helper']));

drop policy if exists "Reviewers and super admins can update players" on public.players;
create policy "Reviewers and super admins can update players"
  on public.players for update
  using (public.has_admin_role(array['super_admin', 'registration_reviewer']))
  with check (public.has_admin_role(array['super_admin', 'registration_reviewer']));

drop policy if exists "Authorized admins can read payments" on public.payments;
create policy "Authorized admins can read payments"
  on public.payments for select
  using (public.has_admin_role(array['super_admin', 'payment_verifier', 'registration_reviewer', 'read_only_helper']));

drop policy if exists "Payment verifiers and super admins can update payments" on public.payments;
create policy "Payment verifiers and super admins can update payments"
  on public.payments for update
  using (public.has_admin_role(array['super_admin', 'payment_verifier']))
  with check (public.has_admin_role(array['super_admin', 'payment_verifier']));

drop policy if exists "Admins can read audit logs" on public.audit_logs;
create policy "Admins can read audit logs"
  on public.audit_logs for select
  using (public.has_admin_role(array['super_admin', 'registration_reviewer', 'payment_verifier']));

drop policy if exists "Admins can read franchise enquiries" on public.franchise_enquiries;
create policy "Admins can read franchise enquiries"
  on public.franchise_enquiries for select
  using (public.has_admin_role(array['super_admin', 'registration_reviewer']));

drop policy if exists "Admins can update franchise enquiries" on public.franchise_enquiries;
create policy "Admins can update franchise enquiries"
  on public.franchise_enquiries for update
  using (public.has_admin_role(array['super_admin']))
  with check (public.has_admin_role(array['super_admin']));

-- ----------------------------------------------------------------------------
-- 5. SAFE PUBLIC FUNCTIONS (the only door for the public website)
-- ----------------------------------------------------------------------------

-- 5a. Register a player (also enforces open/closed, deadline, age, duplicates)
--     Fees are paid online via Razorpay (see 0002). The last two parameters are
--     kept only so older callers still compile; their values are ignored and
--     every new payment starts as method='razorpay', status='pending'.
create or replace function public.submit_player_registration(
  p_full_name text,
  p_phone text,
  p_date_of_birth date,
  p_locality text,
  p_role text,
  p_batting_hand text,
  p_bowling_style text,
  p_experience text,
  p_emergency_contact text,
  p_photo_path text,
  p_rules_acknowledged boolean,
  p_marketing_consent boolean,
  p_payment_method text default 'upi',
  p_transaction_ref text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_settings public.tournament_settings%rowtype;
  v_player public.players%rowtype;
  v_phone text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  v_age integer;
  v_pay_status text;
begin
  -- p_payment_method / p_transaction_ref are intentionally unused (online payment only).
  if length(v_phone) = 12 and left(v_phone, 2) = '91' then
    v_phone := right(v_phone, 10);
  end if;

  select * into v_settings from public.tournament_settings where id = 1;
  if not found or not v_settings.registration_open then
    raise exception 'REGISTRATIONS_CLOSED: Player registrations are currently closed.';
  end if;
  if now() > v_settings.deadline then
    raise exception 'DEADLINE_PASSED: The registration deadline has passed.';
  end if;
  if v_phone !~ '^[6-9][0-9]{9}$' then
    raise exception 'INVALID_PHONE: Enter a valid 10-digit mobile number.';
  end if;
  if p_date_of_birth is null then
    raise exception 'INVALID_DOB: Date of birth is required.';
  end if;

  v_age := extract(year from age(p_date_of_birth));
  if v_age < v_settings.min_age or v_age > v_settings.max_age then
    raise exception 'AGE_NOT_ELIGIBLE: Players must be between % and % years old.', v_settings.min_age, v_settings.max_age;
  end if;

  if p_photo_path is null or p_photo_path not like 'registrations/%' then
    raise exception 'PHOTO_REQUIRED: A player photograph is required.';
  end if;
  if p_rules_acknowledged is not true then
    raise exception 'RULES_NOT_ACCEPTED: Please accept the tournament rules.';
  end if;
  if exists (select 1 from public.players where phone = v_phone) then
    raise exception 'DUPLICATE_PHONE: A registration already exists with this mobile number. Use Check Status.';
  end if;

  begin
    insert into public.players (
      registration_no, full_name, phone, date_of_birth, locality, role,
      batting_hand, bowling_style, experience, emergency_contact, photo_path,
      rules_acknowledged, marketing_consent
    ) values (
      'pending', trim(p_full_name), v_phone, p_date_of_birth, trim(p_locality), p_role,
      coalesce(p_batting_hand, 'right_hand'), coalesce(p_bowling_style, 'none'),
      coalesce(trim(p_experience), ''), coalesce(trim(p_emergency_contact), ''),
      p_photo_path, true, coalesce(p_marketing_consent, false)
    )
    returning * into v_player;
  exception when unique_violation then
    raise exception 'DUPLICATE_PHONE: A registration already exists with this mobile number. Use Check Status.';
  end;

  v_pay_status := 'pending';

  insert into public.payments (player_id, amount_paise, currency, method, transaction_ref, status)
  values (v_player.id, v_settings.fee_paise, v_settings.currency, 'razorpay', '', v_pay_status);

  return jsonb_build_object(
    'player_id', v_player.id,
    'registration_no', v_player.registration_no,
    'full_name', v_player.full_name,
    'registration_status', v_player.registration_status,
    'payment_status', v_pay_status,
    'created_at', v_player.created_at
  );
end;
$$;

-- 5b. Status lookup: needs registration number + phone + date of birth together
create or replace function public.lookup_registration_status(
  p_registration_no text,
  p_phone text,
  p_date_of_birth date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player public.players%rowtype;
  v_payment public.payments%rowtype;
  v_phone text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
begin
  if length(v_phone) = 12 and left(v_phone, 2) = '91' then
    v_phone := right(v_phone, 10);
  end if;

  select * into v_player
  from public.players
  where upper(trim(registration_no)) = upper(trim(p_registration_no))
    and phone = v_phone
    and date_of_birth = p_date_of_birth;

  if not found then
    return null;
  end if;

  select * into v_payment from public.payments
  where player_id = v_player.id order by created_at desc limit 1;

  return jsonb_build_object(
    'registration_no', v_player.registration_no,
    'full_name', v_player.full_name,
    'locality', v_player.locality,
    'role', v_player.role,
    'registration_status', v_player.registration_status,
    'auction_status', v_player.auction_status,
    'review_notes', v_player.review_notes,
    'payment_status', coalesce(v_payment.status, 'pending'),
    'transaction_ref', coalesce(v_payment.transaction_ref, ''),
    'submitted_at', v_player.created_at
  );
end;
$$;

-- 5c. Player adds / updates their payment reference later (never "verified" by them)
create or replace function public.submit_payment_reference(
  p_registration_no text,
  p_phone text,
  p_date_of_birth date,
  p_method text,
  p_transaction_ref text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status jsonb;
  v_player_id uuid;
  v_current text;
  v_phone text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  v_ref text := trim(coalesce(p_transaction_ref, ''));
begin
  if length(v_phone) = 12 and left(v_phone, 2) = '91' then
    v_phone := right(v_phone, 10);
  end if;
  if char_length(v_ref) < 4 then
    raise exception 'REFERENCE_TOO_SHORT: Enter a valid UPI UTR or receipt number (at least 4 characters).';
  end if;

  select id into v_player_id
  from public.players
  where upper(trim(registration_no)) = upper(trim(p_registration_no))
    and phone = v_phone
    and date_of_birth = p_date_of_birth;

  if v_player_id is null then
    raise exception 'NOT_FOUND: Could not verify your Registration Number, Mobile Number and Date of Birth.';
  end if;

  select status into v_current from public.payments
  where player_id = v_player_id order by created_at desc limit 1;

  if v_current in ('verified', 'refunded') then
    raise exception 'ALREADY_FINAL: This payment is already %. It cannot be changed here.', v_current;
  end if;

  update public.payments
     set method = coalesce(p_method, method),
         transaction_ref = v_ref,
         status = 'submitted',
         notes = 'Reference submitted by player; waiting for organizer verification.'
   where id = (select id from public.payments where player_id = v_player_id order by created_at desc limit 1);

  v_status := public.lookup_registration_status(p_registration_no, p_phone, p_date_of_birth);
  return v_status;
end;
$$;

-- 5d. Numbers for the home page (no personal data)
create or replace function public.get_public_stats()
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  select jsonb_build_object(
    'registered_count', (select count(*) from public.players),
    'confirmed_count', (select count(*) from public.payments where status = 'verified'),
    'auction_eligible_count', (select count(*) from public.players where auction_status = 'eligible')
  );
$$;

-- 5e. Franchise (team owner) enquiry from the public site
create or replace function public.submit_franchise_enquiry(
  p_owner_name text,
  p_phone text,
  p_town text,
  p_team_name text,
  p_message text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phone text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  v_id uuid;
begin
  if length(v_phone) = 12 and left(v_phone, 2) = '91' then
    v_phone := right(v_phone, 10);
  end if;
  if v_phone !~ '^[6-9][0-9]{9}$' then
    raise exception 'INVALID_PHONE: Enter a valid 10-digit mobile number.';
  end if;

  insert into public.franchise_enquiries (owner_name, phone, town, team_name, message)
  values (trim(p_owner_name), v_phone, coalesce(trim(p_town), ''), coalesce(trim(p_team_name), ''), coalesce(trim(p_message), ''))
  returning id into v_id;

  return jsonb_build_object('enquiry_id', v_id);
end;
$$;

-- 5f. Record that an admin exported a CSV (so exports show up in the audit log)
create or replace function public.log_export(p_kind text, p_count integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_role text;
begin
  if not public.has_admin_role(array['super_admin', 'registration_reviewer']) then
    raise exception 'FORBIDDEN: your role cannot export player data.';
  end if;
  select full_name, role into v_name, v_role from public.admin_users where user_id = auth.uid();
  insert into public.audit_logs (actor_user_id, actor_name, actor_role, action, entity_type, entity_id, new_values)
  values (auth.uid(), coalesce(v_name, ''), coalesce(v_role, ''), 'ROSTER_CSV_EXPORTED', 'export', coalesce(p_kind, 'unknown'),
          jsonb_build_object('count', p_count));
end;
$$;

-- Lock down who may call each function
revoke all on function public.submit_player_registration(text, text, date, text, text, text, text, text, text, text, boolean, boolean, text, text) from public;
revoke all on function public.lookup_registration_status(text, text, date) from public;
revoke all on function public.submit_payment_reference(text, text, date, text, text) from public;
revoke all on function public.get_public_stats() from public;
revoke all on function public.submit_franchise_enquiry(text, text, text, text, text) from public;
revoke all on function public.log_export(text, integer) from public;
revoke all on function public.has_admin_role(text[]) from public;

grant execute on function public.submit_player_registration(text, text, date, text, text, text, text, text, text, text, boolean, boolean, text, text) to anon, authenticated;
grant execute on function public.lookup_registration_status(text, text, date) to anon, authenticated;
grant execute on function public.submit_payment_reference(text, text, date, text, text) to anon, authenticated;
grant execute on function public.get_public_stats() to anon, authenticated;
grant execute on function public.submit_franchise_enquiry(text, text, text, text, text) to anon, authenticated;
grant execute on function public.log_export(text, integer) to authenticated;
grant execute on function public.has_admin_role(text[]) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 6. PRIVATE PHOTO STORAGE
-- ----------------------------------------------------------------------------
-- Bucket is PRIVATE. Anyone may upload ONE image into the "registrations/"
-- folder (max 5 MB, jpeg/png/webp). Only signed-in admins can view photos.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('player-photos', 'player-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = 5242880,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "Public can upload registration photos" on storage.objects;
create policy "Public can upload registration photos"
  on storage.objects for insert
  to anon, authenticated
  with check (
    bucket_id = 'player-photos'
    and (storage.foldername(name))[1] = 'registrations'
  );

drop policy if exists "Admins can view player photos" on storage.objects;
create policy "Admins can view player photos"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'player-photos'
    and public.has_admin_role(array['super_admin', 'registration_reviewer', 'payment_verifier', 'read_only_helper'])
  );

-- ============================================================================
-- DONE. Next: run supabase/admin_setup.sql after creating the admin logins.
-- ============================================================================
