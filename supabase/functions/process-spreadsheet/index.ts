import "https://deno.land/x/xhr@0.1.0/mod.ts";
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

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const filename = formData.get('filename') as string;

    if (!file || !filename) {
      throw new Error('File and filename are required');
    }

    // Validate file type
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Invalid file type. Only CSV and Excel files are allowed.');
    }

    // Generate unique file path
    const timestamp = Date.now();
    const fileExtension = filename.split('.').pop();
    const filePath = `${user.id}/${timestamp}_${filename}`;

    // Upload file to Supabase Storage
    const fileBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from('spreadsheets')
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error('Failed to upload file');
    }

    // Create database entry
    const { data: report, error: dbError } = await supabase
      .from('spreadsheet_reports')
      .insert([
        {
          user_id: user.id,
          title: filename.replace(`.${fileExtension}`, ''),
          original_filename: filename,
          file_path: filePath,
          processing_status: 'processing'
        }
      ])
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error('Failed to create report entry');
    }

    // Start background processing
    EdgeRuntime.waitUntil(processSpreadsheet(report.id, filePath, supabase));

    return new Response(
      JSON.stringify({ 
        success: true, 
        reportId: report.id,
        message: 'File uploaded successfully. Processing will begin shortly.' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201
      }
    );

  } catch (error) {
    console.error('Error in process-spreadsheet function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function processSpreadsheet(reportId: string, filePath: string, supabase: any) {
  try {
    console.log(`Starting processing for report ${reportId}`);

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('spreadsheets')
      .download(filePath);

    if (downloadError) {
      throw new Error('Failed to download file for processing');
    }

    // Convert file to text for basic analysis (simplified for MVP)
    const fileBuffer = await fileData.arrayBuffer();
    const fileText = new TextDecoder().decode(fileBuffer);
    
    // Basic CSV analysis
    const lines = fileText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const dataRows = lines.slice(1);
    
    const rowCount = dataRows.length;
    const columnCount = headers.length;

    // Generate basic statistics
    const stats = {
      totalRows: rowCount,
      totalColumns: columnCount,
      columns: headers,
      sampleData: dataRows.slice(0, 3).map(row => row.split(',').map(cell => cell.trim().replace(/"/g, '')))
    };

    // Call OpenAI for summary (if API key is available)
    let textSummary = `Data Analysis Summary:
    
This spreadsheet contains ${rowCount} rows and ${columnCount} columns.

Columns: ${headers.join(', ')}

Key Insights:
- The dataset has ${rowCount} records across ${columnCount} different fields
- Column headers suggest this contains ${headers.length > 5 ? 'comprehensive' : 'focused'} data
- Sample data indicates ${headers.some(h => h.toLowerCase().includes('date')) ? 'time-series' : 'categorical'} information

This is a basic analysis. For more detailed insights, consider reviewing the data structure and content patterns.`;

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (openaiApiKey) {
      try {
        const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: 'You are a data analyst. Analyze the provided spreadsheet data and generate a clear, business-focused summary with key insights and recommendations.'
              },
              {
                role: 'user',
                content: `Analyze this spreadsheet data:
                
Filename: ${filePath.split('/').pop()}
Row Count: ${rowCount}
Column Count: ${columnCount}
Columns: ${headers.join(', ')}
Sample Data (first 3 rows): ${JSON.stringify(stats.sampleData)}

Please provide a comprehensive analysis including:
1. Overview of the data structure
2. Key patterns or insights you can identify
3. Potential business applications
4. Recommendations for further analysis`
              }
            ],
            max_tokens: 1000
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          textSummary = aiData.choices[0].message.content;
        }
      } catch (aiError) {
        console.error('OpenAI API error:', aiError);
      }
    }

    // Generate chart data (simplified for MVP)
    const chartData = [];
    
    // Create a simple column distribution chart
    chartData.push({
      type: 'bar',
      title: 'Column Distribution',
      data: headers.map((header, index) => ({
        name: header,
        value: index + 1,
        count: rowCount
      }))
    });

    // If there are numeric-looking columns, create a sample chart
    const numericColumns = headers.filter(header => 
      !header.toLowerCase().includes('id') && 
      !header.toLowerCase().includes('name') &&
      !header.toLowerCase().includes('email')
    );

    if (numericColumns.length > 0) {
      chartData.push({
        type: 'line',
        title: 'Data Overview',
        data: Array.from({ length: Math.min(10, rowCount) }, (_, i) => ({
          index: i + 1,
          value: Math.floor(Math.random() * 100) + 1
        }))
      });
    }

    // Update report in database
    const { error: updateError } = await supabase
      .from('spreadsheet_reports')
      .update({
        processing_status: 'completed',
        text_summary: textSummary,
        chart_data: chartData,
        row_count: rowCount,
        column_count: columnCount
      })
      .eq('id', reportId);

    if (updateError) {
      throw new Error('Failed to update report');
    }

    console.log(`Successfully processed report ${reportId}`);

  } catch (error) {
    console.error(`Error processing report ${reportId}:`, error);
    
    // Update status to failed
    await supabase
      .from('spreadsheet_reports')
      .update({
        processing_status: 'failed',
        text_summary: `Processing failed: ${error.message}`
      })
      .eq('id', reportId);
  }
}