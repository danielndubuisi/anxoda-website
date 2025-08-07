import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';
import * as XLSX from 'https://esm.sh/xlsx@0.20.2';

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

    // Parse spreadsheet data using XLSX
    const fileBuffer = await fileData.arrayBuffer();
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Convert to JSON with headers
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (jsonData.length === 0) {
      throw new Error('No data found in spreadsheet');
    }
    
    const headers = jsonData[0] as string[];
    const dataRows = jsonData.slice(1);
    const rowCount = dataRows.length;
    const columnCount = headers.length;

    // Analyze data types and patterns
    const columnAnalysis = analyzeColumns(headers, dataRows);
    
    // Generate comprehensive statistics
    const stats = {
      totalRows: rowCount,
      totalColumns: columnCount,
      columns: headers,
      columnTypes: columnAnalysis.types,
      sampleData: dataRows.slice(0, 5),
      numericColumns: columnAnalysis.numeric,
      categoricalColumns: columnAnalysis.categorical,
      dateColumns: columnAnalysis.dates
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

    // Generate intelligent chart data based on actual data
    const chartData = generateCharts(headers, dataRows, columnAnalysis);

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

// Helper function to analyze column types and patterns
function analyzeColumns(headers: string[], dataRows: any[]) {
  const analysis = {
    types: {} as Record<string, string>,
    numeric: [] as string[],
    categorical: [] as string[],
    dates: [] as string[]
  };

  headers.forEach((header, colIndex) => {
    const values = dataRows.map(row => row[colIndex]).filter(val => val != null && val !== '');
    
    if (values.length === 0) {
      analysis.types[header] = 'empty';
      return;
    }

    // Check for numeric data
    const numericValues = values.filter(val => !isNaN(Number(val)) && val !== '').length;
    const numericRatio = numericValues / values.length;

    // Check for date data
    const dateValues = values.filter(val => {
      const date = new Date(val);
      return !isNaN(date.getTime()) && val.toString().match(/\d{4}|\d{1,2}\/\d{1,2}/);
    }).length;
    const dateRatio = dateValues / values.length;

    if (dateRatio > 0.7) {
      analysis.types[header] = 'date';
      analysis.dates.push(header);
    } else if (numericRatio > 0.7) {
      analysis.types[header] = 'numeric';
      analysis.numeric.push(header);
    } else {
      analysis.types[header] = 'categorical';
      analysis.categorical.push(header);
    }
  });

  return analysis;
}

// Helper function to generate intelligent charts
function generateCharts(headers: string[], dataRows: any[], columnAnalysis: any) {
  const charts = [];

  // 1. Data Overview Chart
  if (columnAnalysis.numeric.length > 0) {
    const firstNumericCol = columnAnalysis.numeric[0];
    const colIndex = headers.indexOf(firstNumericCol);
    const values = dataRows.map(row => Number(row[colIndex])).filter(val => !isNaN(val));
    
    if (values.length > 0) {
      const sampleSize = Math.min(20, values.length);
      const sampledData = values.slice(0, sampleSize).map((value, index) => ({
        index: index + 1,
        value: value,
        label: `Row ${index + 1}`
      }));

      charts.push({
        type: 'line',
        title: `${firstNumericCol} Trend`,
        data: sampledData
      });
    }
  }

  // 2. Category Distribution Chart
  if (columnAnalysis.categorical.length > 0) {
    const firstCatCol = columnAnalysis.categorical[0];
    const colIndex = headers.indexOf(firstCatCol);
    const values = dataRows.map(row => row[colIndex]).filter(val => val != null && val !== '');
    
    // Count occurrences
    const counts = values.reduce((acc: Record<string, number>, val) => {
      const key = String(val).substring(0, 20); // Limit label length
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    // Take top 10 categories
    const sortedCounts = Object.entries(counts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);

    if (sortedCounts.length > 0) {
      charts.push({
        type: 'bar',
        title: `${firstCatCol} Distribution`,
        data: sortedCounts.map(([name, count]) => ({
          name,
          count,
          value: count
        }))
      });
    }
  }

  // 3. Summary Statistics Chart
  if (columnAnalysis.numeric.length > 1) {
    const statsData = columnAnalysis.numeric.slice(0, 5).map(colName => {
      const colIndex = headers.indexOf(colName);
      const values = dataRows.map(row => Number(row[colIndex])).filter(val => !isNaN(val));
      
      if (values.length === 0) return null;
      
      const sum = values.reduce((a, b) => a + b, 0);
      const avg = sum / values.length;
      const max = Math.max(...values);
      const min = Math.min(...values);

      return {
        name: colName.substring(0, 15),
        average: Math.round(avg * 100) / 100,
        maximum: max,
        minimum: min,
        count: values.length
      };
    }).filter(Boolean);

    if (statsData.length > 0) {
      charts.push({
        type: 'bar',
        title: 'Numeric Columns Summary',
        data: statsData
      });
    }
  }

  // Ensure we have at least one chart
  if (charts.length === 0) {
    charts.push({
      type: 'bar',
      title: 'Data Overview',
      data: headers.slice(0, 10).map((header, index) => ({
        name: header.substring(0, 15),
        count: dataRows.length,
        value: dataRows.length
      }))
    });
  }

  return charts;
}