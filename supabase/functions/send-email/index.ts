import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string;
  name: string;
  type: 'staff_invitation' | 'password_reset';
  businessName?: string;
  resetLink?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, name, type, businessName, resetLink }: EmailRequest = await req.json();

    // For now, just log the email that would be sent
    // This will be updated once the user provides their Resend API key
    console.log('Email would be sent:', {
      to,
      name,
      type,
      businessName,
      resetLink
    });

    let subject = '';
    let htmlContent = '';

    if (type === 'staff_invitation') {
      subject = `Welcome to ${businessName || 'Vehicle Inspection System'}`;
      htmlContent = `
        <h1>Welcome ${name}!</h1>
        <p>You have been added as a staff member to ${businessName || 'the inspection system'}.</p>
        <p>To get started:</p>
        <ol>
          <li>Check your email for a password reset link</li>
          <li>Set up your password</li>
          <li>Login to start performing inspections</li>
        </ol>
        <p>If you have any questions, please contact your administrator.</p>
        <p>Best regards,<br>The Vehicle Inspection Team</p>
      `;
    } else if (type === 'password_reset') {
      subject = 'Reset Your Password';
      htmlContent = `
        <h1>Password Reset Request</h1>
        <p>Hi ${name},</p>
        <p>You requested to reset your password. Click the link below to set a new password:</p>
        <p><a href="${resetLink}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
        <p>If you didn't request this, you can safely ignore this email.</p>
        <p>Best regards,<br>The Vehicle Inspection Team</p>
      `;
    }

    // Return success for now - will actually send email once Resend is configured
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email logged - Resend API key needed to actually send emails',
        emailDetails: { to, subject, preview: htmlContent.substring(0, 100) + '...' }
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