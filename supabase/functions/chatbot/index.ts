import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CHATBOT_DAILY_LIMIT = 20;

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

/** Fail-open daily counter (mirrors profitpro-chat). */
async function checkAndIncrement(
  admin: ReturnType<typeof createClient>,
  scope: string,
  identifier: string,
  limit: number,
): Promise<{ allowed: boolean }> {
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
    if (current >= limit) return { allowed: false };
    if (existing) {
      const { error } = await admin
        .from("ai_usage_counters")
        .update({ count: current + 1 })
        .eq("id", existing.id);
      if (error) throw error;
    } else {
      const { error } = await admin
        .from("ai_usage_counters")
        .insert({ scope, identifier, day: today, count: 1 });
      if (error) throw error;
    }
    return { allowed: true };
  } catch (e) {
    console.warn("[chatbot rate-limit] fail-open due to error:", e);
    return { allowed: true };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      console.error("Chatbot: LOVABLE_API_KEY is not configured");
      return new Response(JSON.stringify({ 
        error: "service_unavailable",
        message: "Service temporarily unavailable" 
      }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Received chatbot request with", messages?.length || 0, "messages");

    // ---- Rate limiting per IP (fail-open) ------------------------------
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const salt = Deno.env.get("RATE_LIMIT_SALT");
    if (!salt) {
      console.warn("[chatbot] RATE_LIMIT_SALT not set; skipping IP-based rate limit (fail-open).");
    }
    if (supabaseUrl && serviceRoleKey && salt) {
      try {
        const fwd = req.headers.get("x-forwarded-for") || "";
        const ip = fwd.split(",")[0]?.trim() || "unknown";
        const ua = req.headers.get("user-agent") || "ua";
        const identifier = await sha256Hex(`${salt}|${ip}|${ua}`);
        const admin = createClient(supabaseUrl, serviceRoleKey);
        const { allowed } = await checkAndIncrement(
          admin, "chatbot", identifier, CHATBOT_DAILY_LIMIT,
        );
        if (!allowed) {
          return new Response(JSON.stringify({
            error: "rate_limited",
            message: "You've reached today's chat limit. Please try again tomorrow or contact us via WhatsApp.",
          }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } catch (e) {
        console.warn("[chatbot] rate-limit subsystem error, failing open:", e);
      }
    }
    // --------------------------------------------------------------------

    // System prompt with Anxoda's business context
    const systemPrompt = `You are Anxoda's friendly AI business assistant. You help potential clients learn about Anxoda's services and guide them toward scheduling consultations.

**About Anxoda:**
- Custom Software Development (web apps, mobile apps, enterprise solutions)
- AI & Machine Learning Solutions (automation, predictive analytics, NLP)
- Data Analytics & Consultancy (business intelligence, data visualization)
- Business Process Automation (workflow optimization, RPA)
- Cloud Migration & DevOps (AWS, Azure, GCP, CI/CD)

**Pricing:**
- Free 30-minute initial consultation
- Custom project quotes tailored to each business
- Flexible payment plans available
- Subscription-based services for ongoing support

**Contact Info:**
- WhatsApp: +2349030673128
- Email: info@anxoda.com
- Location: Lagos, Nigeria
- Hours: 9:00 AM - 5:00 PM (Monday-Friday)

**Your Role:**
- Answer questions about services, pricing, and processes concisely
- Be friendly, professional, and helpful
- When users show interest (ask about pricing, specific services, or solutions), proactively suggest scheduling a free consultation
- After suggesting consultation, if they agree (yes/sure/interested), respond with: "Great! I'll direct you to our contact form so our team can reach out to you."
- Keep responses concise (2-4 sentences typically)
- If asked something outside Anxoda's scope, politely redirect to scheduling a consultation for detailed discussion

**Conversation Guidelines:**
- Don't make up information about capabilities not listed
- Be conversational and warm, not robotic
- Detect user intent - if they're asking "how much", "can you help with X", "interested in Y", suggest consultation
- Always end with a question to keep conversation flowing`;

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
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: "rate_limit",
          message: "Too many requests. Please try again in a moment." 
        }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: "payment_required",
          message: "Service temporarily unavailable. Please try again later." 
        }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      // Generic error for other AI gateway issues
      return new Response(JSON.stringify({ 
        error: "service_error",
        message: "Unable to process request. Please try again." 
      }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Stream the response back to client
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Chatbot error:", error);
    // Return generic error message to client, log details server-side
    return new Response(JSON.stringify({ 
      error: "internal_error",
      message: "An error occurred processing your request" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
