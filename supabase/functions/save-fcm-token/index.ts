import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Set the auth token
    await supabase.auth.setSession({
      access_token: authHeader.replace('Bearer ', ''),
      refresh_token: ''
    });

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    const { token, platform = 'web' } = await req.json();

    if (!token) {
      throw new Error('Token is required');
    }

    // Save or update the FCM token
    const { error } = await supabase
      .from('fcm_tokens')
      .upsert({
        user_id: user.id,
        token: token,
        platform: platform
      }, {
        onConflict: 'user_id,token'
      });

    if (error) {
      throw error;
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: 'FCM token saved successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Error in save-fcm-token function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});