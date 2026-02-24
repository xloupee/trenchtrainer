create table if not exists public.wager_lobbies (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  status text not null default 'open',
  stake_tier text not null,
  stake_lamports bigint not null check (stake_lamports > 0),
  game_code text not null,
  wager_match_pda text,
  deadline_ts bigint,
  host_user_id uuid not null references auth.users(id) on delete cascade,
  guest_user_id uuid references auth.users(id) on delete set null,
  host_pubkey text,
  guest_pubkey text,
  winner_user_id uuid references auth.users(id) on delete set null,
  settle_tx_sig text,
  refund_tx_sig text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists wager_lobbies_status_idx on public.wager_lobbies(status);
create index if not exists wager_lobbies_created_at_idx on public.wager_lobbies(created_at desc);
create index if not exists wager_lobbies_host_user_id_idx on public.wager_lobbies(host_user_id);
create index if not exists wager_lobbies_guest_user_id_idx on public.wager_lobbies(guest_user_id);

create table if not exists public.wager_events (
  id uuid primary key default gen_random_uuid(),
  lobby_id uuid not null references public.wager_lobbies(id) on delete cascade,
  event_type text not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  tx_sig text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists wager_events_lobby_id_idx on public.wager_events(lobby_id);
create index if not exists wager_events_created_at_idx on public.wager_events(created_at desc);

alter table public.wager_lobbies enable row level security;
alter table public.wager_events enable row level security;

drop policy if exists "wager_lobbies_select_authenticated" on public.wager_lobbies;
create policy "wager_lobbies_select_authenticated"
on public.wager_lobbies for select
to authenticated
using (true);

drop policy if exists "wager_lobbies_insert_authenticated" on public.wager_lobbies;
create policy "wager_lobbies_insert_authenticated"
on public.wager_lobbies for insert
to authenticated
with check (host_user_id = auth.uid());

drop policy if exists "wager_lobbies_update_participants" on public.wager_lobbies;
create policy "wager_lobbies_update_participants"
on public.wager_lobbies for update
to authenticated
using (auth.uid() = host_user_id or auth.uid() = guest_user_id)
with check (auth.uid() = host_user_id or auth.uid() = guest_user_id);

drop policy if exists "wager_events_select_authenticated" on public.wager_events;
create policy "wager_events_select_authenticated"
on public.wager_events for select
to authenticated
using (true);

drop policy if exists "wager_events_insert_authenticated" on public.wager_events;
create policy "wager_events_insert_authenticated"
on public.wager_events for insert
to authenticated
with check (actor_user_id = auth.uid() or actor_user_id is null);

create or replace function public.set_wager_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_wager_lobbies_updated_at on public.wager_lobbies;
create trigger trg_wager_lobbies_updated_at
before update on public.wager_lobbies
for each row execute procedure public.set_wager_updated_at();

