-- ============================================================================
-- T-KPL Migration 0004: Fix Receipt Player Photo URL & Storage Policies
-- ============================================================================
--
-- Why:
-- 1. In get_receipt(), storage.create_signed_url(...) was called in PL/pgSQL,
--    which does not exist in PostgreSQL. It silently caught the exception and
--    set photo_url to NULL.
-- 2. Receipts and "Find My Ticket" need the player's photo to render on the
--    receipt card and the canvas-downloaded PNG.
-- 3. Setting the player-photos bucket to public allows direct, unexpired
--    access to the receipt photographs with proper CORS headers for canvas export.
-- ============================================================================

-- 1. Make the player-photos bucket public
update storage.buckets
   set public = true
 where id = 'player-photos';

-- 2. Allow public/anon select access on player-photos objects
drop policy if exists "Public can view player photos" on storage.objects;
create policy "Public can view player photos"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'player-photos');

-- 3. Fix get_receipt RPC to return photo_path and photo_url
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
  from public.payments
  where player_id = v_player.id
  order by created_at desc
  limit 1;

  if not found or v_payment.status <> 'verified' or v_payment.receipt_no is null then
    return null;
  end if;

  return jsonb_build_object(
    'registration_no', v_player.registration_no,
    'full_name', v_player.full_name,
    'locality', v_player.locality,
    'role', v_player.role,
    'photo_path', v_player.photo_path,
    'photo_url', v_player.photo_path,
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

revoke all on function public.get_receipt(text, text, date) from public;
grant execute on function public.get_receipt(text, text, date) to anon, authenticated;

-- 4. Fix lookup_registration_status RPC to also return photo_path / photo_url
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
  where upper(trim(registration_no)) = upper(trim(coalesce(p_registration_no, '')))
    and phone = v_phone
    and date_of_birth = p_date_of_birth;

  if not found then
    return null;
  end if;

  select * into v_payment
  from public.payments
  where player_id = v_player.id
  order by created_at desc
  limit 1;

  return jsonb_build_object(
    'registration_no', v_player.registration_no,
    'full_name', v_player.full_name,
    'locality', v_player.locality,
    'role', v_player.role,
    'photo_path', v_player.photo_path,
    'photo_url', v_player.photo_path,
    'registration_status', v_player.registration_status,
    'auction_status', v_player.auction_status,
    'review_notes', v_player.review_notes,
    'payment_status', coalesce(v_payment.status, 'pending'),
    'transaction_ref', coalesce(v_payment.transaction_ref, ''),
    'submitted_at', v_player.created_at
  );
end;
$$;

revoke all on function public.lookup_registration_status(text, text, date) from public;
grant execute on function public.lookup_registration_status(text, text, date) to anon, authenticated;
