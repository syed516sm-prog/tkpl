-- ============================================================================
-- T-KPL: Include confirmed_count in get_public_stats RPC
-- ============================================================================
-- Returns dynamic counts for public website landing page without exposing
-- any private player data.
-- ============================================================================

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

revoke all on function public.get_public_stats() from public;
grant execute on function public.get_public_stats() to anon, authenticated;
