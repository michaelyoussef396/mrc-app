import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { decode } from 'https://deno.land/std@0.208.0/encoding/base64url.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
}

interface UserData {
  email: string
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

// Helper to decode JWT and extract user ID
function decodeJWT(token: string): { sub: string; exp: number } | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null

    const payload = parts[1]
    const decoded = new TextDecoder().decode(decode(payload))
    return JSON.parse(decoded)
  } catch {
    return null
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create admin client with service role key
    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Verify the calling user is authenticated
    const authHeader = req.headers.get('Authorization')

    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')

    // Decode JWT to get user ID
    const jwtPayload = decodeJWT(token)
    if (!jwtPayload || !jwtPayload.sub) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid token format' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if token is expired
    const now = Math.floor(Date.now() / 1000)
    if (jwtPayload.exp && jwtPayload.exp < now) {
      return new Response(
        JSON.stringify({ success: false, error: 'Token expired' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = jwtPayload.sub

    // Verify user exists using admin API
    const { data: callingUser, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId)

    if (userError || !callingUser?.user) {
      return new Response(
        JSON.stringify({ success: false, error: 'User not found' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if calling user is admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle()

    if (roleError || !roleData) {
      return new Response(
        JSON.stringify({ success: false, error: 'Access denied. Admin role required.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const url = new URL(req.url)
    const targetUserId = url.searchParams.get('userId')

    // GET - List all users
    if (req.method === 'GET') {
      const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers()

      if (listError) {
        throw listError
      }

      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, phone, avatar_url, is_active')

      const { data: roles } = await supabaseAdmin
        .from('user_roles')
        .select('user_id, role')

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

    // POST - Invite new user
    if (req.method === 'POST') {
      const userData: UserData = await req.json()

      if (!userData.email || !userData.full_name || !userData.role) {
        return new Response(
          JSON.stringify({ success: false, error: 'Missing required fields: email, full_name, role' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        userData.email,
        {
          data: {
            full_name: userData.full_name,
            phone: userData.phone || null,
            role: userData.role
          },
          redirectTo: `${Deno.env.get('SITE_URL') || 'https://mrc-app.vercel.app'}/login`
        }
      )

      if (inviteError) {
        return new Response(
          JSON.stringify({ success: false, error: inviteError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      await supabaseAdmin
        .from('profiles')
        .upsert({
          id: inviteData.user.id,
          email: userData.email,
          full_name: userData.full_name,
          phone: userData.phone || null,
          is_active: true
        })

      await supabaseAdmin
        .from('user_roles')
        .insert({
          user_id: inviteData.user.id,
          role: userData.role
        })

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Invitation sent successfully. User will receive an email to set their password.',
          user: {
            id: inviteData.user.id,
            email: inviteData.user.email,
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
      if (!targetUserId) {
        return new Response(
          JSON.stringify({ success: false, error: 'userId query parameter required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const updateData: UpdateUserData = await req.json()

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

        const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, authUpdate)
        if (authUpdateError) {
          return new Response(
            JSON.stringify({ success: false, error: authUpdateError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }

      if (updateData.full_name !== undefined || updateData.phone !== undefined || updateData.is_active !== undefined) {
        const profileUpdate: Record<string, unknown> = {}
        if (updateData.full_name !== undefined) profileUpdate.full_name = updateData.full_name
        if (updateData.phone !== undefined) profileUpdate.phone = updateData.phone
        if (updateData.is_active !== undefined) profileUpdate.is_active = updateData.is_active

        await supabaseAdmin
          .from('profiles')
          .update(profileUpdate)
          .eq('id', targetUserId)
      }

      if (updateData.role) {
        await supabaseAdmin
          .from('user_roles')
          .delete()
          .eq('user_id', targetUserId)

        await supabaseAdmin
          .from('user_roles')
          .insert({ user_id: targetUserId, role: updateData.role })
      }

      return new Response(
        JSON.stringify({ success: true, message: 'User updated successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // DELETE - Delete user
    if (req.method === 'DELETE') {
      if (!targetUserId) {
        return new Response(
          JSON.stringify({ success: false, error: 'userId query parameter required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (targetUserId === userId) {
        return new Response(
          JSON.stringify({ success: false, error: 'Cannot delete your own account' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      await supabaseAdmin
        .from('user_roles')
        .delete()
        .eq('user_id', targetUserId)

      await supabaseAdmin
        .from('profiles')
        .delete()
        .eq('id', targetUserId)

      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId)

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
