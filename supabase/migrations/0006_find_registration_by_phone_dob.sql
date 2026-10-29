-- ============================================================================
-- T-KPL Migration 0006: Find Registration Number by Phone & Date of Birth
-- ============================================================================
-- Allows players who lost their registration number to safely recover it
-- by supplying their verified phone number and date of birth.
-- ============================================================================

create or replace function public.find_registration_by_phone_dob(
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
  v_phone text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
begin
  if length(v_phone) = 12 and left(v_phone, 2) = '91' then
    v_phone := right(v_phone, 10);
  end if;

  select * into v_player
  from public.players
  where phone = v_phone
    and date_of_birth = p_date_of_birth
  order by created_at desc
  limit 1;

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'registration_no', v_player.registration_no,
    'full_name', v_player.full_name
  );
end;
$$;

revoke all on function public.find_registration_by_phone_dob(text, date) from public;
grant execute on function public.find_registration_by_phone_dob(text, date) to anon, authenticated;
