create table if not exists public.signup_access_codes (
  code text primary key,
  note text,
  created_at timestamptz not null default now(),
  consumed_at timestamptz,
  consumed_by uuid references auth.users(id) on delete set null,
  constraint signup_access_codes_code_format check (
    code = upper(code)
    and code ~ '^[A-Z0-9]{6,16}$'
  )
);

create index if not exists signup_access_codes_consumed_at_idx
on public.signup_access_codes (consumed_at);

alter table public.signup_access_codes enable row level security;

revoke all on table public.signup_access_codes from anon, authenticated;
grant select, insert, update, delete on table public.signup_access_codes to service_role;

create or replace function public.require_and_consume_signup_access_code()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  normalized_code text;
  consumed_code text;
begin
  normalized_code := upper(trim(coalesce(new.raw_user_meta_data ->> 'access_code', '')));

  if normalized_code = '' then
    raise exception 'Access code is required for signup.';
  end if;

  update public.signup_access_codes
  set consumed_at = now(),
      consumed_by = new.id
  where code = normalized_code
    and consumed_at is null
  returning code into consumed_code;

  if consumed_code is null then
    raise exception 'Invalid or already used access code.';
  end if;

  update auth.users
  set raw_user_meta_data = coalesce(new.raw_user_meta_data, '{}'::jsonb) - 'access_code'
  where id = new.id;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_require_access_code on auth.users;
create trigger on_auth_user_created_require_access_code
after insert on auth.users
for each row execute function public.require_and_consume_signup_access_code();
