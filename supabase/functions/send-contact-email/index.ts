import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ContactEmailRequest {
  name: string;
  email: string;
  company?: string;
  message: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("send-contact-email: start");

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) throw new Error("RESEND_API_KEY not configured");

    const resend = new Resend(resendApiKey);
    const { name, email, company, message, user_id }: ContactEmailRequest & { user_id?: string } = await req.json();

    if (!name || !email || !message) {
      throw new Error("Missing required fields: name, email, or message");
    }

    // Create Supabase client with service role key to store submission
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

    // Store contact submission (anonymous allowed)
    const { error: dbError } = await supabase.from("contact_submissions").insert({
      name,
      email,
      company,
      message,
      status: "new",
    });

    if (dbError) {
      console.error("send-contact-email: db insert error", dbError);
      throw new Error("Failed to store contact submission");
    }

    console.log("send-contact-email: stored submission for user", user_id);

    // Notify business (temporary workaround - using verified email)
    const businessEmail = await resend.emails.send({
      from: "Anxoda Contact Form <onboarding@resend.dev>",
      to: ["anxoda.business@gmail.com"],
      subject: `New Contact Form Submission from ${name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">New Contact Form Submission</h2>
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1e293b;">Contact Details</h3>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            ${company ? `<p><strong>Company:</strong> ${company}</p>` : ""}
          </div>
          <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1e293b;">Message</h3>
            <p style="white-space: pre-wrap;">${message}</p>
          </div>
          <div style="margin-top: 30px; padding: 20px; background: #eff6ff; border-radius: 8px;">
            <p style="margin: 0; color: #1e40af;"><strong>Next Steps:</strong> Please respond to this inquiry within 24 hours.</p>
          </div>
        </div>
      `,
    });

    console.log("send-contact-email: business email sent", businessEmail);

    // Confirm to customer (TEMPORARY: sending to business email during testing)
    const customerEmail = await resend.emails.send({
      from: "Anxoda <onboarding@resend.dev>",
      to: ["anxoda.business@gmail.com"],
      subject: `[Customer Copy] Thank you for contacting Anxoda - We'll be in touch soon!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #fef3c7; padding: 15px; border-radius: 8px 8px 0 0; border-left: 4px solid #f59e0b;">
            <p style="margin: 0; color: #92400e; font-weight: bold;">⚠️ TESTING MODE: This email was originally intended for ${email}</p>
          </div>
          <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); padding: 30px; text-align: center; border-radius: 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Thank You, ${name}!</h1>
          </div>
          <div style="padding: 30px; background: white; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <p style="font-size: 18px; color: #1e293b; margin-bottom: 20px;">We've received your message and appreciate you reaching out to Anxoda.</p>
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #2563eb;">What happens next?</h3>
              <ul style="color: #64748b; padding-left: 20px;">
                <li>Our team will review your inquiry within 2-4 hours</li>
                <li>A business consultant will reach out within 24 hours</li>
                <li>We'll schedule a free consultation to discuss your needs</li>
              </ul>
            </div>
            <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #1e40af;">Your Message Summary</h3>
              <p><strong>Original Sender:</strong> ${email}</p>
              <p><strong>Company:</strong> ${company || "Not provided"}</p>
              <p><strong>Message:</strong> ${message}</p>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <p style="color: #64748b;">Need immediate assistance? Call us at:</p>
              <p style="font-size: 20px; color: #2563eb; font-weight: bold;">+2349030673128</p>
              <p style="color: #64748b;">Office Hours: 9:00 AM - 5:00 PM (Monday to Friday)</p>
            </div>
            <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center;">
              <p style="color: #64748b; margin: 0;">Best regards,<br><strong style="color: #2563eb;">The Anxoda Team</strong><br>Digital Transformation Experts</p>
            </div>
          </div>
        </div>
      `,
    });

    console.log("send-contact-email: customer email sent", customerEmail);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Contact form submitted successfully",
        businessEmailId: businessEmail.data?.id,
        customerEmailId: customerEmail.data?.id,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("send-contact-email: error", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
