import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization) {
      return new Response(JSON.stringify({ error: "No authorization" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authorization } } },
    );
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { industry, productName, period } = await req.json();
    if (!industry || !productName) {
      return new Response(JSON.stringify({ error: "industry and productName are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const periodWord = period || "monthly";

    const prompt = `You are a small-business pricing analyst familiar with the Nigerian market. A small business owner in the "${industry}" industry wants to sell: "${productName}".

Provide realistic typical benchmarks in Nigerian Naira (₦) for ONE unit, and per-${periodWord} fixed-cost hints for a small/medium operation. Use current typical market ranges. If the product is a service, treat one "unit" as one service delivered.

Be practical and conservative — these are starting estimates the owner will adjust. Never return zero unless truly free.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "user", content: prompt }],
        tools: [{
          type: "function",
          function: {
            name: "suggest_costs",
            description: "Provide cost & price benchmarks",
            parameters: {
              type: "object",
              properties: {
                suggestedUnitPrice: { type: "number", description: "Typical selling price per unit in Naira" },
                marketPriceRange: {
                  type: "object",
                  properties: {
                    low: { type: "number" },
                    high: { type: "number" },
                  },
                  required: ["low", "high"],
                },
                variableCosts: {
                  type: "object",
                  description: "Cost to produce ONE unit",
                  properties: {
                    material: { type: "number" },
                    labour: { type: "number" },
                    other: { type: "number" },
                  },
                  required: ["material", "labour", "other"],
                },
                fixedCostsHints: {
                  type: "object",
                  description: `Typical ${periodWord} fixed costs for a small operation`,
                  properties: {
                    rent: { type: "number" },
                    admin: { type: "number" },
                  },
                  required: ["rent", "admin"],
                },
                rationale: { type: "string", description: "Short, friendly note explaining the benchmarks" },
              },
              required: ["suggestedUnitPrice", "marketPriceRange", "variableCosts", "fixedCostsHints", "rationale"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "suggest_costs" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      const text = await aiResponse.text();
      console.error("AI Gateway error:", status, text);
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      return new Response(JSON.stringify({ error: "AI returned no suggestion" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const suggestion = typeof toolCall.function.arguments === "string"
      ? JSON.parse(toolCall.function.arguments)
      : toolCall.function.arguments;

    return new Response(JSON.stringify({ suggestion }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("suggest-product-costs error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});