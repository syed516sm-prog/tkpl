-- ============================================================================
-- T-KPL: Auto-confirm and approve player upon verified Razorpay payment
-- ============================================================================

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

  -- Automatically confirm player registration and auction eligibility
  update public.players
     set registration_status = 'approved',
         auction_status = 'eligible',
         review_notes = 'Registration confirmed automatically upon verified Razorpay payment.'
   where id = v_payment.player_id;

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

-- Reset sequence counters so the first real registration starts at 101 and receipt starts at 0001
select setval('public.tkpl_registration_seq', 101, false);
select setval('public.tkpl_receipt_seq', 1, false);
