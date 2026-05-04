import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function buildSystemPrompt(context: any): string {
  const da = context?.dialogueAnswers;
  const r = context?.cvpResults;
  const ai = context?.aiInsights;

  const ctxLines: string[] = [];
  if (da) {
    ctxLines.push(`Industry: ${da.industry || "N/A"}`);
    ctxLines.push(`Period: ${da.period || "monthly"}`);
    ctxLines.push(`Target Profit: ₦${(da.targetProfit || 0).toLocaleString()}`);
    ctxLines.push(`Selling Price/Unit: ₦${(da.unitPrice || 0).toLocaleString()}`);
    ctxLines.push(`Sales Volume: ${(da.volume || 0).toLocaleString()} units`);
    if (da.variableCosts) {
      const vc = da.variableCosts;
      ctxLines.push(`Variable Costs/unit — Material: ₦${vc.material||0}, Labour: ₦${vc.labour||0}, Other: ₦${vc.other||0}`);
    }
    if (da.fixedCosts) {
      const fc = da.fixedCosts;
      ctxLines.push(`Fixed Costs (per ${da.period||"month"}) — Rent: ₦${fc.rent||0}, Depreciation: ₦${fc.depreciation||0}, Admin: ₦${fc.admin||0}, Other: ₦${fc.other||0}`);
    }
  }
  if (r) {
    ctxLines.push(`\nCALCULATED METRICS:`);
    ctxLines.push(`- Total Revenue: ₦${(r.totalRevenue||0).toLocaleString()}`);
    ctxLines.push(`- Total Variable Costs: ₦${(r.totalVariableCosts||0).toLocaleString()}`);
    ctxLines.push(`- Total Fixed Costs: ₦${(r.totalFixedCosts||0).toLocaleString()}`);
    ctxLines.push(`- Operating Income (Profit): ₦${(r.operatingIncome||0).toLocaleString()}`);
    ctxLines.push(`- Contribution Margin: ${((r.contributionMarginRatio||0)*100).toFixed(1)}%`);
    ctxLines.push(`- Break-Even: ${r.breakEvenUnits||0} units / ₦${(r.breakEvenRevenue||0).toLocaleString()}`);
    ctxLines.push(`- Margin of Safety: ${((r.marginOfSafetyPercent||0)*100).toFixed(1)}%`);
  }
  if (ai?.summary) ctxLines.push(`\nAI Summary: ${ai.summary}`);

  return `You are John, the Anxoda Profit Coach — a warm, experienced human business advisor for a small/medium business owner in Nigeria. Always speak as John in the first person. NEVER say you are an AI, model, bot, language model, or assistant. If asked, you are simply "John, an Anxoda Profit Coach". Speak in plain, friendly English — no finance jargon unless asked. Use Naira (₦) for all currency. Format with markdown (bold, lists) for readability.

You have full context of THIS specific user's business:
${ctxLines.join("\n")}

When giving advice, follow this format:
- **Title** — short headline
- **What to do** — concrete step
- **Why it matters** — data-backed reason using their numbers
- **Expected outcome** — quantified result

Always reference the user's actual numbers (e.g., "your ₦${r?.totalFixedCosts?.toLocaleString() || 'fixed costs'}"). Be encouraging, specific, and actionable. Keep answers focused and under 250 words unless the user asks for depth.`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization) {
      return new Response(JSON.stringify({ error: "No authorization" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authorization } },
    });
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages, context } = await req.json();
    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "Invalid messages" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = buildSystemPrompt(context);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("profitpro-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
