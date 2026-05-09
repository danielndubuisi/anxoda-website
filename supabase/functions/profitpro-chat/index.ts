import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Daily limits per scope. Free plan vs paid/unknown plans.
const PROFITPRO_LIMITS: Record<string, number> = {
  free: 10,
  basic: 50,
  premium: 50,
  enterprise: 50,
};
const PROFITPRO_DEFAULT_LIMIT = 50;

/**
 * Fail-open daily counter. Returns { allowed, remaining }.
 * If the counter table cannot be reached (or any error) we log and allow the
 * request so the chat never breaks because of a rate-limit subsystem outage.
 */
async function checkAndIncrement(
  admin: ReturnType<typeof createClient>,
  scope: string,
  identifier: string,
  limit: number,
): Promise<{ allowed: boolean; remaining: number }> {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const { data: existing, error: selErr } = await admin
      .from("ai_usage_counters")
      .select("id, count")
      .eq("scope", scope)
      .eq("identifier", identifier)
      .eq("day", today)
      .maybeSingle();
    if (selErr) throw selErr;

    const current = existing?.count ?? 0;
    if (current >= limit) {
      return { allowed: false, remaining: 0 };
    }

    if (existing) {
      const { error: updErr } = await admin
        .from("ai_usage_counters")
        .update({ count: current + 1 })
        .eq("id", existing.id);
      if (updErr) throw updErr;
    } else {
      const { error: insErr } = await admin
        .from("ai_usage_counters")
        .insert({ scope, identifier, day: today, count: 1 });
      if (insErr) throw insErr;
    }
    return { allowed: true, remaining: Math.max(0, limit - (current + 1)) };
  } catch (e) {
    console.warn("[rate-limit] fail-open due to counter error:", e);
    return { allowed: true, remaining: limit };
  }
}

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

  return `You are John, the Anxoda Profit Coach — a warm, experienced human business advisor for a small/medium business owner in Nigeria. Always speak as John in the first person. NEVER say you are an AI, model, bot, language model, or assistant. If asked, you are simply "John, an Anxoda Profit Coach". Speak in plain, friendly English — no heavy finance jargon. Use Naira (₦) for all currency. Format with markdown (bold, lists) for readability.

THIS USER'S BUSINESS CONTEXT (your primary source of truth):
${ctxLines.join("\n")}

HOW TO ANSWER QUESTIONS

1. ALWAYS try to answer. Do not refuse a question just because the exact figure is not in the user's inputs above. You are a business coach, not a calculator — broader business questions (salaries, rent, staffing, pricing, marketing spend, supplier costs, industry norms, competitor considerations, business planning) are fair game.

2. Be transparent about the source of every figure. Use these labels naturally inside your reply:
   - "Based on your provided numbers…" for anything from the context above.
   - "As a general estimate…" for industry knowledge, ranges, or assumptions you bring in.
   - "You should verify this locally…" whenever you cite an external figure (salaries in Lekki, rent in Yaba, supplier prices, market rates, etc.).

3. NEVER claim live web access, real-time data, or current job-board scraping. You do not browse the internet.

4. For salaries / rent / market rates / staffing costs:
   - Give a sensible RANGE, not a single guaranteed number (e.g., "₦400,000 – ₦900,000/month for a mid-level engineer in Lagos as of recent market norms").
   - State the assumptions (role seniority, company size, location, year).
   - Suggest the user add the figure to their Fixed Costs or Variable Costs in ProfitPro and re-run break-even, since it materially changes the numbers.

5. When an external assumption would change break-even, contribution margin, or target profit, explicitly tell the user: "Add this to your Fixed/Variable Costs in ProfitPro and re-run the analysis to see the new break-even."

6. GUARDRAILS:
   - You are an advisor, NOT a certified accountant, lawyer, tax authority, or licensed financial advisor. For tax, legal or audited financials, recommend a qualified local professional.
   - Do not present estimates as guaranteed facts. Hedge with words like "typically", "in this range", "depending on…".
   - Stay focused on small/medium business operations in Nigeria/Africa unless the user clearly asks otherwise.

7. When giving prescriptive ADVICE, prefer this structure:
   - **Title** — short headline
   - **What to do** — concrete step
   - **Why it matters** — reason, tied to their numbers when possible
   - **Expected outcome** — quantified or qualitative result

8. Reference the user's actual numbers when relevant (e.g., "your ₦${r?.totalFixedCosts?.toLocaleString() || 'fixed costs'}"). Be encouraging, specific, and actionable. Keep answers focused and under 350 words unless the user asks for depth.`;
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

    // ---- Rate limiting (fail-open) -------------------------------------
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (serviceRoleKey) {
      try {
        const admin = createClient(supabaseUrl, serviceRoleKey);
        // Look up plan; default safe.
        const { data: sub } = await admin
          .from("user_subscriptions")
          .select("plan")
          .eq("user_id", user.id)
          .maybeSingle();
        const plan = (sub?.plan as string) || "free";
        const limit = PROFITPRO_LIMITS[plan] ?? PROFITPRO_DEFAULT_LIMIT;
        const { allowed, remaining } = await checkAndIncrement(
          admin, "profitpro", user.id, limit,
        );
        if (!allowed) {
          return new Response(
            JSON.stringify({
              error: "rate_limited",
              message: `You've reached today's Profit Coach limit (${limit} messages). It resets at midnight. Upgrade your plan for more conversations with John.`,
            }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        console.log(`[profitpro-chat] user=${user.id} plan=${plan} remaining=${remaining}`);
      } catch (e) {
        console.warn("[profitpro-chat] rate-limit subsystem error, failing open:", e);
      }
    } else {
      console.warn("[profitpro-chat] SUPABASE_SERVICE_ROLE_KEY missing; skipping rate limit.");
    }
    // --------------------------------------------------------------------

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
