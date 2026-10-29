-- ============================================================================
-- T-KPL: Razorpay payments + downloadable player receipts.
-- Run this AFTER 0001_tkpl_schema_and_rls.sql.
-- Additive and re-runnable: every statement uses "if not exists" / "create or
-- replace", so running it twice is safe.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. SUPERSEDED ORDERS  (orders that were replaced by a newer pay attempt)
-- ----------------------------------------------------------------------------
create table if not exists public.replaced_razorpay_orders (
  order_id text primary key,
  registration_no text not null,
  created_at timestamptz not null default now()
);

alter table public.replaced_razorpay_orders enable row level security;
-- No policies: only the SECURITY DEFINER functions and the service role touch it.

create index if not exists idx_replaced_orders_reg
  on public.replaced_razorpay_orders(registration_no);

-- ----------------------------------------------------------------------------
-- 1. PAYMENT COLUMNS
-- ----------------------------------------------------------------------------
alter table public.payments add column if not exists razorpay_order_id text;
alter table public.payments add column if not exists razorpay_payment_id text;
alter table public.payments add column if not exists receipt_no text;
alter table public.payments add column if not exists paid_at timestamptz;
alter table public.payments add column if not exists receipt_issued_at timestamptz;

-- Handler decision snapshot (a refund can be paid at a different price than the
-- current setting; the receipt must keep the price that was actually charged).
alter table public.payments add column if not exists razorpay_handler text;
alter table public.payments add column if not exists razorpay_mode text;

-- One receipt number, one Razorpay payment id, ever.
create unique index if not exists idx_payments_receipt_no
  on public.payments(receipt_no) where receipt_no is not null;

create unique index if not exists idx_payments_razorpay_payment_id
  on public.payments(razorpay_payment_id) where razorpay_payment_id is not null;

create index if not exists idx_payments_razorpay_order_id
  on public.payments(razorpay_order_id) where razorpay_order_id is not null;

-- ----------------------------------------------------------------------------
-- 2. ALLOW method = 'razorpay'
-- ----------------------------------------------------------------------------
alter table public.payments drop constraint if exists payments_method_check;
alter table public.payments add constraint payments_method_check
  check (method in ('upi', 'bank_transfer', 'cash_organizer', 'razorpay'));

-- ----------------------------------------------------------------------------
-- 3. RECEIPT NUMBER SEQUENCE  (TKPL-RCPT-2026-0001, 0002, ...)
-- ----------------------------------------------------------------------------
create sequence if not exists public.tkpl_receipt_seq start 1 increment 1;

create or replace function public.next_receipt_no()
returns text
language sql
security definer
set search_path = public
as $$
  select 'TKPL-RCPT-2026-' || lpad(nextval('public.tkpl_receipt_seq')::text, 4, '0');
$$;

-- ----------------------------------------------------------------------------
-- 4. PAYMENT UPDATE TRIGGER
--    Online payments are proven by the Razorpay payment id (checked by the
--    server function), not by a hand-typed UTR. Only Razorpay rows may skip the
--    UTR rule.
-- ----------------------------------------------------------------------------
create or replace function public.guard_payment_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_ref text := trim(coalesce(new.transaction_ref, ''));
  v_rzp text := trim(coalesce(new.razorpay_payment_id, ''));
begin
  if new.status = 'verified' and old.status is distinct from 'verified' then
    if new.method = 'razorpay' then
      if char_length(v_rzp) < 8 then
        raise exception 'PAYMENT_ID_REQUIRED: a Razorpay payment id is needed before an online payment can be verified.';
      end if;
    elsif char_length(v_ref) < 3 then
      raise exception 'REFERENCE_REQUIRED: record a UPI UTR, bank reference or cash receipt number before verifying.';
    end if;
    select full_name into v_name from public.admin_users where user_id = auth.uid();
    new.verified_by := auth.uid();
    new.verifier_name := coalesce(v_name, 'verified online');
    new.verified_at := now();
  end if;

  -- A Razorpay row is machine-verifiable: it may only be Verified, Refunded or
  -- Failed. It can never be pushed back to "submitted" (that would let someone
  -- re-attach a different UTR to a paid online order).
  if old.method = 'razorpay' and old.status in ('verified', 'refunded') and new.status in ('submitted', 'pending') then
    raise exception 'ONLINE_PAYMENT_LOCKED: a Razorpay payment can only be marked Verified, Failed or Refunded.';
  end if;

  if new.status = 'refunded' and char_length(trim(new.refund_ref)) < 3 then
    raise exception 'REFUND_REF_REQUIRED: record a refund reference before marking Refunded.';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- 5. RPC: verify_razorpay_payment  (SERVER ONLY - service role)
