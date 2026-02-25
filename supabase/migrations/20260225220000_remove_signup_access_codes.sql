drop trigger if exists on_auth_user_created_require_access_code on auth.users;

drop function if exists public.require_and_consume_signup_access_code();
drop function if exists public.check_signup_access_code(text);
drop function if exists public.verify_login_access_code(text);

drop table if exists public.signup_access_codes;
