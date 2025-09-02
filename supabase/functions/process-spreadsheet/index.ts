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

  // Enhanced data analysis and intelligent chart generation
  const dataAnalysis = analyzeDataset(headers, rawRows);
  const chartData = generateIntelligentCharts(headers, rawRows, dataAnalysis, userQuestion);

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
            content: `You are an expert data analyst and business strategist with deep expertise in ${dataAnalysis.domain} domain analysis. Your role is to analyze datasets and provide actionable business insights.

ANALYSIS FRAMEWORK:
1. Data Understanding: Interpret the dataset context, quality, and structure
2. Domain Expertise: Apply ${dataAnalysis.domain}-specific knowledge and best practices  
3. Statistical Insights: Identify patterns, trends, correlations, and anomalies
4. Business Intelligence: Translate findings into strategic recommendations
5. Growth Focus: Prioritize recommendations that drive scalability and ROI

OUTPUT FORMAT (JSON only):
{
  "summary": "Executive summary of key findings and dataset insights",
  "keyFindings": ["Finding 1", "Finding 2", "Finding 3"],
  "additionalKPIs": {
    "growth_rate": "calculated_percentage",
    "efficiency_score": "calculated_score", 
    "risk_level": "high|medium|low"
  },
  "recommendations": ["Actionable recommendation 1", "Actionable recommendation 2", "Actionable recommendation 3"]
}

CRITICAL: Output valid JSON only. No markdown, explanations, or additional text.`
          },
          {
            role: 'user', 
            content: `DATASET ANALYSIS:
Domain: ${dataAnalysis.domain} (${dataAnalysis.domainConfidence}% confidence)
Rows: ${dataAnalysis.totalRows}, Columns: ${dataAnalysis.totalColumns}
Data Types: ${dataAnalysis.numeric.length} numeric, ${dataAnalysis.categorical.length} categorical, ${dataAnalysis.dates.length} dates

STATISTICAL SUMMARY:
${JSON.stringify(dataAnalysis.descriptiveStats, null, 2)}

DATA QUALITY:
Missing Values: ${JSON.stringify(dataAnalysis.missingValues)}

SAMPLE DATA (first 20 rows):
${JSON.stringify(dataRows.slice(0, 20), null, 2)}

GENERATED VISUALIZATIONS:
${JSON.stringify(chartData, null, 2)}

USER QUESTION: ${userQuestion || 'Provide comprehensive business analysis and growth recommendations'}

Focus on:
- Domain-specific insights (${dataAnalysis.domain})
- Statistical patterns and trends  
- Data quality implications
- Scalability opportunities
- ROI optimization strategies`
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

  // Domain detection keywords
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

    // Domain scoring based on header names
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

    // Check for ID fields
    const uniqueRatio = new Set(values).size / values.length;
    if (uniqueRatio > 0.9 && (headerLower.includes('id') || headerLower.includes('key'))) {
      analysis.types[header] = 'identifier';
      analysis.identifiers.push(header);
      return;
    }

    // Check for numeric data
    const numericValues = values.filter(val => !isNaN(Number(val)) && val !== '');
    const numericRatio = numericValues.length / values.length;

    // Check for date data
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
      
      // Calculate descriptive statistics for numeric columns
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

  // Determine domain
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

// Enhanced intelligent chart generation based on domain and data types
function generateIntelligentCharts(headers: string[], dataRows: any[], analysis: any, userQuestion?: string) {
  const charts = [];
  const { domain, numeric, categorical, dates, descriptiveStats } = analysis;

  // Domain-specific chart generation
  if (domain === 'sales' && numeric.length > 0) {
    // Sales trend over time if date column exists
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

    // Top products/categories by sales
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
    // Department distribution
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

    // Salary distribution if available
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

  // Time series analysis for any domain with dates
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

  // Correlation analysis for numeric columns
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

  // Statistical summary chart
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

  // Ensure we have at least 3 meaningful charts
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