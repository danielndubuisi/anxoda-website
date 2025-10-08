import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SPREADSHEETS_BUCKET = 'spreadsheets';
const REPORTS_BUCKET = 'reports';
const PY_SERVICE_URL = Deno.env.get('PYTHON_EDA_SERVICE_URL') || 'http://localhost:8000';
const PY_SERVICE_TOKEN = Deno.env.get('PYTHON_SERVICE_TOKEN') || 'shared-secret-token';

const badRequest = (message: string, status = 400) => {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role for background processing
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { reportId, userId, sourcePath, question, analysisContext } = await req.json();

    if (!reportId || !userId || !sourcePath) {
      return badRequest('Missing required fields: reportId, userId, sourcePath');
    }

    // Verify the report exists and update status to processing
    const { error: updateError } = await supabase
      .from("spreadsheet_reports")
      .update({ processing_status: "processing" })
      .eq("id", reportId);

    if (updateError) {
      return badRequest(`Failed to update report status: ${updateError.message}`, 500);
    }

    // 3) Short-lived signed URL for Python to download from spreadsheets bucket
    const signed = await supabase.storage
      .from(SPREADSHEETS_BUCKET)
      .createSignedUrl(sourcePath, 60); // 60s lifetime

    if (signed.error) {
      return badRequest(`Signed URL failed: ${signed.error.message}`, 500);
    }

    // 4) Call Python FastAPI /analyze (delegates EDA + AI entirely to Python)
    const resp = await fetch(`${PY_SERVICE_URL}/analyze`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "authorization": `Bearer ${PY_SERVICE_TOKEN}`,
      },
      body: JSON.stringify({
        userId,
        reportId,
        signedUrl: signed.data.signedUrl,
        question: question || null,
        analysisContext: analysisContext || null,
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      // Mark as failed for observability
      await supabase.from("spreadsheet_reports").update({
        processing_status: "failed",
        error_message: errText.slice(0, 5000),
      }).eq("id", reportId);
      return badRequest(`Python analyze failed: ${errText}`, 502);
    }

    const result = await resp.json();

    // Optionally, you can return the Python result directly
    return new Response(JSON.stringify({
      reportId,
      status: "queued",
      result,
    }), { 
      headers: { ...corsHeaders, "content-type": "application/json" } 
    });

  } catch (e) {
    console.error('Error in analyze function:', e);
    return badRequest(`Unhandled error: ${e instanceof Error ? e.message : String(e)}`, 500);
  }
});