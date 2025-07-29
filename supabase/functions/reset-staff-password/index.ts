import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, newPassword } = await req.json();
    
    if (!email || !newPassword) {
      throw new Error('Missing required fields: email, newPassword');
    }

    console.log('Resetting password for user:', email);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user by email
    const { data: users, error: getUserError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (getUserError) {
      console.error('Error getting users:', getUserError);
      throw new Error('Failed to find user');
    }

    const user = users.users.find(u => u.email === email);
    if (!user) {
      throw new Error('User not found');
    }

    // Update user password
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password: newPassword
    });

    if (error) {
      console.error('Error updating password:', error);
      throw error;
    }

    console.log('Password updated successfully for user:', email);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Password updated successfully'
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Error in reset-staff-password function:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: { message: error.message } 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);