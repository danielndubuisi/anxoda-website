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
    const { email }: NewsletterRequest = await req.json();

    console.log("Processing newsletter subscription for:", email);

    // Create Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Check if email already exists
    const { data: existingSubscription } = await supabaseClient
      .from("newsletter_subscriptions")
      .select("*")
      .eq("email", email)
      .single();

    if (existingSubscription) {
      if (existingSubscription.subscribed) {
        return new Response(
          JSON.stringify({ 
            success: false,
            message: "Email is already subscribed to our newsletter"
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      } else {
        // Reactivate subscription
        const { error: updateError } = await supabaseClient
          .from("newsletter_subscriptions")
          .update({ subscribed: true })
          .eq("email", email);

        if (updateError) {
          throw new Error("Failed to reactivate subscription");
        }
      }
    } else {
      // Store newsletter subscription in database
      const { error: dbError } = await supabaseClient
        .from("newsletter_subscriptions")
        .insert({
          email,
          subscribed: true
        });

      if (dbError) {
        console.error("Database error:", dbError);
        throw new Error("Failed to store newsletter subscription");
      }
    }

    console.log("Newsletter subscription stored in database");

    // Send welcome email
    const welcomeEmailResponse = await resend.emails.send({
      from: "Anxoda Newsletter <newsletter@anxoda.com>",
      to: [email],
      subject: "Welcome to the Anxoda Newsletter - Your Digital Transformation Journey Starts Here!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); padding: 40px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 32px;">Welcome to Anxoda!</h1>
            <p style="color: #bfdbfe; margin: 10px 0 0 0; font-size: 18px;">Your Digital Transformation Newsletter</p>
          </div>
          
          <div style="padding: 40px; background: white; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <p style="font-size: 18px; color: #1e293b; margin-bottom: 25px;">
              Thank you for subscribing to our newsletter! You've taken the first step towards staying ahead in the digital transformation landscape.
            </p>
            
            <div style="background: #f8fafc; padding: 25px; border-radius: 8px; margin: 25px 0;">
              <h3 style="margin-top: 0; color: #2563eb; font-size: 20px;">What to Expect</h3>
              <ul style="color: #64748b; padding-left: 20px; line-height: 1.6;">
                <li><strong>Weekly Insights:</strong> Latest trends in digital transformation</li>
                <li><strong>Case Studies:</strong> Real success stories from our clients</li>
                <li><strong>Expert Tips:</strong> Actionable advice for business growth</li>
                <li><strong>Industry News:</strong> Important updates in technology and business</li>
                <li><strong>Exclusive Offers:</strong> Special discounts on our services</li>
              </ul>
            </div>

            <div style="background: #eff6ff; padding: 25px; border-radius: 8px; margin: 25px 0; text-align: center;">
              <h3 style="margin-top: 0; color: #1e40af;">Ready to Get Started?</h3>
              <p style="color: #64748b; margin-bottom: 20px;">
                Don't wait for the newsletter! Schedule a free consultation today and discover how we can transform your business.
              </p>
              <a href="https://calendly.com/anxoda-consultation" 
                 style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                Schedule Free Consultation
              </a>
            </div>

            <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 25px 0;">
              <h4 style="margin-top: 0; color: #92400e;">💡 First Tip: Start Small, Think Big</h4>
              <p style="color: #78350f; margin-bottom: 0;">
                Digital transformation doesn't have to be overwhelming. Start with one process, automate it successfully, then scale. 
                This approach reduces risk and builds momentum for larger changes.
              </p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <p style="color: #64748b;">Have questions? We're here to help!</p>
              <p style="font-size: 18px; color: #2563eb; font-weight: bold;">
                📞 +2349030673128<br>
                📧 anxoda.business@gmail.com
              </p>
              <p style="color: #64748b; font-size: 14px;">Office Hours: 9:00 AM - 5:00 PM (Monday to Friday)</p>
            </div>

            <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center;">
              <p style="color: #64748b; margin: 0; font-size: 14px;">
                You're receiving this email because you subscribed to our newsletter.<br>
                <a href="#" style="color: #2563eb;">Unsubscribe</a> | 
                <a href="#" style="color: #2563eb;">Update Preferences</a>
              </p>
              <p style="color: #94a3b8; margin: 10px 0 0 0; font-size: 12px;">
                Anxoda - Digital Transformation Experts<br>
                Lagos, Nigeria
              </p>
            </div>
          </div>
        </div>
      `,
    });

    console.log("Welcome email sent:", welcomeEmailResponse);

    // Notify business about new subscription
    const businessNotificationResponse = await resend.emails.send({
      from: "Anxoda System <system@anxoda.com>",
      to: ["anxoda.business@gmail.com"],
      subject: "New Newsletter Subscription",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">New Newsletter Subscription</h2>
          <p>A new user has subscribed to the Anxoda newsletter:</p>
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Subscribed at:</strong> ${new Date().toLocaleString()}</p>
          </div>
          <p style="color: #64748b; font-size: 14px;">
            This is an automated notification from your website's newsletter system.
          </p>
        </div>
      `,
    });

    console.log("Business notification email sent:", businessNotificationResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Successfully subscribed to newsletter",
        welcomeEmailId: welcomeEmailResponse.data?.id
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