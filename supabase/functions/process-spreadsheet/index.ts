import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';
import * as XLSX from 'https://deno.land/x/sheetjs@v0.18.3/xlsx.mjs';

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

    const question = formData.get('question') as string;
    
    if (!file || !filename) {
      throw new Error('File and filename are required');
    }

    // Validate file type - allow via MIME or extension fallback
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    const fileExt = filename.split('.').pop()?.toLowerCase();
    const allowedExts = ['csv', 'xls', 'xlsx'];
    const typeAllowed = file?.type ? allowedTypes.includes(file.type) : false;
    const extAllowed = fileExt ? allowedExts.includes(fileExt) : false;
    if (!typeAllowed && !extAllowed) {
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
    EdgeRuntime.waitUntil(processSpreadsheet(report.id, filePath, supabase, question));

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

// processSpreadsheet with this enhanced implementation
async function processSpreadsheet(reportId: string, filePath: string, supabase: any, userQuestion?: string) {
  try {
    console.log(`Starting processing for report ${reportId}`);

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('spreadsheets')
      .download(filePath);

    if (downloadError || !fileData) {
      console.error('File download error:', downloadError);
      throw new Error('Failed to download file for processing');
    }

    // Parse spreadsheet data using XLSX
    const fileBuffer = await fileData.arrayBuffer();
    const workbook = XLSX.read(fileBuffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });

    if (!jsonData || jsonData.length === 0) throw new Error('No data found in spreadsheet');

    // Normalize headers & rows
    const headers = (jsonData[0] as any[]).map((h, i) => (h ? String(h).trim() : `Column ${i+1}`));
    const rawRows = jsonData.slice(1).filter((r: any[]) => r && r.some((c: any) => c != null && c !== ''));
    const dataRows = rawRows.map(row => {
      const obj: Record<string, any> = {};
      for (let i = 0; i < headers.length; i++) {
        obj[headers[i]] = row[i] !== undefined ? row[i] : null;
      }
      return obj;
    });

  // Analyze columns and generate charts
  const columnAnalysis = analyzeColumns(headers, rawRows);
  const chartData = generateCharts(headers, rawRows, columnAnalysis);

    // Prepare payload for OpenAI
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    let summary = '';
    let recommendations = [] as string[];
    let openaiError = null;

    if (openaiApiKey) {
      try {
        const prompt = [
          {
            role: 'system',
            content: `You are an expert business analyst. I need you to provide an exploatory analysis of this spreadsheet data, and give a recommendation to help the business scale based on chart insights, and a user question. Always return results as a valid JSON object with keys: summary (string), recommendations (array of strings). Your output must be strictly valid JSON, no markdown, no extra text, no explanations. Example: {"summary": "...", "recommendations": ["...", "..."]}`
          },
          {
            role: 'user',
            content: `Spreadsheet sample (first 10 rows):\n${JSON.stringify(dataRows.slice(0, 10))}\n\nChart insights: ${JSON.stringify(chartData.slice(0, 2))}\n\nUser question: ${userQuestion ?? 'None'}\nFocus on actionable business growth recommendations.`
          }
        ];

        const resp = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: prompt,
            temperature: 0.2,
            max_tokens: 800
          })
        });

        if (resp.ok) {
          const js = await resp.json();
          console.log('Raw OpenAI response:', js);
          let content = js.choices?.[0]?.message?.content ?? '';
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) content = jsonMatch[0];
          try {
            const parsed = JSON.parse(content);
            console.log('Parsed OpenAI summary:', parsed.summary);
            console.log('Parsed OpenAI recommendations:', parsed.recommendations);
            summary = parsed.summary ?? '';
            recommendations = Array.isArray(parsed.recommendations) ? parsed.recommendations : [];
          } catch (e) {
            openaiError = 'Failed to parse OpenAI response.';
          }
        } else {
          openaiError = 'OpenAI API call failed.';
        }
      } catch (e) {
        openaiError = `OpenAI error: ${e instanceof Error ? e.message : String(e)}`;
      }
    }

    // Fallback if OpenAI fails
    if (!summary) {
      summary = `Auto-summary: ${dataRows.length} rows, ${headers.length} columns. Top category: ${headers[0]}, sample value: ${dataRows[0]?.[headers[0]] ?? 'N/A'}`;
    }
    if (!recommendations.length) {
      recommendations = [
        'Focus marketing on top-performing categories and regions.',
        'Analyze pricing strategies to maximize profit margin.',
        'Investigate discount impact on sales and profit for optimization.',
        'Segment customers for targeted campaigns.',
        'Expand product mix in high-growth categories.'
      ];
    }

    // Update report in database
    await supabase.from('spreadsheet_reports').update({
      processing_status: 'completed',
      summary,
      recommendations,
      chart_data: chartData,
      openai_error: openaiError
    }).eq('id', reportId);

    console.log('Report processed:', { summary, recommendations, openaiError });

  } catch (e) {
    console.error('Spreadsheet processing error:', e);
    await supabase.from('spreadsheet_reports').update({
      processing_status: 'failed',
      error: `Spreadsheet processing error: ${e instanceof Error ? e.message : String(e)}`
    }).eq('id', reportId);
    return;
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