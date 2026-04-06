// Supabase Edge Function: reset-auction
// Releases all players from teams, clears team_players, and resets team purses to the initial purse from settings.
// Runs with service role key to bypass RLS safely.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers for web invocation
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("reset-auction: Missing Supabase configuration envs");
      return new Response(
        JSON.stringify({ error: "Missing Supabase configuration" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Admin client (service role) to bypass RLS
    const admin = createClient(supabaseUrl, serviceRoleKey);

    console.log("reset-auction: Starting reset process");

    // Get initial purse from settings (fallback to 50)
    const { data: settings, error: settingsErr } = await admin
      .from("settings")
      .select("initial_purse")
      .limit(1)
      .maybeSingle();

    if (settingsErr) console.error("Error fetching settings:", settingsErr);
    const initialPurse = settings?.initial_purse ?? 50;

    // Clear team_players relationships
    const { error: tpErr } = await admin
      .from("team_players")
      .delete()
      .gte("id", "00000000-0000-0000-0000-000000000000");
    if (tpErr) throw tpErr;

    // Release all players
    const { error: playersErr } = await admin
      .from("players")
      .update({
        team_id: null,
        sold_price: null,
        sold: false,
        sold_to: null,
      })
      .gte("id", "00000000-0000-0000-0000-000000000000");
    if (playersErr) throw playersErr;

    // Reset teams
    const { error: teamsErr } = await admin
      .from("teams")
      .update({ purse: initialPurse, points: 0 })
      .gte("id", "00000000-0000-0000-0000-000000000000");
    if (teamsErr) throw teamsErr;

    console.log("reset-auction: Reset completed successfully");

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("reset-auction error:", e);
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});