-- Baseline schema for a new Campus Premier League project.
-- Dumped from the live database on 2026-10-18 (public schema), plus the pieces a
-- schema dump leaves out: the sign-up trigger on auth.users and the player-images
-- storage bucket with its policies.




SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";





SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."players" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "category" "text" NOT NULL,
    "base_price" numeric DEFAULT 1 NOT NULL,
    "sold_price" numeric,
    "team_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "points" numeric DEFAULT 0 NOT NULL,
    "priority" integer DEFAULT 1 NOT NULL,
    "sold" boolean DEFAULT false,
    "sold_to" "uuid",
    "image_url" "text"
);


ALTER TABLE "public"."players" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."_unassign_player"("p_player" "public"."players") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."_unassign_player"("p_player" "public"."players") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name) VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."place_bid"("p_player_id" "uuid", "p_team_id" "uuid", "p_price" numeric) RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."place_bid"("p_player_id" "uuid", "p_team_id" "uuid", "p_price" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."release_player"("p_player_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."release_player"("p_player_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_team_ownership_for_user"("user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE public.teams SET owner_id = user_id WHERE owner_id = '00000000-0000-0000-0000-000000000001' OR owner_id IS NULL;
END;
$$;


ALTER FUNCTION "public"."set_team_ownership_for_user"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "display_name" "text",
    "avatar_url" "text",
    "role" "text" DEFAULT 'user'::"text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "players_per_team" integer DEFAULT 2 NOT NULL,
    "initial_purse" numeric DEFAULT 50 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."team_players" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "team_id" "uuid" NOT NULL,
    "player_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "bid_price" numeric
);


ALTER TABLE "public"."team_players" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."teams" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "owner_id" "uuid" NOT NULL,
    "purse" numeric DEFAULT 50 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "points" numeric DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."teams" OWNER TO "postgres";


ALTER TABLE ONLY "public"."players"
    ADD CONSTRAINT "players_name_unique" UNIQUE ("name");



ALTER TABLE ONLY "public"."players"
    ADD CONSTRAINT "players_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."settings"
    ADD CONSTRAINT "settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_players"
    ADD CONSTRAINT "team_players_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_players"
    ADD CONSTRAINT "team_players_team_id_player_id_key" UNIQUE ("team_id", "player_id");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_name_unique" UNIQUE ("name");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_pkey" PRIMARY KEY ("id");



CREATE UNIQUE INDEX "team_players_player_id_key" ON "public"."team_players" USING "btree" ("player_id");



CREATE OR REPLACE TRIGGER "update_players_updated_at" BEFORE UPDATE ON "public"."players" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_settings_updated_at" BEFORE UPDATE ON "public"."settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_teams_updated_at" BEFORE UPDATE ON "public"."teams" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."players"
    ADD CONSTRAINT "players_sold_to_fkey" FOREIGN KEY ("sold_to") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."players"
    ADD CONSTRAINT "players_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."team_players"
    ADD CONSTRAINT "team_players_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_players"
    ADD CONSTRAINT "team_players_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



CREATE POLICY "Authenticated users can add players to teams during auction" ON "public"."team_players" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Authenticated users can manage players during auction" ON "public"."players" TO "authenticated" USING (("auth"."uid"() IS NOT NULL)) WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Authenticated users can manage settings" ON "public"."settings" USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Authenticated users can remove players from teams during auctio" ON "public"."team_players" FOR DELETE TO "authenticated" USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Authenticated users can update team players during auction" ON "public"."team_players" FOR UPDATE TO "authenticated" USING (("auth"."uid"() IS NOT NULL)) WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Authenticated users can update teams during auction" ON "public"."teams" FOR UPDATE TO "authenticated" USING (("auth"."uid"() IS NOT NULL)) WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Players are viewable by everyone" ON "public"."players" FOR SELECT USING (true);



CREATE POLICY "Profiles are viewable by everyone" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Settings are viewable by everyone" ON "public"."settings" FOR SELECT USING (true);



CREATE POLICY "Team players are viewable by everyone" ON "public"."team_players" FOR SELECT USING (true);



CREATE POLICY "Teams are viewable by everyone" ON "public"."teams" FOR SELECT USING (true);



CREATE POLICY "Users can create their own teams" ON "public"."teams" FOR INSERT WITH CHECK (("auth"."uid"() = "owner_id"));



CREATE POLICY "Users can delete their own teams" ON "public"."teams" FOR DELETE USING (("auth"."uid"() = "owner_id"));



CREATE POLICY "Users can insert their own profile" ON "public"."profiles" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") OR ("auth"."uid"() IS NULL)));



CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."players" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."team_players" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."teams" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."players";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."settings";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."team_players";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."teams";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON TABLE "public"."players" TO "anon";
GRANT ALL ON TABLE "public"."players" TO "authenticated";
GRANT ALL ON TABLE "public"."players" TO "service_role";



REVOKE ALL ON FUNCTION "public"."_unassign_player"("p_player" "public"."players") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."_unassign_player"("p_player" "public"."players") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."place_bid"("p_player_id" "uuid", "p_team_id" "uuid", "p_price" numeric) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."place_bid"("p_player_id" "uuid", "p_team_id" "uuid", "p_price" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."place_bid"("p_player_id" "uuid", "p_team_id" "uuid", "p_price" numeric) TO "service_role";



REVOKE ALL ON FUNCTION "public"."release_player"("p_player_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."release_player"("p_player_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."release_player"("p_player_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_team_ownership_for_user"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."set_team_ownership_for_user"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_team_ownership_for_user"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."settings" TO "anon";
GRANT ALL ON TABLE "public"."settings" TO "authenticated";
GRANT ALL ON TABLE "public"."settings" TO "service_role";



GRANT ALL ON TABLE "public"."team_players" TO "anon";
GRANT ALL ON TABLE "public"."team_players" TO "authenticated";
GRANT ALL ON TABLE "public"."team_players" TO "service_role";



GRANT ALL ON TABLE "public"."teams" TO "anon";
GRANT ALL ON TABLE "public"."teams" TO "authenticated";
GRANT ALL ON TABLE "public"."teams" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";

































-- Create a profile row for every new sign-up.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Public bucket for player photos; signed-in organisers can manage it.
insert into storage.buckets (id, name, public)
values ('player-images', 'player-images', true)
on conflict (id) do nothing;

create policy "Player images are publicly accessible" on storage.objects
  for select using (bucket_id = 'player-images');
create policy "Authenticated users can upload player images" on storage.objects
  for insert with check (bucket_id = 'player-images' and auth.uid() is not null);
create policy "Authenticated users can update player images" on storage.objects
  for update using (bucket_id = 'player-images' and auth.uid() is not null);
create policy "Authenticated users can delete player images" on storage.objects
  for delete using (bucket_id = 'player-images' and auth.uid() is not null);
