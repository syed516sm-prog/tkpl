-- ============================================================================
-- T-KPL: Setup Super Admin for syed516.sm@gmail.com
-- 
-- PREREQUISITE:
-- 1. In Supabase Dashboard -> Authentication -> Users -> Click "Add user" -> "Create user"
-- 2. Enter email: syed516.sm@gmail.com
-- 3. Enter your chosen password
-- 4. Check "Auto Confirm User?" so no email verification is needed
-- 5. Then paste and run this SQL script in Supabase -> SQL Editor.
-- ============================================================================

insert into public.admin_users (user_id, email, full_name, role, active)
select 
  id, 
  email, 
  'Syed · Tournament Administrator', 
  'super_admin', 
  true
from auth.users
where lower(email) = lower('syed516.sm@gmail.com')
on conflict (user_id) do update set 
  role = 'super_admin', 
  full_name = excluded.full_name, 
  active = true;

-- Verification check: run this to confirm your admin account is registered properly
select user_id, email, full_name, role, active, created_at 
from public.admin_users;
