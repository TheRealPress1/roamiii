import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TripPreview {
  id: string;
  name: string;
  date_start: string | null;
  date_end: string | null;
  member_count: number;
  top_proposal: {
    destination: string;
    cover_image_url: string;
    estimated_cost_per_person: number | null;
  } | null;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    
    // Support both query param (GET) and body (POST)
    let joinCode = url.searchParams.get("code");
    if (!joinCode && req.method === "POST") {
      try {
        const body = await req.json();
        joinCode = body.code;
      } catch {
        // Body parsing failed, continue with null joinCode
      }
    }

    if (!joinCode) {
      return new Response(
        JSON.stringify({ error: "Join code is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role for bypassing RLS
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch trip by join code
    const { data: trip, error: tripError } = await supabase
      .from("trips")
      .select("id, name, date_start, date_end, join_code")
      .eq("join_code", joinCode.toUpperCase())
      .single();

    if (tripError || !trip) {
      return new Response(
        JSON.stringify({ error: "Trip not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get member count
    const { count: memberCount } = await supabase
      .from("trip_members")
      .select("*", { count: "exact", head: true })
      .eq("trip_id", trip.id);

    // Get top proposal (most recent or most voted)
    const { data: proposals } = await supabase
      .from("trip_proposals")
      .select("destination, cover_image_url, estimated_cost_per_person")
      .eq("trip_id", trip.id)
      .order("created_at", { ascending: false })
      .limit(1);

    const preview: TripPreview = {
      id: trip.id,
      name: trip.name,
      date_start: trip.date_start,
      date_end: trip.date_end,
      member_count: memberCount || 0,
      top_proposal: proposals && proposals.length > 0 ? proposals[0] : null,
    };

    return new Response(JSON.stringify(preview), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error fetching trip preview:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
