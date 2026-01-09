import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { decode } from 'https://deno.land/std@0.208.0/encoding/base64url.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
}

interface UserData {
  email: string
  first_name: string
  last_name: string
  phone?: string
  role: 'admin' | 'technician' | 'manager'
}

interface UpdateUserData {
  email?: string
  password?: string
  first_name?: string
  last_name?: string
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

    // All authenticated users can access user management

    const url = new URL(req.url)
    const targetUserId = url.searchParams.get('userId')

    // GET - List all users (reads from user_metadata, falls back to profiles for legacy data)
    if (req.method === 'GET') {
      const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers()

      if (listError) {
        throw listError
      }

      // Get roles from user_roles table
      const { data: roles } = await supabaseAdmin
        .from('user_roles')
        .select('user_id, role')

      // Get legacy profile data for fallback
      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, phone, is_active')

      const users = authUsers.users.map(authUser => {
        const userRole = roles?.find(r => r.user_id === authUser.id)
        const profile = profiles?.find(p => p.id === authUser.id)
        const meta = authUser.user_metadata || {}

        // Get first_name and last_name from metadata, or parse from full_name fallback
        let firstName = meta.first_name || ''
        let lastName = meta.last_name || ''

        // Fallback: if no first/last name in metadata, try to parse from full_name
        if (!firstName && !lastName) {
          const fullName = meta.full_name || profile?.full_name || ''
          const nameParts = fullName.trim().split(' ')
          firstName = nameParts[0] || ''
          lastName = nameParts.slice(1).join(' ') || ''
        }

        return {
          id: authUser.id,
          email: authUser.email,
          first_name: firstName,
          last_name: lastName,
          full_name: `${firstName} ${lastName}`.trim() || 'Unknown',
          phone: meta.phone || profile?.phone || '',
          is_active: meta.is_active ?? profile?.is_active ?? true,
          role: userRole?.role || meta.role || 'technician',
          created_at: authUser.created_at,
          last_sign_in_at: authUser.last_sign_in_at
        }
      })

      return new Response(
        JSON.stringify({ success: true, users }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // POST - Invite new user (stores data in user_metadata)
    if (req.method === 'POST') {
      const userData: UserData = await req.json()

      if (!userData.email || !userData.first_name || !userData.role) {
        return new Response(
          JSON.stringify({ success: false, error: 'Missing required fields: email, first_name, role' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Store profile data in user_metadata
      const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        userData.email,
        {
          data: {
            first_name: userData.first_name,
            last_name: userData.last_name || '',
            phone: userData.phone || '',
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

      // Still insert role into user_roles table (roles are managed separately)
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
            first_name: userData.first_name,
            last_name: userData.last_name || '',
            phone: userData.phone || '',
            role: userData.role
          }
        }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // PATCH - Update user (updates user_metadata)
    if (req.method === 'PATCH') {
      if (!targetUserId) {
        return new Response(
          JSON.stringify({ success: false, error: 'userId query parameter required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const updateData: UpdateUserData = await req.json()

      // Build auth update object
      const authUpdate: { email?: string; password?: string; user_metadata?: Record<string, unknown> } = {}

      if (updateData.email) authUpdate.email = updateData.email
      if (updateData.password) authUpdate.password = updateData.password

      // Update user_metadata for profile fields
      const metadataUpdate: Record<string, unknown> = {}
      if (updateData.first_name !== undefined) metadataUpdate.first_name = updateData.first_name
      if (updateData.last_name !== undefined) metadataUpdate.last_name = updateData.last_name
      if (updateData.phone !== undefined) metadataUpdate.phone = updateData.phone
      if (updateData.is_active !== undefined) metadataUpdate.is_active = updateData.is_active
      if (updateData.role !== undefined) metadataUpdate.role = updateData.role

      if (Object.keys(metadataUpdate).length > 0) {
        // Get existing metadata and merge
        const { data: existingUser } = await supabaseAdmin.auth.admin.getUserById(targetUserId)
        authUpdate.user_metadata = {
          ...existingUser?.user?.user_metadata,
          ...metadataUpdate
        }
      }

      if (Object.keys(authUpdate).length > 0) {
        const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, authUpdate)
        if (authUpdateError) {
          return new Response(
            JSON.stringify({ success: false, error: authUpdateError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }

      // Update role in user_roles table if provided
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

    // DELETE - Delete user (including self-deletion for account removal)
    if (req.method === 'DELETE') {
      if (!targetUserId) {
        return new Response(
          JSON.stringify({ success: false, error: 'userId query parameter required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Delete from user_roles table
      await supabaseAdmin
        .from('user_roles')
        .delete()
        .eq('user_id', targetUserId)

      // Delete from profiles table (for legacy cleanup)
      await supabaseAdmin
        .from('profiles')
        .delete()
        .eq('id', targetUserId)

      // Delete auth user
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
