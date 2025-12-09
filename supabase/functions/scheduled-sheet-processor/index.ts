import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// This function is designed to be called by a cron job
// It checks for any live sheet connections due for processing and triggers them
serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log("Checking for scheduled live sheet connections...");

    // Get all connections due for processing
    const now = new Date().toISOString();
    const { data: dueConnections, error } = await supabase
      .from("live_sheet_connections")
      .select("id")
      .eq("is_active", true)
      .lte("next_run_at", now);

    if (error) throw error;

    console.log(`Found ${dueConnections?.length || 0} connections due for processing`);

    if (!dueConnections || dueConnections.length === 0) {
      return new Response(
        JSON.stringify({ message: "No connections due for processing" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call the process-live-sheet function with runScheduled flag
    const { data, error: processError } = await supabase.functions.invoke(
      "process-live-sheet",
      {
        body: { runScheduled: true },
      }
    );

    if (processError) {
      console.error("Error invoking process-live-sheet:", processError);
      throw processError;
    }

    return new Response(
      JSON.stringify({
        message: `Processed ${dueConnections.length} connections`,
        results: data?.results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in scheduled-sheet-processor:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});