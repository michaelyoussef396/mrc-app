import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Create admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Check if any users exist
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (listError) {
      console.error('Error listing users:', listError)
      throw listError
    }

    // If users exist, no need to seed
    if (existingUsers.users && existingUsers.users.length > 0) {
      console.log('Users already exist, skipping seed')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Users already exist',
          usersCount: existingUsers.users.length 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create the initial admin user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: 'admin@mrc.com.au',
      password: 'Admin123!',
      email_confirm: true,
      user_metadata: {
        full_name: 'System Administrator',
        role: 'admin'
      }
    })

    if (createError) {
      console.error('Error creating admin user:', createError)
      throw createError
    }

    console.log('Admin user created successfully:', newUser.user.email)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Admin user created successfully',
        user: {
          email: newUser.user.email,
          id: newUser.user.id
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in seed-admin function:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
