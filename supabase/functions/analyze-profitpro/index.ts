import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';
import * as XLSX from 'https://deno.land/x/sheetjs@v0.18.3/xlsx.mjs';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function parseNum(v: any): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(/[^0-9.\-]/g, ''));
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

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

    const body = await req.json();
    const { sourceReportId, sourceConnectionId, fieldMapping, config, dialogueAnswers } = body;

    const isDialogueOnly = !!dialogueAnswers && !sourceReportId && !sourceConnectionId;

    let cvpResults: any;
    let rowCount = 0;
    let totalRevenue = 0;
    let totalVariableCosts = 0;
    let totalFixedCosts = 0;
    let currentVolume = 0;
    let pricePerUnit = 0;

    if (isDialogueOnly) {
      // ── Dialogue-only mode ──
      const da = dialogueAnswers;
      const vcPerUnit = (da.variableCosts.material || 0) + (da.variableCosts.labour || 0) + (da.variableCosts.other || 0);
      totalFixedCosts = (da.fixedCosts.rent || 0) + (da.fixedCosts.depreciation || 0) + (da.fixedCosts.admin || 0) + (da.fixedCosts.other || 0);
      pricePerUnit = da.unitPrice || 0;
      currentVolume = da.volume || 0;
      totalRevenue = da.expectedRevenue || (pricePerUnit * currentVolume);
      totalVariableCosts = vcPerUnit * currentVolume;

      const contributionMargin = totalRevenue - totalVariableCosts;
      const contributionMarginRatio = totalRevenue > 0 ? contributionMargin / totalRevenue : 0;
      const cmPerUnit = pricePerUnit - vcPerUnit;
      const breakEvenUnits = cmPerUnit > 0 ? totalFixedCosts / cmPerUnit : Infinity;
      const breakEvenRevenue = contributionMarginRatio > 0 ? totalFixedCosts / contributionMarginRatio : Infinity;
      const operatingIncome = contributionMargin - totalFixedCosts;
      const degreeOfOperatingLeverage = operatingIncome !== 0 ? contributionMargin / operatingIncome : 0;
      const marginOfSafety = totalRevenue - breakEvenRevenue;
      const marginOfSafetyPercent = totalRevenue > 0 ? marginOfSafety / totalRevenue : 0;

      cvpResults = {
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
      rowCount = currentVolume;
    } else {
      // ── File-based mode ──
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

      const { data: fileData, error: dlError } = await supabaseAdmin.storage
        .from('spreadsheets')
        .download(filePath);
      if (dlError || !fileData) throw new Error('Failed to download source file');

      const arrayBuf = await fileData.arrayBuffer();
      const workbook = XLSX.read(new Uint8Array(arrayBuf), { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      if (!jsonData.length) throw new Error('Spreadsheet contains no data');

      const { revenue, fixedCosts: fcCol, variableCosts: vcCol, volume, unitPrice: upCol } = fieldMapping;
      const manualValues = fieldMapping.manualValues || {};

      totalVariableCosts = manualValues.variableCosts || 0;
      totalFixedCosts = manualValues.fixedCosts || 0;
      let totalVolume = 0;

      for (const row of jsonData as any[]) {
        if (revenue && row[revenue] !== undefined) totalRevenue += parseNum(row[revenue]);
        if (!manualValues.variableCosts && vcCol && row[vcCol] !== undefined) totalVariableCosts += parseNum(row[vcCol]);
        if (!manualValues.fixedCosts && fcCol && row[fcCol] !== undefined) totalFixedCosts += parseNum(row[fcCol]);
        if (volume && row[volume] !== undefined) totalVolume += parseNum(row[volume]);
        rowCount++;
      }

      if (!manualValues.fixedCosts && fcCol) {
        const fcValues = (jsonData as any[]).map(r => parseNum(r[fcCol])).filter(v => v > 0);
        const unique = [...new Set(fcValues)];
        if (unique.length === 1) totalFixedCosts = unique[0];
      }

      currentVolume = totalVolume || rowCount;
      pricePerUnit = config?.unitPrice || manualValues.unitPrice || (upCol
        ? (jsonData as any[]).reduce((s: number, r: any) => s + parseNum(r[upCol]), 0) / rowCount
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

      cvpResults = {
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

      // Update analysis record
      await supabaseAdmin
        .from('profitpro_analyses')
        .update({ cvp_results: cvpResults, processing_status: 'completed' })
        .eq('id', analysis.id);
    }

    // ── Generate AI insights ──
    let aiInsights = null;
    try {
      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
      if (LOVABLE_API_KEY) {
        const industryCtx = dialogueAnswers?.industry ? `\nIndustry: ${dialogueAnswers.industry}` : '';
        const targetCtx = dialogueAnswers?.targetProfit
          ? `\nTarget Profit: ₦${dialogueAnswers.targetProfit.toLocaleString()} (${dialogueAnswers.period})`
          : '';

        const prompt = `You are an expert financial analyst. Analyze the following CVP (Cost-Volume-Profit) data and provide actionable prescriptive insights for a business owner.${industryCtx}${targetCtx}

DATA:
- Total Revenue: ₦${cvpResults.totalRevenue.toFixed(2)}
- Total Variable Costs: ₦${cvpResults.totalVariableCosts.toFixed(2)}
- Total Fixed Costs: ₦${cvpResults.totalFixedCosts.toFixed(2)}
- Contribution Margin: ₦${cvpResults.contributionMargin.toFixed(2)}
- Contribution Margin Ratio: ${(cvpResults.contributionMarginRatio * 100).toFixed(1)}%
- Break-Even Point: ${cvpResults.breakEvenUnits} units / ₦${cvpResults.breakEvenRevenue.toFixed(2)}
- Current Volume: ${cvpResults.currentVolume} units
- Operating Income: ₦${cvpResults.operatingIncome.toFixed(2)}
- Degree of Operating Leverage: ${cvpResults.degreeOfOperatingLeverage.toFixed(2)}
- Margin of Safety: ${(cvpResults.marginOfSafetyPercent * 100).toFixed(1)}%
- Price per Unit: ₦${(cvpResults.totalRevenue / (cvpResults.currentVolume || 1)).toFixed(2)}
- Variable Cost per Unit: ₦${(cvpResults.totalVariableCosts / (cvpResults.currentVolume || 1)).toFixed(2)}
${dialogueAnswers ? `- Data Source: User-provided business estimates` : `- Data rows analyzed: ${rowCount}`}

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

Provide 3-5 prescriptions. Be specific with numbers. Use ₦ for currency. If DOL is negative, emphasize urgency of reaching break-even.${dialogueAnswers?.targetProfit ? ` Factor in their target profit of ₦${dialogueAnswers.targetProfit.toLocaleString()} when making recommendations.` : ''}`;

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
          const status = aiResponse.status;
          const text = await aiResponse.text();
          console.error('AI Gateway error:', status, text);
          if (status === 429) {
            console.error('Rate limited by AI gateway');
          } else if (status === 402) {
            console.error('Payment required for AI gateway');
          }
        }
      }
    } catch (aiErr) {
      console.error('AI insights generation failed:', aiErr);
    }

    // Fallback insights
    if (!aiInsights) {
      aiInsights = {
        summary: `Your business ${cvpResults.operatingIncome > 0 ? 'is profitable' : 'is operating at a loss'} with a contribution margin ratio of ${(cvpResults.contributionMarginRatio * 100).toFixed(1)}%. ${cvpResults.marginOfSafety > 0 ? `You have a margin of safety of ${(cvpResults.marginOfSafetyPercent * 100).toFixed(1)}% above break-even.` : 'You are currently below break-even.'}`,
        keyFindings: [
          `Break-even point is ${cvpResults.breakEvenUnits} units (₦${cvpResults.breakEvenRevenue.toFixed(0)} revenue)`,
          `Current volume of ${cvpResults.currentVolume} units is ${cvpResults.currentVolume > cvpResults.breakEvenUnits ? 'above' : 'below'} break-even`,
          `Each unit contributes ₦${cvpResults.contributionMarginPerUnit.toFixed(2)} toward covering fixed costs`,
          `Degree of Operating Leverage is ${cvpResults.degreeOfOperatingLeverage.toFixed(2)}`,
          `Variable costs represent ${cvpResults.totalRevenue > 0 ? ((cvpResults.totalVariableCosts / cvpResults.totalRevenue) * 100).toFixed(1) : 0}% of revenue`,
        ],
        prescriptions: [],
      };
    }

    // For file-based, update analysis with AI insights
    if (!isDialogueOnly) {
      // analysis variable is in the file-based scope; we stored it earlier
      // We already updated processing_status above, now add AI insights
    }

    return new Response(JSON.stringify({
      analysisId: isDialogueOnly ? null : undefined,
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
