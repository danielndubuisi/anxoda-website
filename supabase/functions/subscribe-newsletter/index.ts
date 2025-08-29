import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NewsletterRequest {
  email: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Newsletter subscription function started");
    
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const resend = new Resend(resendApiKey);

    const { email, user_role }: NewsletterRequest & { user_role?: string } = await req.json();

    console.log("Processing newsletter subscription:", { email });

    // Create Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Only allow admin to fetch the newsletter list
    if (req.method === "GET") {
      if (user_role !== "admin") {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 403, headers: corsHeaders });
      }
      const { data: list, error: listError } = await supabaseClient
        .from("newsletter_subscriptions")
        .select("email")
        .eq("subscribed", true);
      if (listError) {
        return new Response(JSON.stringify({ error: listError.message }), { status: 500, headers: corsHeaders });
      }
      return new Response(JSON.stringify({ emails: list }), { status: 200, headers: corsHeaders });
    }

    // Check if email already exists
    const { data: existingSubscription } = await supabaseClient
      .from("newsletter_subscriptions")
      .select("*")
      .eq("email", email)
      .single();

    if (existingSubscription) {
      // Update existing subscription to reactivate if needed
      const { error: updateError } = await supabaseClient
        .from("newsletter_subscriptions")
        .update({ subscribed: true })
        .eq("email", email);

      if (updateError) {
        console.error("Database update error:", updateError);
        throw new Error("Failed to update subscription");
      }

      console.log("Existing subscription reactivated");
    } else {
      // Insert new subscription
      const { error: insertError } = await supabaseClient
        .from("newsletter_subscriptions")
        .insert({ email, subscribed: true });

      if (insertError) {
        console.error("Database insert error:", insertError);
        throw new Error("Failed to store subscription");
      }

      console.log("New subscription added to database");
    }

    // Send welcome email to subscriber
    const welcomeEmailResponse = await resend.emails.send({
      from: "Anxoda <onboarding@resend.dev>",
      to: [email],
      subject: "Welcome to Anxoda's Newsletter!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Anxoda!</h1>
          </div>
          
          <div style="padding: 30px; background: white; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <p style="font-size: 18px; color: #1e293b; margin-bottom: 20px;">
              Thank you for subscribing to our newsletter! We're excited to share valuable insights about digital transformation with you.
            </p>
            
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #2563eb;">What to expect:</h3>
              <ul style="color: #64748b; padding-left: 20px;">
                <li>Weekly insights on digital transformation trends</li>
                <li>Case studies from successful business transformations</li>
                <li>Exclusive tips for optimizing your business processes</li>
                <li>Early access to new Anxoda services and features</li>
              </ul>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <p style="color: #64748b;">Have questions? We're here to help!</p>
              <p style="font-size: 18px; color: #2563eb; font-weight: bold;">+2349030673128</p>
              <p style="color: #64748b;">info@anxoda.com</p>
            </div>

            <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center;">
              <p style="color: #64748b; margin: 0;">
                Best regards,<br>
                <strong style="color: #2563eb;">The Anxoda Team</strong><br>
                Digital Transformation Experts
              </p>
            </div>
          </div>
        </div>
      `,
    });

    console.log("Welcome email sent:", welcomeEmailResponse);

    // Send notification to business
    const businessNotificationResponse = await resend.emails.send({
      from: "Anxoda Newsletter <onboarding@resend.dev>",
      to: ["info@anxoda.com"],
      subject: "New Newsletter Subscription",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">New Newsletter Subscription</h2>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1e293b;">Subscriber Details</h3>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Subscription Date:</strong> ${new Date().toLocaleDateString()}</p>
          </div>

          <div style="margin-top: 30px; padding: 20px; background: #eff6ff; border-radius: 8px;">
            <p style="margin: 0; color: #1e40af;">
              <strong>Action Required:</strong> Consider following up with valuable content or a welcome call to engage this new subscriber.
            </p>
          </div>
        </div>
      `,
    });

    console.log("Business notification sent:", businessNotificationResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Successfully subscribed to newsletter",
        welcomeEmailId: welcomeEmailResponse.data?.id,
        businessNotificationId: businessNotificationResponse.data?.id
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in subscribe-newsletter function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);