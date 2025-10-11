/**
 * Analyze Edge Function
 * 
 * Purpose: Delegates to Python service for PDF/image generation ONLY.
 * Called by: process-spreadsheet function after AI analysis is complete.
 * 
 * Workflow:
 * 1. Receives reportId, userId, sourcePath (file location in spreadsheets bucket)
 * 2. Verifies the report exists in database (created by process-spreadsheet)
 * 3. Creates short-lived signed URL for Python to download spreadsheet
 * 4. Calls Python service with pre-computed AI insights (skipAI=true)
 * 5. Python generates PDF report and chart images
 * 6. Python uploads outputs to reports bucket
 * 7. Python updates DB with report_pdf_path and image_paths
 */

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SPREADSHEETS_BUCKET = 'spreadsheets'; // Source files are always in spreadsheets bucket
const PY_SERVICE_URL = Deno.env.get('PYTHON_EDA_SERVICE_URL');
const PY_SERVICE_TOKEN = Deno.env.get('PYTHON_SERVICE_TOKEN') || 'shared-secret-token';

// Validate required environment variables
if (!PY_SERVICE_URL) {
  console.error('CRITICAL: PYTHON_EDA_SERVICE_URL environment variable is not set');
  throw new Error('PYTHON_EDA_SERVICE_URL is required. Please add it to Supabase secrets.');
}

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

    console.log('Analyze function called:', { reportId, userId, sourcePath, skipAI });

    // 2) Verify the report exists (created by process-spreadsheet)
    const { data: existingReport, error: fetchError } = await supabase
      .from("spreadsheet_reports")
      .select("id, processing_status, text_summary")
      .eq("id", reportId)
      .single();

    if (fetchError || !existingReport) {
      console.error('Report not found:', { reportId, error: fetchError });
      return badRequest(`Report not found: ${reportId}`, 404);
    }

    console.log('Report found, current status:', existingReport.processing_status);

    // 3) Create short-lived signed URL for Python to download from spreadsheets bucket
    console.log('Creating signed URL:', { bucket: SPREADSHEETS_BUCKET, path: sourcePath });
    
    const signed = await supabase.storage
      .from(SPREADSHEETS_BUCKET) // ✅ Files are in spreadsheets bucket
      .createSignedUrl(sourcePath, 60); // 60s lifetime

    if (signed.error) {
      console.error('Signed URL creation failed:', {
        error: signed.error,
        bucket: SPREADSHEETS_BUCKET,
        path: sourcePath
      });
      return badRequest(`Signed URL failed: ${signed.error.message}`, 500);
    }

    console.log('Signed URL created successfully');

    // 4) Call Python FastAPI /analyze (delegates PDF/image generation to Python)
    console.log('Calling Python service:', { url: PY_SERVICE_URL, reportId });
    
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
      console.error('Python service error:', {
        status: resp.status,
        statusText: resp.statusText,
        url: PY_SERVICE_URL,
        reportId,
        errorBody: errText.slice(0, 500)
      });
      
      // Mark as failed for observability
      await supabase.from("spreadsheet_reports").update({
        processing_status: "failed",
        error_message: `Python service error (${resp.status}): ${errText.slice(0, 500)}`,
      }).eq("id", reportId);
      
      return badRequest(`Python analyze failed (${resp.status}): ${errText}`, 502);
    }

    const result = await resp.json();
    console.log('Python service completed successfully:', { reportId, hasPdf: !!result.pdf });

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