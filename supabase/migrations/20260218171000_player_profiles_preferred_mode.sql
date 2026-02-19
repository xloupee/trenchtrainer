alter table public.player_profiles
add column if not exists preferred_mode text not null default 'practice';

update public.player_profiles
set preferred_mode = 'practice'
where preferred_mode is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'player_profiles_preferred_mode_check'
      and conrelid = 'public.player_profiles'::regclass
  ) then
    alter table public.player_profiles
    add constraint player_profiles_preferred_mode_check
    check (preferred_mode in ('practice', '1v1', 'profile'));
  end if;
end
$$;
