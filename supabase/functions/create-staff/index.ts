import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Get request data
    const { name, email, password, businessId, createdBy } = await req.json()
    
    console.log('Creating staff member:', { name, email, businessId, createdBy })

    // Validate input
    if (!name?.trim() || !email?.trim() || !password || !businessId || !createdBy) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: { message: 'Missing required fields: name, email, password, businessId, or createdBy' }
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create the user with admin client using provided password
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim(),
      password: password,
      email_confirm: true,
      user_metadata: {
        name: name.trim(),
        role: 'staff',
        created_by: createdBy,
        business_id: businessId
      }
    })

    if (authError) {
      console.error('Auth creation error:', authError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: { message: authError.message || 'Failed to create user account' }
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Auth user created:', authData.user?.id)

    // Wait a moment for triggers to complete
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Verify the inspector record was created by the trigger
    const { data: inspectorData, error: inspectorError } = await supabaseAdmin
      .from('inspectors')
      .select('*')
      .eq('user_id', authData.user.id)
      .single()

    if (inspectorError || !inspectorData) {
      console.error('Inspector record not found, creating manually:', inspectorError)
      
      // Create inspector record manually if trigger failed
      const { error: manualInspectorError } = await supabaseAdmin
        .from('inspectors')
        .insert({
          user_id: authData.user.id,
          name: name.trim(),
          email: email.trim(),
          business_id: businessId,
          created_by: createdBy,
          status: 'active'
        })

      if (manualInspectorError) {
        console.error('Manual inspector creation failed:', manualInspectorError)
        // Clean up the auth user if inspector creation fails
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
        
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: { message: 'Failed to create inspector record: ' + manualInspectorError.message }
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
    }

    // Verify role was assigned
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('*')
      .eq('user_id', authData.user.id)
      .single()

    if (roleError || !roleData) {
      console.error('Role not found, creating manually:', roleError)
      
      // Create role manually if trigger failed
      const { error: manualRoleError } = await supabaseAdmin
        .from('user_roles')
        .insert({
          user_id: authData.user.id,
          role: 'staff'
        })

      if (manualRoleError) {
        console.error('Manual role creation failed:', manualRoleError)
      }
    }

    // Note: Email with credentials will be sent by the calling function

    console.log('Staff member created successfully:', authData.user.id)

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: { 
          id: authData.user.id, 
          email: authData.user.email,
          name: name.trim()
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: { message: error.message || 'An unexpected error occurred' }
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})