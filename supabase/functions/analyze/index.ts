import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    // Get authorization header
    const authorization = req.headers.get('Authorization');
    if (!authorization) {
      throw new Error('No authorization header');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authorization } }
    });

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Authentication failed');
    }

    const { reportId, userId, sourcePath, question, skipAI, aiInsights, analysisContext } = await req.json();

    if (!reportId || !userId || !sourcePath) {
      return badRequest('Missing required fields: reportId, userId, sourcePath');
    }

    // 2) Create DB row (status=processing)
    const initRow = await supabase.from("spreadsheet_reports").insert({
      id: reportId,
      user_id: userId,
      processing_status: "processing",
      file_path: sourcePath,
      title: sourcePath.split('/').pop() || 'Unknown',
      original_filename: sourcePath.split('/').pop() || 'unknown.xlsx'
    }).select("id").single();

    if (initRow.error) {
      return badRequest(`DB insert failed: ${initRow.error.message}`, 500);
    }

    // 3) Short-lived signed URL for Python to download
    const signed = await supabase.storage
      .from(REPORTS_BUCKET)
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
        skipAI: skipAI || false,
        aiInsights: aiInsights || null,
        analysisContext: analysisContext || null
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