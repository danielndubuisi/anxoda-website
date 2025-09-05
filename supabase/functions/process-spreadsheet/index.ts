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
    let structuredSummary: any = null;

    if (openaiApiKey) {
      console.log('Generating AI insights with OpenAI...');
      try {
        // Calculate key business metrics from actual data for enhanced context
        const topCategories = dataAnalysis.categorical.length > 0 ? 
          (() => {
            const categoryCol = dataAnalysis.categorical[0];
            const categoryIndex = headers.indexOf(categoryCol);
            const counts = dataRows.reduce((acc: Record<string, number>, row) => {
              const category = String(row[categoryIndex] || 'Unknown');
              acc[category] = (acc[category] || 0) + 1;
              return acc;
            }, {});
            return Object.entries(counts)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 5)
              .map(([name, count]) => `${name}: ${count} records (${Math.round(count/dataRows.length*100)}%)`);
          })() : [];

        const revenueMetrics = dataAnalysis.numeric.length > 0 ?
          (() => {
            const revenueCol = dataAnalysis.numeric.find(col => 
              col.toLowerCase().includes('sales') || 
              col.toLowerCase().includes('revenue') || 
              col.toLowerCase().includes('amount') ||
              col.toLowerCase().includes('total')
            ) || dataAnalysis.numeric[0];
            const stats = dataAnalysis.descriptiveStats[revenueCol];
            return stats ? {
              column: revenueCol,
              total: stats.sum?.toLocaleString() || 'N/A',
              average: stats.mean?.toLocaleString() || 'N/A',
              max: stats.max?.toLocaleString() || 'N/A',
              min: stats.min?.toLocaleString() || 'N/A'
            } : null;
          })() : null;

        const prompt = [
          {
            role: 'system',
            content: `You are a senior business analyst providing executive-level insights. You MUST analyze the provided business data and generate specific, actionable recommendations with real numbers and percentages from the actual dataset.

CRITICAL REQUIREMENTS:
1. Use ACTUAL data values from the dataset - never use placeholder text
2. Include specific percentages, dollar amounts, and metrics from the provided statistics
3. Reference actual category names, regions, and values shown in the data
4. Provide concrete, quantified insights that a CEO could act on immediately

REQUIRED OUTPUT FORMAT (EXACT JSON STRUCTURE):
{
  "summary": "Executive summary with specific numbers from the dataset (e.g., 'Analysis of 1,247 transactions reveals Technology category drives 42% of revenue at $284K total')",
  "keyFindings": [
    "Finding with actual data values (e.g., 'West region customers spend 2.3x more than East region ($847 vs $366 average order)')",
    "Another insight with real percentages (e.g., 'Office Supplies category shows highest profit margin at 15.3% but only 23% of volume')",
    "Third finding with specific metrics (e.g., 'Top 20% of customers generate 65% of total revenue worth $1.2M')"
  ],
  "recommendations": [
    "Action with specific targets (e.g., 'Increase Technology category marketing budget by 40% to capture additional $89K revenue potential')",
    "Operational improvement with numbers (e.g., 'Focus on West region expansion - current $847 AOV suggests 180% growth opportunity')",
    "Growth strategy with ROI (e.g., 'Optimize Office Supplies pricing to increase 15.3% margin across 847 units for $127K impact')"
  ],
  "nextSteps": [
    "Immediate action with timeline (e.g., 'Launch targeted campaign for top 3 categories within 30 days')",
    "Medium-term initiative with metrics (e.g., 'Expand high-margin products to achieve 25% profit increase by Q3')",
    "Long-term strategy with targets (e.g., 'Replicate West region success model for 200% revenue growth')"
  ]
}

NEVER use generic terms like "top-performing categories" - USE THE ACTUAL CATEGORY NAMES from the data.
NEVER use placeholder percentages - USE THE CALCULATED STATISTICS provided.`
          },
          {
            role: 'user', 
            content: `URGENT: BUSINESS DATA ANALYSIS REQUEST

DATASET OVERVIEW:
• Business Domain: ${dataAnalysis.domain.toUpperCase()} analysis (${dataAnalysis.domainConfidence}% confidence)
• Data Scale: ${dataAnalysis.totalRows.toLocaleString()} transactions across ${dataAnalysis.totalColumns} business dimensions
• Column Types: ${dataAnalysis.numeric.length} numerical metrics, ${dataAnalysis.categorical.length} categories, ${dataAnalysis.dates.length} time-based fields

KEY BUSINESS METRICS:
${revenueMetrics ? `Primary Revenue Metric (${revenueMetrics.column}):
- Total Value: $${revenueMetrics.total}
- Average Transaction: $${revenueMetrics.average}  
- Highest Single Value: $${revenueMetrics.max}
- Range: $${revenueMetrics.min} to $${revenueMetrics.max}` : 'No revenue metrics identified'}

TOP CATEGORY BREAKDOWN:
${topCategories.length > 0 ? topCategories.join('\n') : 'No categorical data available'}

STATISTICAL ANALYSIS:
${JSON.stringify(dataAnalysis.descriptiveStats, null, 2)}

DATA COMPLETENESS:
${Object.entries(dataAnalysis.missingValues).map(([col, pct]) => `• ${col}: ${100-pct}% data quality`).join('\n')}

SAMPLE BUSINESS RECORDS (First 10):
${JSON.stringify(dataRows.slice(0, 10).map((row, i) => {
  const record = { Record: i+1 };
  headers.slice(0, 8).forEach(header => {
    record[header] = row[headers.indexOf(header)];
  });
  return record;
}), null, 2)}

ANALYSIS REQUEST: ${userQuestion || 'Generate executive-level business insights with specific recommendations for revenue growth, cost optimization, and operational efficiency'}

DELIVERABLE: Professional C-suite analysis with concrete numbers, specific category names, and actionable strategies with quantified ROI potential. Use the EXACT data values provided - no generic statements allowed.`
          }
        ];

        console.log('Sending OpenAI request with enhanced data context...');
        
        const requestBody = {
          model: 'gpt-4o-mini',
          messages: prompt,
          temperature: 0.1,
          max_tokens: 1500,
          response_format: { type: "json_object" }
        };

        console.log('OpenAI request body:', JSON.stringify(requestBody, null, 2));

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

        const resp = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (resp.ok) {
          const js = await resp.json();
          console.log('Raw OpenAI response status:', resp.status);
          console.log('OpenAI response body:', JSON.stringify(js, null, 2));
          
          let content = js.choices?.[0]?.message?.content ?? '';
          console.log('Raw OpenAI content:', content);
          
          if (!content) {
            console.error('OpenAI returned empty content');
            openaiError = 'OpenAI returned empty response content';
          } else {
            try {
              // Since we're using response_format: json_object, content should be valid JSON
              const parsed = JSON.parse(content);
              console.log('Successfully parsed OpenAI JSON response:', JSON.stringify(parsed, null, 2));
              
              if (parsed.summary && parsed.keyFindings && parsed.recommendations) {
                summary = parsed.summary;
                recommendations = Array.isArray(parsed.recommendations) ? parsed.recommendations : [];
                
                // Store the structured data with actual AI content
                structuredSummary = {
                  keyFindings: Array.isArray(parsed.keyFindings) ? parsed.keyFindings : [parsed.summary || 'No findings available'],
                  additionalKPIs: Array.isArray(parsed.nextSteps) ? parsed.nextSteps : [
                    `Processed ${dataRows.length.toLocaleString()} business records`,
                    `Analyzed ${headers.length} key performance dimensions`,
                    `Data integrity: ${Math.round(100 - (Object.values(dataAnalysis.missingValues).filter(v => v > 20).length / headers.length * 100))}% complete across all fields`
                  ],
                  recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : []
                };
                console.log('Successfully created structured summary from OpenAI response');
              } else {
                console.error('OpenAI response missing required fields. Available keys:', Object.keys(parsed));
                openaiError = `OpenAI response incomplete - missing required fields. Got: ${Object.keys(parsed).join(', ')}`;
              }
            } catch (e) {
              console.error('JSON parsing failed for OpenAI response:', e);
              console.error('Raw content that failed to parse:', content);
              openaiError = `Failed to parse OpenAI JSON: ${e.message}`;
            }
          }
        } else {
          const errorText = await resp.text();
          console.error('OpenAI API call failed with status:', resp.status);
          console.error('OpenAI error response:', errorText);
          openaiError = `OpenAI API call failed with status ${resp.status}: ${errorText}`;
        }
      } catch (e) {
        console.error('OpenAI integration error:', e);
        if (e.name === 'AbortError') {
          openaiError = 'OpenAI request timed out after 30 seconds';
        } else {
          openaiError = `OpenAI integration error: ${e instanceof Error ? e.message : String(e)}`;
        }
      }
    }

    // Enhanced fallback with data-driven insights if OpenAI fails
    if (!structuredSummary) {
      console.log('Creating enhanced fallback summary with actual data insights...');
      
      // Generate data-driven insights from actual statistics
      const dataInsights = [];
      const topCategory = dataAnalysis.categorical.length > 0 ? 
        (() => {
          const categoryCol = dataAnalysis.categorical[0];
          const categoryIndex = headers.indexOf(categoryCol);
          const counts = dataRows.reduce((acc: Record<string, number>, row) => {
            const category = String(row[categoryIndex] || 'Unknown');
            acc[category] = (acc[category] || 0) + 1;
            return acc;
          }, {});
          const topEntry = Object.entries(counts).sort(([,a], [,b]) => b - a)[0];
          return topEntry ? { name: topEntry[0], count: topEntry[1], percentage: Math.round(topEntry[1]/dataRows.length*100) } : null;
        })() : null;

      const revenueInsight = dataAnalysis.numeric.length > 0 ?
        (() => {
          const revenueCol = dataAnalysis.numeric.find(col => 
            col.toLowerCase().includes('sales') || 
            col.toLowerCase().includes('revenue') || 
            col.toLowerCase().includes('amount')
          ) || dataAnalysis.numeric[0];
          return dataAnalysis.descriptiveStats[revenueCol];
        })() : null;

      if (topCategory) {
        dataInsights.push(`${topCategory.name} is the leading category with ${topCategory.count.toLocaleString()} records (${topCategory.percentage}% of total)`);
      }
      
      if (revenueInsight) {
        dataInsights.push(`Revenue analysis shows average value of $${revenueInsight.mean?.toLocaleString() || 'N/A'} with total sum of $${revenueInsight.sum?.toLocaleString() || 'N/A'}`);
      }
      
      dataInsights.push(`Data completeness: ${Math.round(100 - (Object.values(dataAnalysis.missingValues).filter(v => v > 20).length / headers.length * 100))}% across ${headers.length} dimensions`);

      summary = `Analysis of ${dataRows.length.toLocaleString()} ${dataAnalysis.domain} records reveals key performance patterns and optimization opportunities.`;
      
      // Generate data-driven recommendations based on actual insights
      const dataRecommendations = [];
      if (topCategory) {
        dataRecommendations.push(`Focus resources on ${topCategory.name} segment which represents ${topCategory.percentage}% of your business volume`);
      }
      if (revenueInsight && revenueInsight.mean) {
        dataRecommendations.push(`Optimize pricing strategy around $${Math.round(revenueInsight.mean).toLocaleString()} average transaction value`);
      }
      if (dataAnalysis.domain !== 'general') {
        dataRecommendations.push(`Leverage ${dataAnalysis.domain} domain insights for targeted ${dataAnalysis.domainConfidence}% confidence strategic decisions`);
      }
      
      recommendations = dataRecommendations.length > 0 ? dataRecommendations : [
        "Implement data-driven decision making based on statistical analysis",
        "Focus on highest-volume segments for maximum impact",
        "Establish performance monitoring using identified key metrics"
      ];

      structuredSummary = {
        keyFindings: dataInsights.length > 0 ? dataInsights : [
          `Processed ${dataRows.length.toLocaleString()} business records across ${headers.length} dimensions`,
          `Identified ${dataAnalysis.numeric.length} quantitative metrics and ${dataAnalysis.categorical.length} categorical segments`,
          `Domain analysis indicates ${dataAnalysis.domain} focus with ${dataAnalysis.domainConfidence}% confidence`
        ],
        additionalKPIs: [
          `Total records analyzed: ${dataRows.length.toLocaleString()}`,
          `Business dimensions covered: ${headers.length}`,
          `Data quality score: ${Math.round(100 - (Object.values(dataAnalysis.missingValues).filter(v => v > 20).length / headers.length * 100))}%`,
          `Domain classification: ${dataAnalysis.domain} (${dataAnalysis.domainConfidence}% confidence)`
        ],
        recommendations: recommendations
      };
      
      console.log('Created enhanced fallback with data-driven insights:', structuredSummary);
    }

    // Update report in database with correct column names
    const updateData: any = {
      processing_status: 'completed',
      text_summary: structuredSummary,
      chart_data: chartData,
      row_count: dataRows.length,
      column_count: headers.length
    };
    
    if (openaiError) {
      updateData.error_message = openaiError;
    }

    await supabase.from('spreadsheet_reports').update(updateData).eq('id', reportId);

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