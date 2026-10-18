-- Atomic bidding + realtime.
-- Bids used to be applied from the browser as separate read-then-write calls
-- (read purse, write purse, write player, write team_players), so two quick
-- bids or a dropped request could leave purses and rosters out of sync.
-- These functions do the whole move inside one transaction with row locks.

-- One roster row per player.
create unique index if not exists team_players_player_id_key on public.team_players (player_id);

-- Refund whichever team currently holds the player and clear the sale.
-- Caller must already hold the player's row lock.
create or replace function public._unassign_player(p_player public.players)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_price numeric;
begin
  if p_player.team_id is null then
    return;
  end if;

  select coalesce(tp.bid_price, p_player.sold_price, 0) into v_price
  from (select 1) s
  left join public.team_players tp on tp.player_id = p_player.id;

  update public.teams
     set purse  = purse + coalesce(v_price, 0),
         points = greatest(0, points - coalesce(p_player.points, 0))
   where id = p_player.team_id;

  delete from public.team_players where player_id = p_player.id;

  update public.players
     set team_id = null, sold_price = null, sold = false, sold_to = null
   where id = p_player.id;
end;
$$;

revoke all on function public._unassign_player(public.players) from public, anon, authenticated;

-- Sell (or re-sell) a player to a team. Refunds the previous team first.
create or replace function public.place_bid(p_player_id uuid, p_team_id uuid, p_price numeric)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player public.players;
  v_team   public.teams;
  v_limit  integer;
  v_held   integer;
begin
  if auth.uid() is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  if p_price is null or p_price <= 0 then
    raise exception 'Bid must be greater than 0';
  end if;

  select * into v_player from public.players where id = p_player_id for update;
  if not found then
    raise exception 'Player not found';
  end if;
  if p_price < v_player.base_price then
    raise exception 'Bid % Cr is below base price % Cr', p_price, v_player.base_price;
  end if;

  perform public._unassign_player(v_player);

  select * into v_team from public.teams where id = p_team_id for update;
  if not found then
    raise exception 'Team not found';
  end if;
  if v_team.purse < p_price then
    raise exception '% has % Cr left, bid was % Cr', v_team.name, v_team.purse, p_price;
  end if;

  select coalesce(players_per_team, 2) into v_limit from public.settings limit 1;
  select count(*) into v_held
    from public.players
   where team_id = p_team_id and category = v_player.category;
  if v_held >= coalesce(v_limit, 2) then
    raise exception '% already has % %s', v_team.name, v_held, v_player.category;
  end if;

  update public.teams
     set purse = purse - p_price,
         points = points + coalesce(v_player.points, 0)
   where id = p_team_id;

  update public.players
     set team_id = p_team_id, sold_price = p_price, sold = true, sold_to = p_team_id
   where id = p_player_id;

  insert into public.team_players (team_id, player_id, bid_price)
  values (p_team_id, p_player_id, p_price);

  return json_build_object('player_id', p_player_id, 'team_id', p_team_id, 'price', p_price);
end;
$$;

-- Release a player back into the pool, refunding the team.
create or replace function public.release_player(p_player_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player public.players;
begin
  if auth.uid() is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;

  select * into v_player from public.players where id = p_player_id for update;
  if not found then
    raise exception 'Player not found';
  end if;

  perform public._unassign_player(v_player);
end;
$$;

revoke all on function public.place_bid(uuid, uuid, numeric) from public, anon;
revoke all on function public.release_player(uuid) from public, anon;
grant execute on function public.place_bid(uuid, uuid, numeric) to authenticated;
grant execute on function public.release_player(uuid) to authenticated;

-- The app subscribes to postgres_changes on these tables, but none of them
-- were in the realtime publication, so those subscriptions never fired.
do $$
declare
  t text;
begin
  foreach t in array array['players', 'teams', 'team_players', 'settings'] loop
    if not exists (
      select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end;
$$;
