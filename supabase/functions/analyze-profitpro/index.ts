import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';
import * as XLSX from 'https://deno.land/x/sheetjs@v0.18.3/xlsx.mjs';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authorization = req.headers.get('Authorization');
    if (!authorization) throw new Error('No authorization header');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authorization } }
    });
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('Authentication failed');

    const { sourceReportId, sourceConnectionId, fieldMapping, config } = await req.json();
    if (!fieldMapping) throw new Error('Field mapping is required');

    // Create analysis record
    const { data: analysis, error: insertError } = await supabase
      .from('profitpro_analyses')
      .insert({
        user_id: user.id,
        title: config?.title || 'ProfitPro Analysis',
        source_report_id: sourceReportId || null,
        source_connection_id: sourceConnectionId || null,
        field_mapping: fieldMapping,
        config: config || {},
        processing_status: 'processing',
      })
      .select()
      .single();

    if (insertError) throw new Error(`Failed to create analysis: ${insertError.message}`);

    // Get file path from source report
    let filePath = '';
    if (sourceReportId) {
      const { data: report } = await supabaseAdmin
        .from('spreadsheet_reports')
        .select('file_path')
        .eq('id', sourceReportId)
        .single();
      if (report) filePath = report.file_path;
    }

    if (!filePath) throw new Error('Could not find source data file');

    // Download file
    const { data: fileData, error: dlError } = await supabaseAdmin.storage
      .from('spreadsheets')
      .download(filePath);
    if (dlError || !fileData) throw new Error('Failed to download source file');

    // Parse spreadsheet
    const arrayBuf = await fileData.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(arrayBuf), { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (!jsonData.length) throw new Error('Spreadsheet contains no data');

    // Extract financial columns using field mapping
    const { revenue, fixedCosts, variableCosts, volume, unitPrice } = fieldMapping;
    const manualValues = fieldMapping.manualValues || {};

    let totalRevenue = 0;
    let totalVariableCosts = manualValues.variableCosts || 0;
    let totalFixedCosts = manualValues.fixedCosts || 0;
    let totalVolume = 0;
    let rowCount = 0;

    for (const row of jsonData as any[]) {
      if (revenue && row[revenue] !== undefined) totalRevenue += parseNum(row[revenue]);
      if (!manualValues.variableCosts && variableCosts && row[variableCosts] !== undefined) totalVariableCosts += parseNum(row[variableCosts]);
      if (!manualValues.fixedCosts && fixedCosts && row[fixedCosts] !== undefined) totalFixedCosts += parseNum(row[fixedCosts]);
      if (volume && row[volume] !== undefined) totalVolume += parseNum(row[volume]);
      rowCount++;
    }

    // If fixed costs column has per-row values, it might be repeated — take average or first row
    // Heuristic: if all fixedCosts values are the same, use one; otherwise sum
    if (!manualValues.fixedCosts && fixedCosts) {
      const fcValues = (jsonData as any[]).map(r => parseNum(r[fixedCosts])).filter(v => v > 0);
      const unique = [...new Set(fcValues)];
      if (unique.length === 1) {
        totalFixedCosts = unique[0];
      }
    }

    // Calculate CVP metrics
    const currentVolume = totalVolume || rowCount;
    const pricePerUnit = config?.unitPrice || manualValues.unitPrice || (unitPrice
      ? (jsonData as any[]).reduce((s: number, r: any) => s + parseNum(r[unitPrice]), 0) / rowCount
      : totalRevenue / currentVolume);

    const contributionMargin = totalRevenue - totalVariableCosts;
    const contributionMarginRatio = totalRevenue > 0 ? contributionMargin / totalRevenue : 0;
    const vcPerUnit = totalVariableCosts / (currentVolume || 1);
    const cmPerUnit = pricePerUnit - vcPerUnit;
    const breakEvenUnits = cmPerUnit > 0 ? totalFixedCosts / cmPerUnit : Infinity;
    const breakEvenRevenue = contributionMarginRatio > 0 ? totalFixedCosts / contributionMarginRatio : Infinity;
    const operatingIncome = contributionMargin - totalFixedCosts;
    const degreeOfOperatingLeverage = operatingIncome !== 0 ? contributionMargin / operatingIncome : 0;
    const marginOfSafety = totalRevenue - breakEvenRevenue;
    const marginOfSafetyPercent = totalRevenue > 0 ? marginOfSafety / totalRevenue : 0;

    const cvpResults = {
      totalRevenue,
      totalVariableCosts,
      totalFixedCosts,
      contributionMargin,
      contributionMarginRatio,
      contributionMarginPerUnit: cmPerUnit,
      breakEvenUnits: isFinite(breakEvenUnits) ? Math.ceil(breakEvenUnits) : 0,
      breakEvenRevenue: isFinite(breakEvenRevenue) ? breakEvenRevenue : 0,
      currentVolume,
      operatingIncome,
      degreeOfOperatingLeverage,
      marginOfSafety,
      marginOfSafetyPercent,
    };

    // Generate AI insights
    let aiInsights = null;
    try {
      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
      if (LOVABLE_API_KEY) {
        const prompt = `You are an expert financial analyst. Analyze the following CVP (Cost-Volume-Profit) data and provide actionable prescriptive insights for a business owner.

DATA:
- Total Revenue: $${totalRevenue.toFixed(2)}
- Total Variable Costs: $${totalVariableCosts.toFixed(2)}
- Total Fixed Costs: $${totalFixedCosts.toFixed(2)}
- Contribution Margin: $${contributionMargin.toFixed(2)}
- Contribution Margin Ratio: ${(contributionMarginRatio * 100).toFixed(1)}%
- Break-Even Point: ${Math.ceil(breakEvenUnits)} units / $${breakEvenRevenue.toFixed(2)}
- Current Volume: ${currentVolume} units
- Operating Income: $${operatingIncome.toFixed(2)}
- Degree of Operating Leverage: ${degreeOfOperatingLeverage.toFixed(2)}
- Margin of Safety: ${(marginOfSafetyPercent * 100).toFixed(1)}%
- Price per Unit: $${pricePerUnit.toFixed(2)}
- Variable Cost per Unit: $${vcPerUnit.toFixed(2)}
- Data rows analyzed: ${rowCount}

Respond ONLY with a JSON object (no markdown) with this structure:
{
  "summary": "2-3 sentence executive summary of the profitability position",
  "keyFindings": ["finding1", "finding2", "finding3", "finding4", "finding5"],
  "prescriptions": [
    {
      "title": "short title",
      "action": "specific actionable step",
      "reason": "data-backed reason",
      "expectedOutcome": "quantified expected result",
      "priority": "high|medium|low",
      "effort": "low|medium|high"
    }
  ]
}

Provide 3-5 prescriptions. Be specific with numbers. If DOL is negative, emphasize urgency of reaching break-even.`;

        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-3-flash-preview',
            messages: [{ role: 'user', content: prompt }],
            tools: [{
              type: 'function',
              function: {
                name: 'provide_cvp_insights',
                description: 'Provide CVP analysis insights',
                parameters: {
                  type: 'object',
                  properties: {
                    summary: { type: 'string' },
                    keyFindings: { type: 'array', items: { type: 'string' } },
                    prescriptions: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          title: { type: 'string' },
                          action: { type: 'string' },
                          reason: { type: 'string' },
                          expectedOutcome: { type: 'string' },
                          priority: { type: 'string', enum: ['high', 'medium', 'low'] },
                          effort: { type: 'string', enum: ['low', 'medium', 'high'] },
                        },
                        required: ['title', 'action', 'reason', 'expectedOutcome', 'priority', 'effort'],
                      },
                    },
                  },
                  required: ['summary', 'keyFindings', 'prescriptions'],
                },
              },
            }],
            tool_choice: { type: 'function', function: { name: 'provide_cvp_insights' } },
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
          if (toolCall?.function?.arguments) {
            aiInsights = typeof toolCall.function.arguments === 'string'
              ? JSON.parse(toolCall.function.arguments)
              : toolCall.function.arguments;
          }
        } else {
          console.error('AI Gateway error:', aiResponse.status, await aiResponse.text());
        }
      }
    } catch (aiErr) {
      console.error('AI insights generation failed:', aiErr);
    }

    // Fallback insights if AI failed
    if (!aiInsights) {
      aiInsights = {
        summary: `Your business ${operatingIncome > 0 ? 'is profitable' : 'is operating at a loss'} with a contribution margin ratio of ${(contributionMarginRatio * 100).toFixed(1)}%. ${marginOfSafety > 0 ? `You have a margin of safety of ${(marginOfSafetyPercent * 100).toFixed(1)}% above break-even.` : 'You are currently below break-even.'}`,
        keyFindings: [
          `Break-even point is ${Math.ceil(breakEvenUnits)} units ($${breakEvenRevenue.toFixed(0)} revenue)`,
          `Current volume of ${currentVolume} units is ${currentVolume > breakEvenUnits ? 'above' : 'below'} break-even`,
          `Each unit contributes $${cmPerUnit.toFixed(2)} toward covering fixed costs`,
          `Degree of Operating Leverage is ${degreeOfOperatingLeverage.toFixed(2)}`,
          `Variable costs represent ${totalRevenue > 0 ? ((totalVariableCosts / totalRevenue) * 100).toFixed(1) : 0}% of revenue`,
        ],
        prescriptions: [],
      };
    }

    // Update analysis record
    await supabaseAdmin
      .from('profitpro_analyses')
      .update({
        cvp_results: cvpResults,
        ai_insights: aiInsights,
        processing_status: 'completed',
      })
      .eq('id', analysis.id);

    return new Response(JSON.stringify({
      analysisId: analysis.id,
      cvpResults,
      aiInsights,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('ProfitPro analysis error:', error);

    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
