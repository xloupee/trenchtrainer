create or replace function public.check_signup_access_code(input_code text)
returns boolean
language sql
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.signup_access_codes
    where code = upper(trim(coalesce(input_code, '')))
      and consumed_at is null
  );
$$;

revoke all on function public.check_signup_access_code(text) from public;
grant execute on function public.check_signup_access_code(text) to anon, authenticated;
