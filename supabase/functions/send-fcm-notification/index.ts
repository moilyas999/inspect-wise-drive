import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FCMNotificationRequest {
  title: string;
  body: string;
  data?: Record<string, string>;
  userId?: string;
  tokens?: string[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, body, data, userId, tokens }: FCMNotificationRequest = await req.json();
    
    const serviceAccountJson = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_JSON');
    if (!serviceAccountJson) {
      throw new Error('Firebase service account JSON not configured');
    }

    const serviceAccount = JSON.parse(serviceAccountJson);
    
    // Get access token from Google
    const jwtToken = await getAccessToken(serviceAccount);
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    let pushTokens: string[] = [];
    
    if (tokens) {
      // Use provided tokens
      pushTokens = tokens;
    } else if (userId) {
      // Get user's FCM tokens from database
      const { data: tokenData, error } = await supabase
        .from('fcm_tokens')
        .select('token')
        .eq('user_id', userId);
        
      if (error) {
        console.error('Error fetching FCM tokens:', error);
        throw error;
      }
      
      pushTokens = tokenData?.map(t => t.token) || [];
    } else {
      throw new Error('Either userId or tokens must be provided');
    }
    
    if (pushTokens.length === 0) {
      console.log('No push tokens found for user');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No push tokens found',
        results: []
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log(`Sending notification to ${pushTokens.length} devices`);
    
    // Send notifications to all tokens
    const results = await Promise.allSettled(
      pushTokens.map(token => sendFCMNotification(token, title, body, data, jwtToken, serviceAccount.project_id))
    );
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    console.log(`Notification results: ${successful} successful, ${failed} failed`);
    
    return new Response(JSON.stringify({ 
      success: true,
      sent: successful,
      failed: failed,
      results: results.map((result, index) => ({
        token: pushTokens[index].substring(0, 20) + '...',
        success: result.status === 'fulfilled',
        error: result.status === 'rejected' ? result.reason?.message : null
      }))
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Error in send-fcm-notification function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function getAccessToken(serviceAccount: any): Promise<string> {
  const jwt = await createJWT(serviceAccount);
  
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to get access token: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.access_token;
}

async function createJWT(serviceAccount: any): Promise<string> {
  const header = {
    alg: 'RS256',
    typ: 'JWT',
    kid: serviceAccount.private_key_id,
  };
  
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };
  
  const headerB64 = btoa(JSON.stringify(header));
  const payloadB64 = btoa(JSON.stringify(payload));
  const unsigned = `${headerB64}.${payloadB64}`;
  
  // Import private key
  const keyData = serviceAccount.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');
    
  const binaryKey = Uint8Array.from(atob(keyData), c => c.charCodeAt(0));
  
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(unsigned)
  );
  
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)));
  
  return `${unsigned}.${signatureB64}`;
}

async function sendFCMNotification(
  token: string, 
  title: string, 
  body: string, 
  data: Record<string, string> = {},
  accessToken: string,
  projectId: string
): Promise<any> {
  const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
  
  const message = {
    message: {
      token: token,
      notification: {
        title: title,
        body: body,
      },
      data: data,
      android: {
        priority: 'high',
        notification: {
          channel_id: 'default',
          priority: 'high',
          default_sound: true,
        },
      },
    },
  };
  
  const response = await fetch(fcmUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`FCM send failed for token ${token.substring(0, 20)}...:`, errorText);
    throw new Error(`FCM send failed: ${response.status} ${errorText}`);
  }
  
  return await response.json();
}