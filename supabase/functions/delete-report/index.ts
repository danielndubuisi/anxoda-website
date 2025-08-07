import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'DELETE') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
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

    const { reportId } = await req.json();
    
    if (!reportId) {
      throw new Error('Report ID is required');
    }

    // Get report to verify ownership and get file path
    const { data: report, error: fetchError } = await supabase
      .from('spreadsheet_reports')
      .select('file_path')
      .eq('id', reportId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !report) {
      throw new Error('Report not found or access denied');
    }

    // Delete file from storage
    const { error: storageError } = await supabase.storage
      .from('spreadsheets')
      .remove([report.file_path]);

    if (storageError) {
      console.error('Storage deletion error:', storageError);
    }

    // Delete report from database
    const { error: deleteError } = await supabase
      .from('spreadsheet_reports')
      .delete()
      .eq('id', reportId)
      .eq('user_id', user.id);

    if (deleteError) {
      throw new Error('Failed to delete report');
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Report deleted successfully' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in delete-report function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});