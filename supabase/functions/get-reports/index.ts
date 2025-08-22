import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.0";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        // Get authorization header
        const authorization = req.headers.get("Authorization");
        if (!authorization) {
            console.error("No authorization header received:", req.headers);
            throw new Error("No authorization header");
        }

        // Initialize Supabase client
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseKey, {
            global: { headers: { Authorization: authorization } },
        });

        // Get current user
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();
        if (userError || !user) {
            console.error("Authentication failed:", userError, user);
            throw new Error("Authentication failed");
        }

        const url = new URL(req.url);
        const reportId = url.searchParams.get("reportId");

        if (reportId) {
            // Get specific report by query param
            const { data: report, error } = await supabase
                .from("spreadsheet_reports")
                .select("*")
                .eq("id", reportId)
                .eq("user_id", user.id)
                .single();

            if (error) {
                console.error("Report not found:", error, reportId);
                throw new Error("Report not found");
            }

            return new Response(JSON.stringify(report), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        } else {
            // Get all reports for user
            const { data: reports, error } = await supabase
                .from("spreadsheet_reports")
                .select("*")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false });

            if (error) {
                console.error("Failed to fetch reports:", error, user.id);
                throw new Error("Failed to fetch reports");
            }

            return new Response(JSON.stringify(reports || []), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }
    } catch (error) {
        console.error(
            "Error in get-reports function:",
            error,
            req.url,
            req.headers
        );
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
