import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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
    console.log("Contact email function started");
    
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const resend = new Resend(resendApiKey);
    const { name, email, company, message }: ContactEmailRequest = await req.json();

    console.log("Processing contact form submission:", { name, email, company });

    // Create Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Store contact submission in database
    const { error: dbError } = await supabaseClient
      .from("contact_submissions")
      .insert({
        name,
        email,
        company,
        message,
        status: "new"
      });

    if (dbError) {
      console.error("Database error:", dbError);
      throw new Error("Failed to store contact submission");
    }

    console.log("Contact submission stored in database");

    // Send email to business
    const businessEmailResponse = await resend.emails.send({
      from: "Anxoda Contact Form <noreply@anxoda.com>",
      to: ["info@anxoda.com"],
      subject: `New Contact Form Submission from ${name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">New Contact Form Submission</h2>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1e293b;">Contact Details</h3>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            ${company ? `<p><strong>Company:</strong> ${company}</p>` : ''}
          </div>

          <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1e293b;">Message</h3>
            <p style="white-space: pre-wrap;">${message}</p>
          </div>

          <div style="margin-top: 30px; padding: 20px; background: #eff6ff; border-radius: 8px;">
            <p style="margin: 0; color: #1e40af;">
              <strong>Next Steps:</strong> Please respond to this inquiry within 24 hours to maintain our excellent customer service standards.
            </p>
          </div>
        </div>
      `,
    });

    console.log("Business notification email sent:", businessEmailResponse);

    // Send confirmation email to customer
    const customerEmailResponse = await resend.emails.send({
      from: "Anxoda <noreply@anxoda.com>",
      to: [email],
      subject: "Thank you for contacting Anxoda - We'll be in touch soon!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Thank You, ${name}!</h1>
          </div>
          
          <div style="padding: 30px; background: white; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <p style="font-size: 18px; color: #1e293b; margin-bottom: 20px;">
              We've received your message and appreciate you reaching out to Anxoda.
            </p>
            
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
              <p><strong>Company:</strong> ${company || 'Not provided'}</p>
              <p><strong>Message:</strong> ${message}</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <p style="color: #64748b;">Need immediate assistance? Call us at:</p>
              <p style="font-size: 20px; color: #2563eb; font-weight: bold;">+2349030673128</p>
              <p style="color: #64748b;">Office Hours: 9:00 AM - 5:00 PM (Monday to Friday)</p>
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

    console.log("Customer confirmation email sent:", customerEmailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Contact form submitted successfully",
        businessEmailId: businessEmailResponse.data?.id,
        customerEmailId: customerEmailResponse.data?.id
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
    console.error("Error in send-contact-email function:", error);
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