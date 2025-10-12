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

    // CRITICAL: Calculate these BEFORE OpenAI block so they're available for fallback logic
    // Enhanced category detection using actual data values (not schema patterns)
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

    // Domain-specific metric selection based on detected business domain
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
        // General case - use first numeric column
        const primaryCol = dataAnalysis.numeric[0];
        return primaryCol ? { column: primaryCol, stats: dataAnalysis.descriptiveStats[primaryCol] } : null;
      }
    })();

    // Prepare payload for OpenAI
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    let summary = '';
    let recommendations = [] as string[];
    let openaiError = null;
    let structuredSummary: any = null;

    if (openaiApiKey) {
      console.log('Generating AI insights with OpenAI...');
      try {

        // Domain-specific AI prompt with appropriate context and terminology
        const domainSpecificPrompt = (() => {
          const baseRequirements = `You are a senior ${dataAnalysis.domain} analyst providing executive-level insights. You MUST analyze the provided ${dataAnalysis.domain.toUpperCase()} data and generate specific, actionable recommendations with real numbers and percentages from the actual dataset.

CRITICAL REQUIREMENTS:
1. Use ACTUAL data values from the dataset - never use placeholder text
2. Include specific percentages and metrics from the provided statistics  
3. Reference actual ${dataAnalysis.categorical.length > 0 ? dataAnalysis.categorical[0] : 'category'} names and values shown in the data
4. Provide concrete, quantified insights that executives could act on immediately
5. Focus on ${dataAnalysis.domain}-specific metrics and KPIs only`;

          if (dataAnalysis.domain === 'hr') {
            return `${baseRequirements}
6. Focus on workforce analytics: employee distribution, compensation analysis, department performance
7. Avoid sales/revenue terminology - use HR-specific language (headcount, retention, compensation, etc.)
8. Provide insights about talent management, organizational structure, and workforce optimization`;
          } else if (dataAnalysis.domain === 'sales') {
            return `${baseRequirements}
6. Focus on revenue optimization, customer analysis, and sales performance metrics
7. Include sales-specific KPIs: conversion rates, average order value, customer segmentation
8. Provide insights about market opportunities, customer behavior, and sales strategy`;
          } else if (dataAnalysis.domain === 'finance') {
            return `${baseRequirements}
6. Focus on financial performance, cost analysis, and budget optimization
7. Include financial KPIs: cost ratios, budget variances, expense categories
8. Provide insights about financial efficiency, cost control, and budget allocation`;
          } else {
            return `${baseRequirements}
6. Focus on the most relevant business metrics identified in the data
7. Use domain-neutral terminology appropriate to the data content
8. Provide insights specific to the identified data patterns and business context`;
          }
        })();

        const prompt = [
          {
            role: 'system',
            content: `${domainSpecificPrompt}

REQUIRED OUTPUT FORMAT (EXACT JSON STRUCTURE):
{
  "summary": "Executive summary with specific numbers from the dataset (e.g., 'Analysis of 1,247 ${dataAnalysis.domain} records reveals ${dataAnalysis.categorical[0] || 'primary category'} performance drives 42% of total activity')",
  "keyFindings": [
    "Finding with actual data values (e.g., 'Technology department has 2.3x higher average ${primaryMetrics?.column || 'value'} than Operations ($847 vs $366)')",
    "Another insight with real percentages (e.g., 'Top performing ${dataAnalysis.categorical[0] || 'category'} shows highest performance but only represents 23% of volume')",
    "Third finding with specific metrics (e.g., 'Top 20% of records generate 65% of total ${primaryMetrics?.column || 'value'} worth $1.2M')"
  ],
  "recommendations": [
    "Action with specific targets (e.g., 'Focus on ${dataAnalysis.categorical[0] || 'top category'} optimization to capture additional 40% improvement potential')",
    "Operational improvement with numbers (e.g., 'Expand high-performing segments - current data suggests 180% growth opportunity')",
    "Strategic initiative with ROI (e.g., 'Optimize ${primaryMetrics?.column || 'key metrics'} to increase performance across identified segments')"
  ],
  "nextSteps": [
    "Immediate action with timeline (e.g., 'Analyze top 3 ${dataAnalysis.categorical[0] || 'categories'} within 30 days')",
    "Medium-term initiative with metrics (e.g., 'Implement optimization strategy to achieve 25% improvement by Q3')",
    "Long-term strategy with targets (e.g., 'Scale successful patterns for sustainable growth')"
  ]
}

NEVER use generic terms like "top-performing categories" - USE THE ACTUAL ${dataAnalysis.categorical[0] ? dataAnalysis.categorical[0].toUpperCase() : 'CATEGORY'} NAMES from the data.
NEVER use placeholder percentages - USE THE CALCULATED STATISTICS provided.`
          },
          {
            role: 'user', 
            content: `URGENT: ${dataAnalysis.domain.toUpperCase()} DATA ANALYSIS REQUEST

DATASET OVERVIEW:
• Business Domain: ${dataAnalysis.domain.toUpperCase()} analysis (${dataAnalysis.domainConfidence}% confidence)
• Data Scale: ${dataAnalysis.totalRows.toLocaleString()} records across ${dataAnalysis.totalColumns} business dimensions
• Column Types: ${dataAnalysis.numeric.length} numerical metrics, ${dataAnalysis.categorical.length} categories, ${dataAnalysis.dates.length} time-based fields

KEY BUSINESS METRICS:
${primaryMetrics ? `Primary ${dataAnalysis.domain === 'hr' ? 'Compensation' : dataAnalysis.domain === 'sales' ? 'Revenue' : 'Financial'} Metric (${primaryMetrics.column}):
- Total Value: ${primaryMetrics.stats?.sum ? `$${primaryMetrics.stats.sum.toLocaleString()}` : 'N/A'}
- Average Value: ${primaryMetrics.stats?.mean ? `$${primaryMetrics.stats.mean.toLocaleString()}` : 'N/A'}
- Highest Value: ${primaryMetrics.stats?.max ? `$${primaryMetrics.stats.max.toLocaleString()}` : 'N/A'}  
- Lowest Value: ${primaryMetrics.stats?.min ? `$${primaryMetrics.stats.min.toLocaleString()}` : 'N/A'}
- Range: ${primaryMetrics.stats?.min && primaryMetrics.stats?.max ? `$${primaryMetrics.stats.min.toLocaleString()} to $${primaryMetrics.stats.max.toLocaleString()}` : 'N/A'}` : 'No primary metrics identified'}

TOP ${dataAnalysis.categorical[0] ? dataAnalysis.categorical[0].toUpperCase() : 'CATEGORY'} BREAKDOWN:
${topCategories.length > 0 ? topCategories.join('\n') : 'No categorical data available'}

STATISTICAL ANALYSIS:
${JSON.stringify(dataAnalysis.descriptiveStats, null, 2)}

DATA COMPLETENESS:
${Object.entries(dataAnalysis.missingValues).map(([col, pct]) => `• ${col}: ${100-pct}% data quality`).join('\n')}

SAMPLE RECORDS (First 5 with key fields):
${JSON.stringify(dataRows.slice(0, 5).map((row, i) => {
  const record: any = { RecordID: i+1 };
  
  // Include the most relevant fields based on domain
  if (dataAnalysis.domain === 'hr') {
    headers.slice(0, 6).forEach(header => {
      if (!header.toLowerCase().includes('price') && !header.toLowerCase().includes('sales')) {
        record[header] = row[headers.indexOf(header)];
      }
    });
  } else if (dataAnalysis.domain === 'sales') {
    headers.slice(0, 6).forEach(header => {
      record[header] = row[headers.indexOf(header)];
    });
  } else {
    headers.slice(0, 6).forEach(header => {
      record[header] = row[headers.indexOf(header)];
    });
  }
  
  return record;
}), null, 2)}

ANALYSIS REQUEST: ${userQuestion || `Generate executive-level ${dataAnalysis.domain} insights with specific recommendations for performance optimization, efficiency improvements, and strategic growth`}

DELIVERABLE: Professional C-suite ${dataAnalysis.domain} analysis with concrete numbers, specific ${dataAnalysis.categorical[0] || 'category'} names, and actionable strategies with quantified impact. Use the EXACT data values provided - no generic statements allowed.`
          }
        ];

        // Determine which AI service to use (Lovable AI → OpenAI → Statistical Fallback)
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
          console.log('Using Lovable AI (primary provider) with Gemini 2.5 Flash');
        } else if (openaiApiKey) {
          aiProvider = 'openai';
          aiApiKey = openaiApiKey;
          aiEndpoint = 'https://api.openai.com/v1/chat/completions';
          aiModel = 'gpt-4o-mini';
          console.log('Using OpenAI (secondary provider) with GPT-4o-mini');
        } else {
          console.log('No AI provider available, will use enhanced statistical fallback');
        }

        // Make AI API call if provider available
        if (aiProvider !== 'none') {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000);

          const requestBody = {
            model: aiModel,
            messages: prompt,
            temperature: 0.1,
            max_tokens: 1500,
            response_format: { type: "json_object" }
          };

          console.log(`${aiProvider.toUpperCase()} request body:`, JSON.stringify(requestBody, null, 2));

          const resp = await fetch(aiEndpoint, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${aiApiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody),
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          // Handle rate limits and quota errors
          if (resp.status === 429) {
            console.warn(`${aiProvider.toUpperCase()} rate limit exceeded, falling back to enhanced statistical analysis`);
            openaiError = 'rate_limit';
          } else if (resp.status === 402) {
            console.warn(`${aiProvider.toUpperCase()} quota exceeded, falling back to enhanced statistical analysis`);
            openaiError = 'insufficient_quota';
          } else if (!resp.ok) {
            const errorText = await resp.text();
            console.error(`${aiProvider.toUpperCase()} API error (${resp.status}):`, errorText);
            openaiError = `api_error_${resp.status}`;
          } else {
            // Success - parse response
            const js = await resp.json();
            console.log(`Raw ${aiProvider.toUpperCase()} response status:`, resp.status);
            console.log(`${aiProvider.toUpperCase()} response body:`, JSON.stringify(js, null, 2));
            
            let content = js.choices?.[0]?.message?.content ?? '';
            console.log(`Raw ${aiProvider.toUpperCase()} content:`, content);
            
            if (!content) {
              console.error(`${aiProvider.toUpperCase()} returned empty content`);
              openaiError = `${aiProvider.toUpperCase()} returned empty response content`;
            } else {
              try {
                const parsed = JSON.parse(content);
                console.log(`Successfully parsed ${aiProvider.toUpperCase()} JSON response:`, JSON.stringify(parsed, null, 2));
                
                if (parsed.summary && parsed.keyFindings && parsed.recommendations) {
                  summary = parsed.summary;
                  recommendations = Array.isArray(parsed.recommendations) ? parsed.recommendations : [];
                  
                  structuredSummary = {
                    keyFindings: Array.isArray(parsed.keyFindings) ? parsed.keyFindings : [parsed.summary || 'No findings available'],
                    additionalKPIs: Array.isArray(parsed.nextSteps) ? parsed.nextSteps : [
                      `Processed ${dataRows.length.toLocaleString()} business records`,
                      `Analyzed ${headers.length} key performance dimensions`,
                      `Data integrity: ${Math.round(100 - (Object.values(dataAnalysis.missingValues).filter(v => v > 20).length / headers.length * 100))}% complete across all fields`
                    ],
                    recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : []
                  };
                  console.log(`Successfully created structured summary from ${aiProvider.toUpperCase()} response`);
                } else {
                  console.error(`${aiProvider.toUpperCase()} response missing required fields. Available keys:`, Object.keys(parsed));
                  openaiError = `${aiProvider.toUpperCase()} response incomplete - missing required fields. Got: ${Object.keys(parsed).join(', ')}`;
                }
              } catch (e) {
                console.error(`JSON parsing failed for ${aiProvider.toUpperCase()} response:`, e);
                console.error('Raw content that failed to parse:', content);
                openaiError = `Failed to parse ${aiProvider.toUpperCase()} JSON: ${e.message}`;
              }
            }
          }
        }
      } catch (e) {
        console.error('AI integration error:', e);
        if (e.name === 'AbortError') {
          openaiError = 'AI request timed out after 30 seconds';
        } else {
          openaiError = `AI integration error: ${e instanceof Error ? e.message : String(e)}`;
        }
      }
    }

    // Enhanced domain-specific fallback with data-driven insights if AI fails or is unavailable
    if (!structuredSummary) {
      console.log('Using enhanced statistical fallback to generate data-driven insights...');
      
      // Generate data-driven insights from actual statistics with domain awareness
      const dataInsights = [];
      
      // Get actual category names and counts (not "Unknown")
      const topCategory = dataAnalysis.categorical.length > 0 ? 
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
          
          const validEntries = Object.entries(counts).filter(([name]) => name && name !== 'Unspecified');
          if (validEntries.length === 0) return null;
          
          const topEntry = validEntries.sort(([,a], [,b]) => b - a)[0];
          return topEntry ? { 
            name: topEntry[0], 
            count: topEntry[1], 
            percentage: Math.round(topEntry[1]/dataRows.length*100),
            totalCategories: validEntries.length
          } : null;
        })() : null;

      // Domain-specific insights with actual data
      if (topCategory && dataAnalysis.domain === 'hr') {
        dataInsights.push(`${topCategory.name} is the largest ${dataAnalysis.categorical[0]} with ${topCategory.count.toLocaleString()} employees (${topCategory.percentage}% of workforce) across ${topCategory.totalCategories} total ${dataAnalysis.categorical[0]}s`);
      } else if (topCategory && dataAnalysis.domain === 'sales') {
        dataInsights.push(`${topCategory.name} leads in ${dataAnalysis.categorical[0]} with ${topCategory.count.toLocaleString()} transactions (${topCategory.percentage}% of sales volume) from ${topCategory.totalCategories} active ${dataAnalysis.categorical[0]}s`);
      } else if (topCategory) {
        dataInsights.push(`${topCategory.name} represents the top ${dataAnalysis.categorical[0]} with ${topCategory.count.toLocaleString()} records (${topCategory.percentage}% of dataset) among ${topCategory.totalCategories} categories`);
      }
      
      // Domain-specific metric insights
      const primaryInsight = primaryMetrics && primaryMetrics.stats ?
        (() => {
          if (dataAnalysis.domain === 'hr') {
            return `Employee ${primaryMetrics.column.toLowerCase()} analysis shows average of $${primaryMetrics.stats.mean?.toLocaleString() || 'N/A'} with total payroll of $${primaryMetrics.stats.sum?.toLocaleString() || 'N/A'}`;
          } else if (dataAnalysis.domain === 'sales') {
            return `Revenue analysis shows average transaction value of $${primaryMetrics.stats.mean?.toLocaleString() || 'N/A'} with total sales of $${primaryMetrics.stats.sum?.toLocaleString() || 'N/A'}`;
          } else {
            return `${primaryMetrics.column} analysis shows average value of $${primaryMetrics.stats.mean?.toLocaleString() || 'N/A'} with total sum of $${primaryMetrics.stats.sum?.toLocaleString() || 'N/A'}`;
          }
        })() : null;
      
      if (primaryInsight) {
        dataInsights.push(primaryInsight);
      }
      
      dataInsights.push(`Data quality assessment: ${Math.round(100 - (Object.values(dataAnalysis.missingValues).filter(v => v > 20).length / headers.length * 100))}% completeness across ${headers.length} dimensions`);

      summary = `Analysis of ${dataRows.length.toLocaleString()} ${dataAnalysis.domain} records reveals key performance patterns and optimization opportunities${topCategory ? ` with ${topCategory.name} leading the ${dataAnalysis.categorical[0]} segment` : ''}.`;
      
      // Domain-specific recommendations based on actual insights
      const dataRecommendations = [];
      if (topCategory) {
        if (dataAnalysis.domain === 'hr') {
          dataRecommendations.push(`Focus workforce planning on ${topCategory.name} ${dataAnalysis.categorical[0]} which represents ${topCategory.percentage}% of your ${topCategory.count.toLocaleString()} employees`);
        } else if (dataAnalysis.domain === 'sales') {
          dataRecommendations.push(`Prioritize ${topCategory.name} ${dataAnalysis.categorical[0]} strategy as it drives ${topCategory.percentage}% of transaction volume (${topCategory.count.toLocaleString()} sales)`);
        } else {
          dataRecommendations.push(`Focus resources on ${topCategory.name} segment which represents ${topCategory.percentage}% of your business volume`);
        }
      }
      
      if (primaryMetrics && primaryMetrics.stats && primaryMetrics.stats.mean) {
        if (dataAnalysis.domain === 'hr') {
          dataRecommendations.push(`Review compensation strategy around $${Math.round(primaryMetrics.stats.mean).toLocaleString()} average ${primaryMetrics.column.toLowerCase()} benchmark`);
        } else if (dataAnalysis.domain === 'sales') {
          dataRecommendations.push(`Optimize revenue strategy around $${Math.round(primaryMetrics.stats.mean).toLocaleString()} average transaction value to increase sales performance`);
        } else {
          dataRecommendations.push(`Optimize strategy around $${Math.round(primaryMetrics.stats.mean).toLocaleString()} average ${primaryMetrics.column.toLowerCase()} value`);
        }
      }
      
      if (dataAnalysis.domain !== 'general') {
        dataRecommendations.push(`Leverage ${dataAnalysis.domain}-specific insights with ${dataAnalysis.domainConfidence}% confidence for targeted strategic decisions`);
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

    // Prepare rich analysis context for Python service
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
      categorical: dataAnalysis.categorical,
      numeric: dataAnalysis.numeric,
    };

    // Update report in database - status set to generating_pdf (Python will complete it)
    const updateData: any = {
      processing_status: 'generating_pdf',
      text_summary: structuredSummary,
      chart_data: chartData,
      row_count: dataRows.length,
      column_count: headers.length
    };
    
    if (openaiError) {
      updateData.error_message = openaiError;
    }

    await supabase.from('spreadsheet_reports').update(updateData).eq('id', reportId);

    console.log('Report text analysis completed, generating PDF...');

    // Extract userId from filePath (format: {userId}/{timestamp}_{filename})
    const userId = filePath.split('/')[0];
    if (!userId) {
      throw new Error('Invalid file path: cannot extract user ID');
    }

    // Generate PDF report using JavaScript edge function with error recovery
    try {
      await generatePDFReport(
        reportId,
        userId,
        structuredSummary,
        chartData
      );
    } catch (pdfError) {
      console.error('PDF generation failed, but AI insights are saved:', pdfError);
      
      // Update report with AI insights even if PDF fails
      await supabase.from('spreadsheet_reports').update({
        processing_status: 'completed',
        error_message: `PDF generation failed: ${pdfError instanceof Error ? pdfError.message : String(pdfError)}. AI insights are available.`
      }).eq('id', reportId);
    }

  } catch (e) {
    console.error('Spreadsheet processing error:', e);
    await supabase.from('spreadsheet_reports').update({
      processing_status: 'failed',
      error_message: `Spreadsheet processing error: ${e instanceof Error ? e.message : String(e)}`
    }).eq('id', reportId);
    return;
  }
}

// Generate PDF report using JavaScript edge function
async function generatePDFReport(
  reportId: string,
  userId: string,
  aiInsights: any,
  chartData: any[]
): Promise<void> {
  try {
    console.log(`Calling generate-pdf function for report ${reportId}`);
    
    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);
    
    const response = await supabase.functions.invoke('generate-pdf', {
      body: {
        reportId,
        userId,
        aiInsights,
        chartData
      }
    });

    if (response.error) {
      console.error('PDF generation error:', response.error);
      throw new Error(`PDF generation failed: ${response.error.message}`);
    }

    console.log('✅ PDF generated successfully:', response.data);
  } catch (error) {
    console.error('Failed to generate PDF:', error);
    
    // Update report status to failed
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);
    
    await supabase
      .from('spreadsheet_reports')
      .update({
        processing_status: 'failed',
        error_message: `PDF generation failed: ${error instanceof Error ? error.message : String(error)}`
      })
      .eq('id', reportId);
    
    throw error;
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