import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProcessRequest {
  connectionId?: string;
  runScheduled?: boolean;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { connectionId, runScheduled } = (await req.json()) as ProcessRequest;

    let connections;

    if (runScheduled) {
      // Get all connections due for processing
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("live_sheet_connections")
        .select("*")
        .eq("is_active", true)
        .lte("next_run_at", now);

      if (error) throw error;
      connections = data;
    } else if (connectionId) {
      // Get specific connection
      const { data, error } = await supabase
        .from("live_sheet_connections")
        .select("*")
        .eq("id", connectionId)
        .single();

      if (error) throw error;
      connections = [data];
    } else {
      return new Response(
        JSON.stringify({ error: "Missing connectionId or runScheduled flag" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${connections?.length || 0} live sheet connections`);

    const results = [];

    for (const connection of connections || []) {
      try {
        console.log(`Processing connection: ${connection.id} - ${connection.sheet_name}`);

        // Fetch the sheet data
        const sheetData = await fetchSheetData(connection.sheet_url, connection.sheet_type);

        if (!sheetData) {
          throw new Error("Failed to fetch sheet data. Make sure the sheet is publicly accessible.");
        }

        // Upload the data to storage
        const fileName = `live-sheet-${connection.id}-${Date.now()}.csv`;
        const filePath = `${connection.user_id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("spreadsheets")
          .upload(filePath, new Blob([sheetData], { type: "text/csv" }), {
            contentType: "text/csv",
            upsert: true,
          });

        if (uploadError) throw uploadError;

        // Create a report entry
        const { data: report, error: reportError } = await supabase
          .from("spreadsheet_reports")
          .insert({
            user_id: connection.user_id,
            file_path: filePath,
            original_filename: `${connection.sheet_name}.csv`,
            title: `${connection.sheet_name} - ${new Date().toLocaleDateString()}`,
            processing_status: "processing",
          })
          .select()
          .single();

        if (reportError) throw reportError;

        // Get signed URL for processing
        const { data: signedUrlData } = await supabase.storage
          .from("spreadsheets")
          .createSignedUrl(filePath, 3600);

        // Call the analyze endpoint (Python service)
        const pythonServiceUrl = Deno.env.get("PYTHON_EDA_SERVICE_URL");
        if (pythonServiceUrl) {
          const analyzeResponse = await fetch(`${pythonServiceUrl}/analyze`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Deno.env.get("PYTHON_EDA_SERVICE_TOKEN") || ""}`,
            },
            body: JSON.stringify({
              report_id: report.id,
              user_id: connection.user_id,
              signed_url: signedUrlData?.signedUrl,
              useLovableAI: true,
            }),
          });

          if (!analyzeResponse.ok) {
            console.error("Analysis service error:", await analyzeResponse.text());
          }
        } else {
          // Mark as completed without Python analysis
          await supabase
            .from("spreadsheet_reports")
            .update({ processing_status: "completed" })
            .eq("id", report.id);
        }

        // Calculate next run time
        const nextRunAt = calculateNextRun(connection.schedule_frequency);

        // Update connection status
        await supabase
          .from("live_sheet_connections")
          .update({
            last_run_at: new Date().toISOString(),
            next_run_at: nextRunAt.toISOString(),
            last_report_id: report.id,
            error_message: null,
          })
          .eq("id", connection.id);

        // Send email notification
        await sendEmailNotification(supabase, connection, report);

        results.push({ connectionId: connection.id, success: true, reportId: report.id });
      } catch (error: any) {
        console.error(`Error processing connection ${connection.id}:`, error);

        // Update connection with error
        await supabase
          .from("live_sheet_connections")
          .update({
            error_message: error.message,
          })
          .eq("id", connection.id);

        results.push({ connectionId: connection.id, success: false, error: error.message });
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in process-live-sheet:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function fetchSheetData(url: string, sheetType: string): Promise<string | null> {
  try {
    let csvUrl = url;

    if (sheetType === "google_sheets") {
      // Convert Google Sheets URL to CSV export URL
      const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (match) {
        const sheetId = match[1];
        csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
      }
    } else if (sheetType === "excel_online") {
      // For Excel Online, try to extract download URL
      // This is more complex and may require different handling
      if (url.includes("1drv.ms")) {
        // Short URL - need to resolve
        const response = await fetch(url, { redirect: "follow" });
        csvUrl = response.url.replace("embed", "download");
      }
    }

    console.log("Fetching from URL:", csvUrl);

    const response = await fetch(csvUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch sheet: ${response.status} ${response.statusText}`);
    }

    const data = await response.text();
    return data;
  } catch (error) {
    console.error("Error fetching sheet data:", error);
    return null;
  }
}

function calculateNextRun(frequency: string): Date {
  const now = new Date();
  const next = new Date(now);

  switch (frequency) {
    case "daily":
      next.setDate(next.getDate() + 1);
      break;
    case "weekly":
      next.setDate(next.getDate() + 7);
      break;
    case "monthly":
      next.setMonth(next.getMonth() + 1);
      break;
  }

  // Set to 6 AM UTC for consistency
  next.setUTCHours(6, 0, 0, 0);
  return next;
}

async function sendEmailNotification(
  supabase: any,
  connection: any,
  report: any
): Promise<void> {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    console.log("RESEND_API_KEY not configured, skipping email notification");
    return;
  }

  try {
    // Get user email from auth
    const { data: userData } = await supabase.auth.admin.getUserById(connection.user_id);
    const userEmail = userData?.user?.email;

    if (!userEmail) {
      console.log("Could not find user email");
      return;
    }

    const { Resend } = await import("npm:resend@2.0.0");
    const resend = new Resend(resendApiKey);

    const dashboardUrl = Deno.env.get("SITE_URL") || "https://app.anxoda.com";

    await resend.emails.send({
      from: "Anxoda <notifications@resend.dev>",
      to: [userEmail],
      subject: `📊 New Analysis Ready: ${connection.sheet_name}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 20px; }
            .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">📊 Analysis Complete!</h1>
            </div>
            <div class="content">
              <p>Hi there,</p>
              <p>Your scheduled analysis for <strong>${connection.sheet_name}</strong> is now ready to view.</p>
              <p>This report was generated from your live ${connection.sheet_type === 'google_sheets' ? 'Google Sheet' : 'Excel Online'} data.</p>
              <a href="${dashboardUrl}/#/dashboard" class="button">View Report</a>
              <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
                Next analysis scheduled: ${new Date(connection.next_run_at).toLocaleDateString()}
              </p>
            </div>
            <div class="footer">
              <p>Anxoda Business Consultancy</p>
              <p>You're receiving this because you set up automated analysis for your spreadsheet.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log(`Email notification sent to ${userEmail}`);
  } catch (error) {
    console.error("Error sending email notification:", error);
  }
}