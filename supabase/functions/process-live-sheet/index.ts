import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.0";
import * as XLSX from 'https://deno.land/x/sheetjs@v0.18.3/xlsx.mjs';

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
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("live_sheet_connections")
        .select("*")
        .eq("is_active", true)
        .lte("next_run_at", now);

      if (error) throw error;
      connections = data;
    } else if (connectionId) {
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
        const isScheduledRun = runScheduled === true;
        const isManualRun = !isScheduledRun && connectionId !== undefined;

        // Fetch the sheet data
        const sheetData = await fetchSheetData(connection.sheet_url, connection.sheet_type);

        if (!sheetData) {
          throw new Error("Failed to fetch sheet data. Make sure the sheet is publicly accessible.");
        }

        // Calculate hash of sheet data for change detection
        const currentDataHash = await generateDataHash(sheetData);
        const previousDataHash = connection.last_data_hash;
        
        console.log(`Hash comparison - Previous: ${previousDataHash?.substring(0, 8) || 'none'}, Current: ${currentDataHash.substring(0, 8)}`);

        // For scheduled runs, check if data has changed
        if (isScheduledRun && previousDataHash && previousDataHash === currentDataHash) {
          console.log(`No changes detected for ${connection.sheet_name}, skipping report generation`);
          
          // Update last_checked_at and next_run_at even when skipping
          const nextRunAt = calculateNextRun(connection.schedule_frequency);
          await supabase
            .from("live_sheet_connections")
            .update({
              last_checked_at: new Date().toISOString(),
              next_run_at: nextRunAt.toISOString(),
              error_message: null,
            })
            .eq("id", connection.id);

          results.push({ 
            connectionId: connection.id, 
            success: true, 
            action: "skipped_no_changes",
            message: "No changes detected in sheet data"
          });
          continue;
        }

        console.log(isManualRun 
          ? `Manual run triggered, generating report regardless of changes` 
          : `Changes detected, generating new report`
        );

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

        // Create a report entry with connection_id for linking
        const { data: report, error: reportError } = await supabase
          .from("spreadsheet_reports")
          .insert({
            user_id: connection.user_id,
            file_path: filePath,
            original_filename: `${connection.sheet_name}.csv`,
            title: `${connection.sheet_name} - ${new Date().toLocaleDateString()}`,
            processing_status: "processing",
            connection_id: connection.id,
          })
          .select()
          .single();

        if (reportError) throw reportError;

        // Process the spreadsheet data inline (same as process-spreadsheet)
        console.log(`Starting inline analysis for report ${report.id}`);
        
        // Parse spreadsheet data using XLSX
        const workbook = XLSX.read(sheetData, { type: 'string' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });

        if (!jsonData || jsonData.length === 0) {
          throw new Error('No data found in spreadsheet');
        }

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

        console.log(`Parsed ${dataRows.length} rows with ${headers.length} columns`);

        // Analyze dataset
        const dataAnalysis = analyzeDataset(headers, rawRows);
        const chartData = generateIntelligentCharts(headers, rawRows, dataAnalysis);

        console.log(`Analysis complete: domain=${dataAnalysis.domain}, confidence=${dataAnalysis.domainConfidence}%`);

        // Generate AI insights
        const { structuredSummary, aiError } = await generateAIInsights(
          dataAnalysis,
          headers,
          dataRows,
          rawRows
        );

        // Update report with analysis results
        await supabase
          .from("spreadsheet_reports")
          .update({
            processing_status: "completed",
            row_count: dataRows.length,
            column_count: headers.length,
            chart_data: chartData,
            text_summary: structuredSummary,
            kpis: {
              domain: dataAnalysis.domain,
              domainConfidence: dataAnalysis.domainConfidence,
              numericColumns: dataAnalysis.numeric.length,
              categoricalColumns: dataAnalysis.categorical.length,
              descriptiveStats: dataAnalysis.descriptiveStats
            },
            error_message: aiError || null,
            updated_at: new Date().toISOString()
          })
          .eq("id", report.id);

        console.log(`Report ${report.id} completed successfully`);

        // Calculate next run time
        const nextRunAt = calculateNextRun(connection.schedule_frequency);

        // Update connection status with new hash
        await supabase
          .from("live_sheet_connections")
          .update({
            last_run_at: new Date().toISOString(),
            last_checked_at: new Date().toISOString(),
            next_run_at: nextRunAt.toISOString(),
            last_report_id: report.id,
            last_data_hash: currentDataHash,
            error_message: null,
          })
          .eq("id", connection.id);

        // Send email notification only when a new report is generated
        await sendEmailNotification(supabase, connection, report);

        results.push({ 
          connectionId: connection.id, 
          success: true, 
          reportId: report.id,
          action: "report_generated"
        });
      } catch (error: any) {
        console.error(`Error processing connection ${connection.id}:`, error);

        // Update connection with error
        await supabase
          .from("live_sheet_connections")
          .update({
            error_message: error.message,
            last_checked_at: new Date().toISOString(),
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
      const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (match) {
        const sheetId = match[1];
        csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
      }
    } else if (sheetType === "excel_online") {
      if (url.includes("1drv.ms")) {
        const response = await fetch(url, { redirect: "follow" });
        csvUrl = response.url.replace("embed", "download");
      }
    }

    console.log("Fetching from URL:", csvUrl);

    const response = await fetch(csvUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch sheet: ${response.status} ${response.statusText}`);
    }

    return await response.text();
  } catch (error) {
    console.error("Error fetching sheet data:", error);
    return null;
  }
}

// Generate SHA-256 hash of data for change detection
async function generateDataHash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
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

  next.setUTCHours(6, 0, 0, 0);
  return next;
}

// Enhanced data profiling and domain detection
function analyzeDataset(headers: string[], dataRows: any[]) {
  const analysis = {
    types: {} as Record<string, string>,
    numeric: [] as string[],
    categorical: [] as string[],
    dates: [] as string[],
    identifiers: [] as string[],
    missingValues: {} as Record<string, number>,
    descriptiveStats: {} as Record<string, any>,
    domain: 'general' as string,
    domainConfidence: 0,
    totalRows: dataRows.length,
    totalColumns: headers.length
  };

  const domainKeywords = {
    sales: ['sales', 'revenue', 'profit', 'order', 'customer', 'price', 'amount', 'total'],
    hr: ['employee', 'hire_date', 'salary', 'department', 'attrition', 'staff', 'worker'],
    finance: ['expense', 'budget', 'cost', 'account', 'financial', 'income', 'expenditure'],
    operations: ['inventory', 'shipment', 'delivery', 'stock', 'supplier', 'logistics'],
    marketing: ['campaign', 'impressions', 'clicks', 'leads', 'conversion', 'ads', 'ctr']
  };

  let domainScores = { sales: 0, hr: 0, finance: 0, operations: 0, marketing: 0, general: 0 };

  headers.forEach((header, colIndex) => {
    const headerLower = header.toLowerCase();
    const values = dataRows.map(row => row[colIndex]).filter(val => val != null && val !== '');
    const missingCount = dataRows.length - values.length;
    
    analysis.missingValues[header] = Math.round((missingCount / dataRows.length) * 100);

    Object.entries(domainKeywords).forEach(([domain, keywords]) => {
      keywords.forEach(keyword => {
        if (headerLower.includes(keyword)) {
          domainScores[domain as keyof typeof domainScores] += 1;
        }
      });
    });

    if (values.length === 0) {
      analysis.types[header] = 'empty';
      return;
    }

    const uniqueRatio = new Set(values).size / values.length;
    if (uniqueRatio > 0.9 && (headerLower.includes('id') || headerLower.includes('key'))) {
      analysis.types[header] = 'identifier';
      analysis.identifiers.push(header);
      return;
    }

    const numericValues = values.filter(val => !isNaN(Number(val)) && val !== '');
    const numericRatio = numericValues.length / values.length;

    const dateValues = values.filter(val => {
      const date = new Date(val);
      return !isNaN(date.getTime()) && val.toString().match(/\d{4}|\d{1,2}\/\d{1,2}/);
    });
    const dateRatio = dateValues.length / values.length;

    if (dateRatio > 0.7) {
      analysis.types[header] = 'date';
      analysis.dates.push(header);
    } else if (numericRatio > 0.7) {
      analysis.types[header] = 'numeric';
      analysis.numeric.push(header);
      
      const nums = numericValues.map(Number);
      if (nums.length > 0) {
        nums.sort((a, b) => a - b);
        const sum = nums.reduce((a, b) => a + b, 0);
        const mean = sum / nums.length;
        const median = nums[Math.floor(nums.length / 2)];
        const std = Math.sqrt(nums.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / nums.length);
        
        analysis.descriptiveStats[header] = {
          count: nums.length,
          mean: Math.round(mean * 100) / 100,
          median: Math.round(median * 100) / 100,
          std: Math.round(std * 100) / 100,
          min: nums[0],
          max: nums[nums.length - 1],
          sum: Math.round(sum * 100) / 100
        };
      }
    } else {
      analysis.types[header] = 'categorical';
      analysis.categorical.push(header);
    }
  });

  const maxScore = Math.max(...Object.values(domainScores));
  if (maxScore > 0) {
    const detectedDomain = Object.entries(domainScores).find(([_, score]) => score === maxScore);
    if (detectedDomain) {
      analysis.domain = detectedDomain[0];
      analysis.domainConfidence = Math.round((maxScore / headers.length) * 100);
    }
  }

  return analysis;
}

// Generate intelligent charts based on domain and data types
function generateIntelligentCharts(headers: string[], dataRows: any[], analysis: any) {
  const charts = [];
  const { domain, numeric, categorical, dates, descriptiveStats } = analysis;

  if (domain === 'sales' && numeric.length > 0) {
    if (dates.length > 0) {
      const dateCol = dates[0];
      const salesCol = numeric.find(col => 
        col.toLowerCase().includes('sales') || 
        col.toLowerCase().includes('revenue') || 
        col.toLowerCase().includes('amount')
      ) || numeric[0];
      
      charts.push({
        type: 'line',
        title: `${salesCol} Trend Over Time`,
        data: dataRows.slice(0, 50).map((row, index) => ({
          date: row[headers.indexOf(dateCol)],
          value: Number(row[headers.indexOf(salesCol)]) || 0,
          label: `${dateCol}: ${row[headers.indexOf(dateCol)]}`
        }))
      });
    }

    if (categorical.length > 0 && numeric.length > 0) {
      const categoryCol = categorical[0];
      const valueCol = numeric[0];
      const aggregated = dataRows.reduce((acc: Record<string, number>, row) => {
        const category = String(row[headers.indexOf(categoryCol)] || 'Unknown');
        const value = Number(row[headers.indexOf(valueCol)]) || 0;
        acc[category] = (acc[category] || 0) + value;
        return acc;
      }, {});

      const topCategories = Object.entries(aggregated)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10);

      charts.push({
        type: 'bar',
        title: `Top ${categoryCol} by ${valueCol}`,
        data: topCategories.map(([name, value]) => ({
          name: name.substring(0, 20),
          value,
          count: value
        }))
      });
    }
  } else if (domain === 'hr') {
    if (categorical.length > 0) {
      const deptCol = categorical.find(col => col.toLowerCase().includes('department')) || categorical[0];
      const deptCounts = dataRows.reduce((acc: Record<string, number>, row) => {
        const dept = String(row[headers.indexOf(deptCol)] || 'Unknown');
        acc[dept] = (acc[dept] || 0) + 1;
        return acc;
      }, {});

      charts.push({
        type: 'pie',
        title: `${deptCol} Distribution`,
        data: Object.entries(deptCounts).map(([name, count]) => ({
          name: name.substring(0, 15),
          value: count,
          count
        }))
      });
    }

    const salaryCol = numeric.find(col => col.toLowerCase().includes('salary'));
    if (salaryCol && descriptiveStats[salaryCol]) {
      charts.push({
        type: 'histogram',
        title: `${salaryCol} Distribution`,
        data: [
          { range: 'Min', value: descriptiveStats[salaryCol].min },
          { range: 'Q1', value: descriptiveStats[salaryCol].min * 1.25 },
          { range: 'Median', value: descriptiveStats[salaryCol].median },
          { range: 'Q3', value: descriptiveStats[salaryCol].median * 1.25 },
          { range: 'Max', value: descriptiveStats[salaryCol].max }
        ]
      });
    }
  }

  if (dates.length > 0 && numeric.length > 0) {
    const dateCol = dates[0];
    const valueCol = numeric[0];
    
    charts.push({
      type: 'line',
      title: `${valueCol} Over Time`,
      data: dataRows.slice(0, 100).map((row, index) => ({
        date: row[headers.indexOf(dateCol)],
        value: Number(row[headers.indexOf(valueCol)]) || 0,
        index
      }))
    });
  }

  if (numeric.length >= 2) {
    const correlationData = [];
    for (let i = 0; i < Math.min(numeric.length, 5); i++) {
      for (let j = i + 1; j < Math.min(numeric.length, 5); j++) {
        const col1 = numeric[i];
        const col2 = numeric[j];
        const values1 = dataRows.map(row => Number(row[headers.indexOf(col1)])).filter(v => !isNaN(v));
        const values2 = dataRows.map(row => Number(row[headers.indexOf(col2)])).filter(v => !isNaN(v));
        
        if (values1.length > 10 && values2.length > 10) {
          correlationData.push({
            x: col1.substring(0, 10),
            y: col2.substring(0, 10),
            correlation: calculateCorrelation(values1, values2)
          });
        }
      }
    }

    if (correlationData.length > 0) {
      charts.push({
        type: 'correlation',
        title: 'Variable Correlations',
        data: correlationData
      });
    }
  }

  if (Object.keys(descriptiveStats).length > 0) {
    const statsData = Object.entries(descriptiveStats).slice(0, 6).map(([col, stats]) => ({
      name: col.substring(0, 12),
      mean: stats.mean,
      median: stats.median,
      std: stats.std,
      count: stats.count
    }));

    charts.push({
      type: 'statistics',
      title: 'Statistical Summary',
      data: statsData
    });
  }

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

function calculateCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;
  
  const sumX = x.slice(0, n).reduce((a, b) => a + b, 0);
  const sumY = y.slice(0, n).reduce((a, b) => a + b, 0);
  const sumXY = x.slice(0, n).reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.slice(0, n).reduce((sum, xi) => sum + xi * xi, 0);
  const sumY2 = y.slice(0, n).reduce((sum, yi) => sum + yi * yi, 0);
  
  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  
  return denominator === 0 ? 0 : Math.round((numerator / denominator) * 100) / 100;
}

async function generateAIInsights(
  dataAnalysis: any,
  headers: string[],
  dataRows: any[],
  rawRows: any[]
): Promise<{ structuredSummary: any; aiError: string | null }> {
  let structuredSummary: any = null;
  let aiError: string | null = null;

  // Calculate top categories and primary metrics
  const topCategories = dataAnalysis.categorical.length > 0 ? 
    (() => {
      const categoryCol = dataAnalysis.categorical[0];
      const categoryIndex = headers.indexOf(categoryCol);
      const counts = dataRows.reduce((acc: Record<string, number>, row) => {
        const category = String(row[categoryCol] || 'Unspecified').trim();
        if (category && category !== 'null' && category !== 'undefined' && category !== '') {
          acc[category] = (acc[category] || 0) + 1;
        }
        return acc;
      }, {});
      
      return Object.entries(counts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([name, count]) => `${name}: ${count} records (${Math.round(count/dataRows.length*100)}%)`);
    })() : [];

  const primaryMetrics = (() => {
    if (dataAnalysis.domain === 'hr') {
      const salaryCol = dataAnalysis.numeric.find(col => 
        col.toLowerCase().includes('salary') || 
        col.toLowerCase().includes('wage') || 
        col.toLowerCase().includes('compensation')
      ) || dataAnalysis.numeric[0];
      return salaryCol ? { column: salaryCol, stats: dataAnalysis.descriptiveStats[salaryCol] } : null;
    } else if (dataAnalysis.domain === 'sales') {
      const revenueCol = dataAnalysis.numeric.find(col => 
        col.toLowerCase().includes('sales') || 
        col.toLowerCase().includes('revenue') || 
        col.toLowerCase().includes('amount') ||
        col.toLowerCase().includes('total')
      ) || dataAnalysis.numeric[0];
      return revenueCol ? { column: revenueCol, stats: dataAnalysis.descriptiveStats[revenueCol] } : null;
    } else {
      const primaryCol = dataAnalysis.numeric[0];
      return primaryCol ? { column: primaryCol, stats: dataAnalysis.descriptiveStats[primaryCol] } : null;
    }
  })();

  // Try AI providers (Lovable AI → OpenAI → Fallback)
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  
  let aiProvider = 'none';
  let aiApiKey = null;
  let aiEndpoint = null;
  let aiModel = 'gpt-4o-mini';
  
  if (lovableApiKey) {
    aiProvider = 'lovable';
    aiApiKey = lovableApiKey;
    aiEndpoint = 'https://ai.gateway.lovable.dev/v1/chat/completions';
    aiModel = 'google/gemini-2.5-flash';
    console.log('Using Lovable AI with Gemini 2.5 Flash');
  } else if (openaiApiKey) {
    aiProvider = 'openai';
    aiApiKey = openaiApiKey;
    aiEndpoint = 'https://api.openai.com/v1/chat/completions';
    aiModel = 'gpt-4o-mini';
    console.log('Using OpenAI with GPT-4o-mini');
  } else {
    console.log('No AI provider available, using statistical fallback');
  }

  if (aiProvider !== 'none') {
    try {
      const prompt = [
        {
          role: 'system',
          content: `You are a senior business advisor who translates complex data into simple, actionable advice that any business owner can understand and implement immediately.

YOUR ROLE:
- Write like you're advising a business owner who doesn't understand analytics
- Give SPECIFIC actions, not suggestions to "investigate" or "analyze"
- Include exact numbers, percentages, and amounts from the data
- Explain WHY each action matters and WHAT the expected outcome is
- Use simple, direct language - avoid jargon

RESPONSE FORMAT (JSON):
{
  "summary": "A 2-3 sentence explanation of the biggest opportunity or problem found, written for a non-technical reader",
  "keyFindings": ["Finding with specific metric and business implication", "Another finding with quantified impact"],
  "prescriptions": [
    {
      "title": "Short action title (e.g., 'Balance Employee Salaries')",
      "action": "Exactly what to do - be specific and direct",
      "reason": "Why this matters based on the data",
      "expectedOutcome": "Quantified benefit or improvement expected",
      "priority": "high/medium/low",
      "effort": "low/medium/high"
    }
  ],
  "recommendations": ["Same prescriptions written as simple sentences for display"],
  "nextSteps": ["First immediate action to take", "Second action", "Third action"]
}

PRESCRIPTION WRITING RULES:
1. Start with the business impact: "The company can increase..." or "You can reduce..."
2. Include specific numbers: "by 15%" or "by $50,000" not "significantly"
3. Explain the "so what": Why should they care?
4. Be prescriptive: "Do X to achieve Y" not "Consider doing X"
5. Keep it simple: If a 10th grader can't understand it, rewrite it

EXAMPLE PRESCRIPTIONS:
- "The company can increase their compliance rating by balancing the average salary difference between male and female employees, which currently shows a gap of $12,500."
- "You can reduce customer churn by 18% by focusing retention efforts on the 25-35 age group, who currently represent 40% of cancellations but only 15% of new signups."
- "On data collection, 273 more samples of the industry salary rating could help improve the confidence level of the current average."`
        },
        {
          role: 'user', 
          content: `Analyze this ${dataAnalysis.domain.toUpperCase()} dataset and provide PRESCRIPTIVE recommendations that a non-technical business owner can act on TODAY:

Dataset Overview:
- Records: ${dataAnalysis.totalRows.toLocaleString()}
- Columns: ${dataAnalysis.totalColumns}
- Domain: ${dataAnalysis.domain} (${dataAnalysis.domainConfidence}% confidence)

Key Statistics:
${JSON.stringify(dataAnalysis.descriptiveStats, null, 2)}

Top Categories:
${topCategories.join('\n')}

Primary Metric: ${primaryMetrics?.column || 'N/A'} - Mean: ${primaryMetrics?.stats?.mean || 'N/A'}, Sum: ${primaryMetrics?.stats?.sum || 'N/A'}

Sample Data (first 3 rows):
${JSON.stringify(dataRows.slice(0, 3), null, 2)}

Remember: Your reader is busy and not technical. For each prescription, state:
1. What to do (specific action)
2. Why it matters (backed by data)
3. What they'll gain (quantified outcome)`
        }
      ];

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const resp = await fetch(aiEndpoint!, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${aiApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: aiModel,
          messages: prompt,
          temperature: 0.1,
          max_tokens: 2000,
          response_format: { type: "json_object" }
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (resp.status === 429) {
        console.warn('AI rate limit exceeded');
        aiError = 'AI rate limit - using statistical analysis';
      } else if (resp.status === 402) {
        console.warn('AI quota exceeded');
        aiError = 'AI quota exceeded - using statistical analysis';
      } else if (!resp.ok) {
        const errorText = await resp.text();
        console.error('AI API error:', resp.status, errorText);
        aiError = `AI error: ${resp.status}`;
      } else {
        const js = await resp.json();
        const content = js.choices?.[0]?.message?.content ?? '';
        
        if (content) {
          try {
            const parsed = JSON.parse(content);
            if (parsed.summary && (parsed.prescriptions || parsed.keyFindings || parsed.recommendations)) {
              structuredSummary = {
                keyFindings: parsed.keyFindings || [],
                additionalKPIs: parsed.nextSteps || [],
                recommendations: parsed.recommendations || [],
                prescriptions: parsed.prescriptions || []
              };
              console.log('AI insights generated successfully');
            }
          } catch (e) {
            console.error('Failed to parse AI response:', e);
            aiError = 'Failed to parse AI response';
          }
        }
      }
    } catch (e) {
      console.error('AI integration error:', e);
      if (e.name === 'AbortError') {
        aiError = 'AI request timed out';
      } else {
        aiError = `AI error: ${e instanceof Error ? e.message : String(e)}`;
      }
    }
  }

  // Statistical fallback if AI failed
  if (!structuredSummary) {
    console.log('Using statistical fallback for insights');
    
    const topCategory = dataAnalysis.categorical.length > 0 ? 
      (() => {
        const categoryCol = dataAnalysis.categorical[0];
        const counts = dataRows.reduce((acc: Record<string, number>, row) => {
          const category = String(row[categoryCol] || 'Unspecified').trim();
          if (category && category !== 'null' && category !== 'undefined' && category !== '') {
            acc[category] = (acc[category] || 0) + 1;
          }
          return acc;
        }, {});
        
        const entries = Object.entries(counts).filter(([name]) => name && name !== 'Unspecified');
        if (entries.length === 0) return null;
        
        const topEntry = entries.sort(([,a], [,b]) => b - a)[0];
        return { 
          name: topEntry[0], 
          count: topEntry[1], 
          percentage: Math.round(topEntry[1]/dataRows.length*100)
        };
      })() : null;

    const keyFindings = [];
    
    if (topCategory) {
      keyFindings.push(`${topCategory.name} is the leading ${dataAnalysis.categorical[0]} with ${topCategory.count.toLocaleString()} records (${topCategory.percentage}% of dataset)`);
    }
    
    if (primaryMetrics?.stats) {
      keyFindings.push(`Average ${primaryMetrics.column}: $${primaryMetrics.stats.mean?.toLocaleString() || 'N/A'}, Total: $${primaryMetrics.stats.sum?.toLocaleString() || 'N/A'}`);
    }
    
    keyFindings.push(`Data quality: ${Math.round(100 - (Object.values(dataAnalysis.missingValues).filter(v => v > 20).length / headers.length * 100))}% completeness across ${headers.length} dimensions`);

    const recommendations = [];
    if (topCategory) {
      recommendations.push(`Focus on ${topCategory.name} segment which drives ${topCategory.percentage}% of activity`);
    }
    if (primaryMetrics?.stats?.mean) {
      recommendations.push(`Optimize around $${Math.round(primaryMetrics.stats.mean).toLocaleString()} average ${primaryMetrics.column.toLowerCase()} value`);
    }
    recommendations.push(`Leverage ${dataAnalysis.domain}-specific insights for strategic decisions`);

    structuredSummary = {
      keyFindings,
      additionalKPIs: [
        `Total records: ${dataRows.length.toLocaleString()}`,
        `Business dimensions: ${headers.length}`,
        `Domain: ${dataAnalysis.domain} (${dataAnalysis.domainConfidence}% confidence)`
      ],
      recommendations
    };
  }

  return { structuredSummary, aiError };
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
