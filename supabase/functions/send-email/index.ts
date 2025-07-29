import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string;
  name: string;
  type: 'staff_invitation' | 'password_reset';
  businessName?: string;
  password?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, name, type, businessName, password }: EmailRequest = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let subject = '';
    let htmlContent = '';

    if (type === 'staff_invitation') {
      subject = `Welcome to ${businessName || 'Vehicle Inspection System'}`;
      htmlContent = `
        <h1>Welcome ${name}!</h1>
        <p>You have been added as a staff member to ${businessName || 'the inspection system'}.</p>
        <p><strong>Your login credentials:</strong></p>
        <ul>
          <li><strong>Email:</strong> ${to}</li>
          <li><strong>Password:</strong> ${password}</li>
        </ul>
        <p>Please login at your earliest convenience to start performing inspections.</p>
        <p>For security, we recommend changing your password after your first login.</p>
        <p>If you have any questions, please contact your administrator.</p>
        <p>Best regards,<br>The Vehicle Inspection Team</p>
      `;
    } else if (type === 'password_reset') {
      subject = 'Your New Password';
      htmlContent = `
        <h1>Password Reset</h1>
        <p>Hi ${name},</p>
        <p>Your password has been reset. Here are your new login credentials:</p>
        <ul>
          <li><strong>Email:</strong> ${to}</li>
          <li><strong>New Password:</strong> ${password}</li>
        </ul>
        <p>Please login with these credentials and consider changing your password for security.</p>
        <p>If you didn't request this password reset, please contact your administrator immediately.</p>
        <p>Best regards,<br>The Vehicle Inspection Team</p>
      `;
    }

    // Send email using Supabase SMTP
    const { data, error } = await supabase.auth.admin.sendEmail({
      email: to,
      type: 'email',
      options: {
        subject,
        body: htmlContent
      }
    });

    if (error) {
      console.error('Error sending email via Supabase:', error);
      throw error;
    }

    console.log('Email sent successfully via Supabase SMTP:', { to, subject });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email sent successfully via Supabase SMTP',
        data
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Error in send-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);