--    Called by api/razorpay/verify-payment.ts after the HMAC check. Marks the
--    payment verified and mints the receipt number in one atomic step, so a
--    retried request returns the same receipt instead of a second one.
-- ----------------------------------------------------------------------------
create or replace function public.verify_razorpay_payment(
  p_order_id text,
  p_payment_id text,
  p_signature_ok boolean,
  p_handler text default null,
  p_mode text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.payments%rowtype;
  v_registration_no text;
  v_handler text := nullif(trim(coalesce(p_handler, '')), '');
  v_mode text := nullif(trim(coalesce(p_mode, '')), '');
begin
  if p_signature_ok is not true then
    raise exception 'SIGNATURE_MISMATCH: Razorpay signature verification failed.';
  end if;

  select * into v_payment
  from public.payments
  where razorpay_order_id = trim(coalesce(p_order_id, ''))
  order by created_at desc
  limit 1;

  if found then
    select registration_no into v_registration_no
    from public.players where id = v_payment.player_id;
  else
    -- The order may be an earlier, replaced attempt for the same registration:
    -- the customer can have paid the old order after "Pay again" created a new
    -- one. Accept a captured payment against it instead of losing the money.
    select r.registration_no into v_registration_no
    from public.replaced_razorpay_orders r
    where r.order_id = trim(coalesce(p_order_id, ''));

    if v_registration_no is null then
      raise exception 'ORDER_NOT_FOUND: no payment is linked to this Razorpay order.';
    end if;

    select * into v_payment
    from public.payments
    where player_id = (select id from public.players where registration_no = v_registration_no)
    order by created_at desc
    limit 1;

    if not found then
      raise exception 'ORDER_NOT_FOUND: no payment is linked to this Razorpay order.';
    end if;
  end if;

  -- Idempotent: already verified with this payment id -> return the same receipt.
  if v_payment.status = 'verified'
     and v_payment.razorpay_payment_id = trim(coalesce(p_payment_id, '')) then
    return jsonb_build_object(
      'payment_id', v_payment.id,
      'registration_no', v_registration_no,
      'receipt_no', v_payment.receipt_no,
      'status', v_payment.status
    );
  end if;

  if v_payment.status in ('verified', 'refunded') then
    raise exception 'ALREADY_PAID: this registration fee is already %.', v_payment.status;
  end if;

  update public.payments
     set status = 'verified',
         method = 'razorpay',
         razorpay_order_id = trim(coalesce(p_order_id, '')),
         razorpay_payment_id = trim(coalesce(p_payment_id, '')),
         transaction_ref = trim(coalesce(p_payment_id, '')),
         paid_at = now(),
         receipt_no = coalesce(receipt_no, public.next_receipt_no()),
         receipt_issued_at = now(),
         razorpay_handler = coalesce(v_handler, razorpay_handler),
         razorpay_mode = coalesce(v_mode, razorpay_mode),
         notes = 'Paid online via Razorpay.'
   where id = v_payment.id
   returning * into v_payment;

  insert into public.audit_logs (actor_user_id, actor_name, actor_role, action, entity_type, entity_id, old_values, new_values)
  values (
    null,
    'Razorpay (server verified)',
    'system',
    'PAYMENT_VERIFIED_RAZORPAY',
    'payment',
    coalesce(v_registration_no, v_payment.id::text),
    jsonb_build_object('status', 'pending'),
    jsonb_build_object(
      'status', 'verified',
      'receipt_no', v_payment.receipt_no,
      'razorpay_order_id', v_payment.razorpay_order_id,
      'razorpay_payment_id', v_payment.razorpay_payment_id,
      'razorpay_handler', v_payment.razorpay_handler,
      'razorpay_mode', v_payment.razorpay_mode
    )
  );

  return jsonb_build_object(
    'payment_id', v_payment.id,
    'registration_no', v_registration_no,
    'receipt_no', v_payment.receipt_no,
    'status', v_payment.status
  );
end;
$$;

-- ----------------------------------------------------------------------------
-- 6. RPC: create_pending_razorpay_order  (SERVER ONLY - service role)
--    Stores the Razorpay order id on the player's pending payment row.
-- ----------------------------------------------------------------------------
create or replace function public.create_pending_razorpay_order(
  p_registration_no text,
  p_phone text,
  p_date_of_birth date,
  p_order_id text
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
  v_order text := trim(coalesce(p_order_id, ''));
begin
  if length(v_phone) = 12 and left(v_phone, 2) = '91' then
    v_phone := right(v_phone, 10);
  end if;
  if v_order = '' then
    raise exception 'ORDER_ID_REQUIRED: a Razorpay order id is required.';
  end if;

  select * into v_player
  from public.players
  where upper(trim(registration_no)) = upper(trim(coalesce(p_registration_no, '')))
    and phone = v_phone
    and date_of_birth = p_date_of_birth;

  if not found then
    raise exception 'NOT_FOUND: could not verify the registration details.';
  end if;

  select * into v_payment
  from public.payments where player_id = v_player.id order by created_at desc limit 1;

  if not found then
    raise exception 'PAYMENT_NOT_FOUND: this registration has no fee record.';
  end if;

  if v_payment.status in ('verified', 'refunded') then
    raise exception 'ALREADY_PAID: this registration fee is already %.', v_payment.status;
  end if;

  update public.payments
     set razorpay_order_id = v_order,
         method = 'razorpay'
   where id = v_payment.id;

  return jsonb_build_object(
    'registration_no', v_player.registration_no,
    'payment_id', v_payment.id,
    'razorpay_order_id', v_order,
    'status', case when v_payment.status in ('verified', 'refunded') then v_payment.status else 'pending' end
  );
end;
$$;

-- ----------------------------------------------------------------------------
-- 6b. A newer order supersedes the previous unpaid one.
--     Razorpay orders are one-attempt each, but the customer could still have
--     paid an older order (e.g. network blip, then "Pay again"). The server
--     polls the replaced orders and reconciles them; anything already captured
--     is found and its money can be refunded instead of silently lost.
-- ----------------------------------------------------------------------------
create or replace function public.register_replaced_razorpay_order(
  p_registration_no text,
  p_phone text,
  p_date_of_birth date,
  p_keep_order_id text
)
returns text[]
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player public.players%rowtype;
  v_payment public.payments%rowtype;
begin
  select * into v_player from public.players
  where upper(trim(registration_no)) = upper(trim(coalesce(p_registration_no, '')))
    and phone = right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 10)
    and date_of_birth = p_date_of_birth;

  if not found then
    return array[]::text[];
  end if;

  select * into v_payment from public.payments where player_id = v_player.id order by created_at desc limit 1;
  if not found then
    return array[]::text[];
  end if;

  insert into public.replaced_razorpay_orders (registration_no, order_id)
  select v_player.registration_no, v_payment.razorpay_order_id
  where v_payment.razorpay_order_id is not null
    and v_payment.razorpay_order_id <> trim(coalesce(p_keep_order_id, ''))
  on conflict (order_id) do nothing;

  return coalesce(
    (select array_agg(order_id order by created_at)
     from public.replaced_razorpay_orders
     where registration_no = v_player.registration_no
       and order_id <> trim(coalesce(p_keep_order_id, ''))),
    array[]::text[]
  );
end;
$$;

-- ----------------------------------------------------------------------------
-- 7. RPC: get_receipt  (PUBLIC - same three-factor gate as status lookup)
--    Returns the receipt payload plus a short-lived signed photo URL, or null.
--    Never a public file URL, never another player's data.
-- ----------------------------------------------------------------------------
create or replace function public.get_receipt(
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
  v_photo_url text;
begin
  if length(v_phone) = 12 and left(v_phone, 2) = '91' then
    v_phone := right(v_phone, 10);
  end if;

  select * into v_player
  from public.players
  where upper(trim(registration_no)) = upper(trim(coalesce(p_registration_no, '')))
    and phone = v_phone
    and date_of_birth = p_date_of_birth;

  if not found then
    return null;
  end if;

  select * into v_payment
  from public.payments where player_id = v_player.id order by created_at desc limit 1;

  if not found or v_payment.status <> 'verified' or v_payment.receipt_no is null then
    return null;
  end if;

  -- The photo bucket is private; hand back a 10-minute signed link only after
  -- the three-factor check above has passed. A missing photo must not break the
  -- receipt, so any storage error just leaves the photo empty.
  begin
    v_photo_url := (storage.create_signed_url('player-photos', v_player.photo_path, 600)).signed_url;
  exception when others then
    v_photo_url := null;
  end;

  return jsonb_build_object(
    'registration_no', v_player.registration_no,
    'full_name', v_player.full_name,
    'locality', v_player.locality,
    'role', v_player.role,
    'photo_url', v_photo_url,
    'amount_paise', v_payment.amount_paise,
    'currency', v_payment.currency,
    'receipt_no', v_payment.receipt_no,
    'paid_at', v_payment.paid_at,
    'razorpay_payment_id', v_payment.razorpay_payment_id,
    'razorpay_handler', v_payment.razorpay_handler,
    'razorpay_mode', v_payment.razorpay_mode,
    'status', v_payment.status,
    'submitted_at', v_player.created_at
  );
end;
$$;

-- ----------------------------------------------------------------------------
-- 8. LEGACY: the old "paste your UTR later" door is closed.
--    Players pay online now; a UTR can no longer be attached by hand.
-- ----------------------------------------------------------------------------
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
begin
  raise exception 'ONLINE_PAYMENT_ONLY: registration fees are paid online via Razorpay on the TKPL website.';
end;
$$;

-- ----------------------------------------------------------------------------
-- 8b. RPC: pending_razorpay_orders_for_reconcile  (SERVER ONLY - service role)
--     Orders the customer abandoned at the gateway. The server asks Razorpay
--     whether any of them was actually captured (callback lost, tab closed
--     after paying) and finishes the receipt instead of losing the money.
-- ----------------------------------------------------------------------------
create or replace function public.pending_razorpay_orders_for_reconcile(p_older_than interval default '10 minutes')
returns table (
  registration_no text,
  razorpay_order_id text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select pl.registration_no,
         p.razorpay_order_id,
         p.created_at
  from public.payments p
  join public.players pl on pl.id = p.player_id
  where p.status = 'pending'
    and p.razorpay_order_id is not null
    and p.created_at < now() - coalesce(p_older_than, interval '10 minutes')
  order by p.created_at
  limit 25;
$$;

-- ----------------------------------------------------------------------------
-- 8c. RPC: razorpay_order_for_payment  (SERVER ONLY - service role)
--     Returns the order id we stored server-side for a Razorpay order, so the
--     signature is verified against our record (docs: "Do not use the
--     razorpay_order_id returned by Checkout") instead of the browser's echo.
-- ----------------------------------------------------------------------------
create or replace function public.razorpay_order_for_payment(p_order_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_order text := trim(coalesce(p_order_id, ''));
  v_payment public.payments%rowtype;
  v_registration_no text;
  v_player_id uuid;
begin
  select * into v_payment
  from public.payments
  where razorpay_order_id = v_order
  order by created_at desc
  limit 1;

  if found then
    select registration_no into v_registration_no from public.players where id = v_payment.player_id;
    return jsonb_build_object(
      'order_id', v_order,
      'registration_no', v_registration_no,
      'status', v_payment.status
    );
  end if;

  -- A replaced (older) attempt for the same registration is also ours.
  select r.registration_no, pl.id
    into v_registration_no, v_player_id
  from public.replaced_razorpay_orders r
  join public.players pl on pl.registration_no = r.registration_no
  where r.order_id = v_order;

  if v_registration_no is null then
    return null;
  end if;

  select status into v_payment.status
  from public.payments
  where player_id = v_player_id
  order by created_at desc
  limit 1;

  return jsonb_build_object(
    'order_id', v_order,
    'registration_no', v_registration_no,
    'status', coalesce(v_payment.status, 'pending')
  );
end;
$$;

-- ----------------------------------------------------------------------------
-- 9. GRANTS
-- ----------------------------------------------------------------------------
revoke all on function public.next_receipt_no() from public;
revoke all on function public.verify_razorpay_payment(text, text, boolean, text, text) from public;
revoke all on function public.create_pending_razorpay_order(text, text, date, text) from public;
revoke all on function public.get_receipt(text, text, date) from public;
revoke all on function public.register_replaced_razorpay_order(text, text, date, text) from public;
revoke all on function public.pending_razorpay_orders_for_reconcile(interval) from public;
revoke all on function public.razorpay_order_for_payment(text) from public;

revoke execute on function public.verify_razorpay_payment(text, text, boolean, text, text) from anon, authenticated;
revoke execute on function public.create_pending_razorpay_order(text, text, date, text) from anon, authenticated;
revoke execute on function public.next_receipt_no() from anon, authenticated;
revoke execute on function public.register_replaced_razorpay_order(text, text, date, text) from anon, authenticated;
revoke execute on function public.pending_razorpay_orders_for_reconcile(interval) from anon, authenticated;
revoke execute on function public.razorpay_order_for_payment(text) from anon, authenticated;

grant execute on function public.verify_razorpay_payment(text, text, boolean, text, text) to service_role;
grant execute on function public.create_pending_razorpay_order(text, text, date, text) to service_role;
grant execute on function public.register_replaced_razorpay_order(text, text, date, text) to service_role;
grant execute on function public.pending_razorpay_orders_for_reconcile(interval) to service_role;
grant execute on function public.razorpay_order_for_payment(text) to service_role;

grant execute on function public.get_receipt(text, text, date) to anon, authenticated;

-- ============================================================================
-- DONE. Next: deploy api/ functions with RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET,
-- SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY set in Vercel.
-- ============================================================================
