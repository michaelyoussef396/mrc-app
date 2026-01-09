import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface UserData {
  email: string
  password?: string
  full_name: string
  phone: string
  role: 'admin' | 'technician' | 'manager'
}

interface UpdateUserData {
  email?: string
  password?: string
  full_name?: string
  phone?: string
  role?: 'admin' | 'technician' | 'manager'
  is_active?: boolean
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

    // Verify the calling user is authenticated and is an admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user: callingUser }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !callingUser) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if calling user is admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', callingUser.id)
      .eq('role', 'admin')
      .maybeSingle()

    if (roleError || !roleData) {
      return new Response(
        JSON.stringify({ success: false, error: 'Access denied. Admin role required.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const url = new URL(req.url)
    const userId = url.searchParams.get('userId')

    // GET - List all users
    if (req.method === 'GET') {
      // Get all users from auth.users
      const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers()

      if (listError) {
        throw listError
      }

      // Get profiles and roles for all users
      const { data: profiles, error: profilesError } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, phone, avatar_url, is_active')

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError)
      }

      const { data: roles, error: rolesError } = await supabaseAdmin
        .from('user_roles')
        .select('user_id, role')

      if (rolesError) {
        console.error('Error fetching roles:', rolesError)
      }

      // Combine auth users with profiles and roles
      const users = authUsers.users.map(authUser => {
        const profile = profiles?.find(p => p.id === authUser.id)
        const userRole = roles?.find(r => r.user_id === authUser.id)

        return {
          id: authUser.id,
          email: authUser.email,
          full_name: profile?.full_name || authUser.user_metadata?.full_name || 'Unknown',
          phone: profile?.phone || authUser.user_metadata?.phone || '',
          avatar_url: profile?.avatar_url || null,
          is_active: profile?.is_active ?? true,
          role: userRole?.role || authUser.user_metadata?.role || 'technician',
          created_at: authUser.created_at,
          last_sign_in_at: authUser.last_sign_in_at
        }
      })

      return new Response(
        JSON.stringify({ success: true, users }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // POST - Create new user
    if (req.method === 'POST') {
      const userData: UserData = await req.json()

      // Validate required fields
      if (!userData.email || !userData.password || !userData.full_name || !userData.role) {
        return new Response(
          JSON.stringify({ success: false, error: 'Missing required fields: email, password, full_name, role' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Create user in auth.users
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true,
        user_metadata: {
          full_name: userData.full_name,
          phone: userData.phone || null,
          role: userData.role
        }
      })

      if (createError) {
        return new Response(
          JSON.stringify({ success: false, error: createError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Create profile (trigger should handle this, but let's be explicit)
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({
          id: newUser.user.id,
          email: userData.email,
          full_name: userData.full_name,
          phone: userData.phone || null,
          is_active: true
        })

      if (profileError) {
        console.error('Error creating profile:', profileError)
      }

      // Create user role
      const { error: roleInsertError } = await supabaseAdmin
        .from('user_roles')
        .insert({
          user_id: newUser.user.id,
          role: userData.role
        })

      if (roleInsertError) {
        console.error('Error creating user role:', roleInsertError)
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'User created successfully',
          user: {
            id: newUser.user.id,
            email: newUser.user.email,
            full_name: userData.full_name,
            phone: userData.phone,
            role: userData.role
          }
        }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // PATCH - Update user
    if (req.method === 'PATCH') {
      if (!userId) {
        return new Response(
          JSON.stringify({ success: false, error: 'userId query parameter required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const updateData: UpdateUserData = await req.json()

      // Update auth user if email or password changed
      if (updateData.email || updateData.password) {
        const authUpdate: { email?: string; password?: string; user_metadata?: Record<string, unknown> } = {}
        if (updateData.email) authUpdate.email = updateData.email
        if (updateData.password) authUpdate.password = updateData.password
        if (updateData.full_name || updateData.phone || updateData.role) {
          authUpdate.user_metadata = {
            ...(updateData.full_name && { full_name: updateData.full_name }),
            ...(updateData.phone && { phone: updateData.phone }),
            ...(updateData.role && { role: updateData.role })
          }
        }

        const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(userId, authUpdate)
        if (authUpdateError) {
          return new Response(
            JSON.stringify({ success: false, error: authUpdateError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }

      // Update profile
      if (updateData.full_name !== undefined || updateData.phone !== undefined || updateData.is_active !== undefined) {
        const profileUpdate: Record<string, unknown> = {}
        if (updateData.full_name !== undefined) profileUpdate.full_name = updateData.full_name
        if (updateData.phone !== undefined) profileUpdate.phone = updateData.phone
        if (updateData.is_active !== undefined) profileUpdate.is_active = updateData.is_active

        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .update(profileUpdate)
          .eq('id', userId)

        if (profileError) {
          console.error('Error updating profile:', profileError)
        }
      }

      // Update role
      if (updateData.role) {
        // Delete existing role and insert new one (upsert)
        await supabaseAdmin
          .from('user_roles')
          .delete()
          .eq('user_id', userId)

        const { error: roleError } = await supabaseAdmin
          .from('user_roles')
          .insert({ user_id: userId, role: updateData.role })

        if (roleError) {
          console.error('Error updating role:', roleError)
        }
      }

      return new Response(
        JSON.stringify({ success: true, message: 'User updated successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // DELETE - Delete user
    if (req.method === 'DELETE') {
      if (!userId) {
        return new Response(
          JSON.stringify({ success: false, error: 'userId query parameter required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Prevent deleting yourself
      if (userId === callingUser.id) {
        return new Response(
          JSON.stringify({ success: false, error: 'Cannot delete your own account' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Delete from user_roles first (FK constraint)
      await supabaseAdmin
        .from('user_roles')
        .delete()
        .eq('user_id', userId)

      // Delete from profiles
      await supabaseAdmin
        .from('profiles')
        .delete()
        .eq('id', userId)

      // Delete auth user
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)

      if (deleteError) {
        return new Response(
          JSON.stringify({ success: false, error: deleteError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ success: true, message: 'User deleted successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Method not allowed
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in manage-users function:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
