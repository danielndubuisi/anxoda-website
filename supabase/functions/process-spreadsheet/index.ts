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

    // Parse spreadsheet immediately to extract rich context
    const workbook = XLSX.read(fileBuffer, { type: 'array' });
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

    // Analyze dataset for rich context
    const dataAnalysis = analyzeDataset(headers, rawRows);
    
    // Calculate top categories with actual names
    const topCategories = dataAnalysis.categorical.length > 0 ? 
      (() => {
        const categoryCol = dataAnalysis.categorical[0];
        const categoryIndex = headers.indexOf(categoryCol);
        const counts = dataRows.reduce((acc: Record<string, number>, row) => {
          const category = String(row[categoryIndex] || 'Unspecified').trim();
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

    // Domain-specific metric selection
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
      } else if (dataAnalysis.domain === 'finance') {
        const financeCol = dataAnalysis.numeric.find(col => 
          col.toLowerCase().includes('expense') || 
          col.toLowerCase().includes('cost') || 
          col.toLowerCase().includes('budget')
        ) || dataAnalysis.numeric[0];
        return financeCol ? { column: financeCol, stats: dataAnalysis.descriptiveStats[financeCol] } : null;
      } else {
        const primaryCol = dataAnalysis.numeric[0];
        return primaryCol ? { column: primaryCol, stats: dataAnalysis.descriptiveStats[primaryCol] } : null;
      }
    })();

    // Build rich analysis context
    const analysisContext = {
      domain: dataAnalysis.domain,
      domainConfidence: dataAnalysis.domainConfidence,
      sampleRecords: dataRows.slice(0, 10),
      topCategories: topCategories,
      primaryMetrics: primaryMetrics,
      headers: headers,
      totalRows: dataRows.length,
      totalColumns: headers.length,
      descriptiveStats: dataAnalysis.descriptiveStats,
      missingValues: dataAnalysis.missingValues,
      categorical: dataAnalysis.categorical,
      numeric: dataAnalysis.numeric,
      dates: dataAnalysis.dates
    };

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

    // Start background processing with analyze edge function
    EdgeRuntime.waitUntil(delegateToAnalyze(report.id, user.id, filePath, question, analysisContext, supabase));

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

// Delegate processing to the analyze edge function with Python service
async function delegateToAnalyze(
  reportId: string,
  userId: string, 
  filePath: string,
  question: string | undefined,
  analysisContext: any,
  supabase: any
) {
  try {
    console.log(`Delegating analysis for report ${reportId} to Python service`);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    
    // Call the analyze edge function (no auth needed - it's a background function)
    const response = await fetch(`${supabaseUrl}/functions/v1/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        reportId,
        userId,
        sourcePath: filePath,
        question: question || null,
        analysisContext: analysisContext
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Analyze function failed:', errorText);
      throw new Error(`Analyze function failed: ${errorText}`);
    }
    
    const result = await response.json();
    console.log('Analysis completed successfully:', result);
    
  } catch (e) {
    console.error('Error delegating to analyze function:', e);
    await supabase.from('spreadsheet_reports').update({
      processing_status: 'failed',
      error_message: `Failed to delegate to analyze function: ${e instanceof Error ? e.message : String(e)}`
    }).eq('id', reportId);
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