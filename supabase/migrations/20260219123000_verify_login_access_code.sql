create or replace function public.verify_login_access_code(input_code text)
returns boolean
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  normalized_code text;
  is_valid boolean;
begin
  if auth.uid() is null then
    return false;
  end if;

  normalized_code := upper(trim(coalesce(input_code, '')));
  if normalized_code = '' then
    return false;
  end if;

  select exists (
    select 1
    from public.signup_access_codes
    where code = normalized_code
      and consumed_by = auth.uid()
      and consumed_at is not null
  )
  into is_valid;

  return is_valid;
end;
$$;

revoke all on function public.verify_login_access_code(text) from public;
grant execute on function public.verify_login_access_code(text) to authenticated;
