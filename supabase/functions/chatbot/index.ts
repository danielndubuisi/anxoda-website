import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Received chatbot request with", messages?.length || 0, "messages");

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
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    // Stream the response back to client
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Chatbot error:", error);
    return new Response(JSON.stringify({ 
      error: "internal_error",
      message: error instanceof Error ? error.message : "An error occurred" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
