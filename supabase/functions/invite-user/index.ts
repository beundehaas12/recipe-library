// Supabase Edge Function: invite-user
// Sends auth invite email using Supabase Admin API
// Creates user_profiles with names from early_access_requests
// Handles errors gracefully with fallback to password reset

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { email, redirectTo } = await req.json()

        if (!email) {
            throw new Error('Email is required')
        }

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

        // Get the site URL for redirect - Default to Next.js port 3000
        const siteUrl = Deno.env.get('SITE_URL') || 'http://localhost:3000'
        const redirect = redirectTo || siteUrl

        // Look up names from early_access_requests
        const { data: earlyAccess } = await supabaseAdmin
            .from('early_access_requests')
            .select('first_name, last_name')
            .eq('email', email.toLowerCase().trim())
            .single()

        const firstName = earlyAccess?.first_name || null
        const lastName = earlyAccess?.last_name || null
        console.log(`[invite-user] Names from early_access: ${firstName} ${lastName}`)

        // Try to send invite first (most common case for new users)
        console.log(`[invite-user] Attempting to invite: ${email}`)

        try {
            const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
                // Redirect to callback route to exchange code, then to complete-account
                redirectTo: `${siteUrl}/auth/callback?next=/complete-account`
            })

            if (!error && data?.user) {
                console.log(`[invite-user] Successfully sent invite to: ${email}, user id: ${data.user.id}`)

                // Create user_profiles row with names
                if (data.user.id) {
                    const { error: profileError } = await supabaseAdmin
                        .from('user_profiles')
                        .upsert({
                            user_id: data.user.id,
                            first_name: firstName,
                            last_name: lastName
                        }, { onConflict: 'user_id' })

                    if (profileError) {
                        console.log(`[invite-user] Profile upsert warning:`, profileError.message)
                    } else {
                        console.log(`[invite-user] Created profile for ${data.user.id}`)
                    }

                    // Also create user_preferences
                    await supabaseAdmin
                        .from('user_preferences')
                        .upsert({ user_id: data.user.id }, { onConflict: 'user_id' })
                }

                return new Response(
                    JSON.stringify({ success: true, message: 'Invite sent successfully' }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
                )
            }

            // If invite failed, check the error type
            console.log(`[invite-user] Invite failed:`, error?.message)

            // User might already exist - try password reset as fallback
            if (error?.message.includes('already') || error?.message.includes('Database error')) {
                console.log(`[invite-user] Trying password reset for existing user: ${email}`)

                const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
                    // Also redirect to callback -> complete-account for resets
                    redirectTo: `${siteUrl}/auth/callback?next=/complete-account`
                })

                if (!resetError) {
                    // Get existing user by email and update their profile
                    const { data: users } = await supabaseAdmin.auth.admin.listUsers()
                    const existingUser = users?.users?.find(u => u.email === email.toLowerCase().trim())

                    if (existingUser && firstName) {
                        await supabaseAdmin
                            .from('user_profiles')
                            .upsert({
                                user_id: existingUser.id,
                                first_name: firstName,
                                last_name: lastName
                            }, { onConflict: 'user_id' })
                        console.log(`[invite-user] Updated profile for existing user ${existingUser.id}`)
                    }

                    return new Response(
                        JSON.stringify({ success: true, message: 'Password reset email sent (user may already exist)' }),
                        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
                    )
                }

                console.log(`[invite-user] Password reset also failed:`, resetError.message)

                return new Response(
                    JSON.stringify({
                        success: true,
                        message: 'User approved (email sending may be disabled in Supabase settings)',
                        warning: 'Could not send email - check Supabase Email settings'
                    }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
                )
            }

            throw error

        } catch (inviteError: any) {
            console.error('[invite-user] Invite/reset error:', inviteError.message)

            return new Response(
                JSON.stringify({
                    success: false,
                    error: inviteError.message,
                    hint: 'Check Supabase Dashboard > Authentication > Email Templates and ensure email is enabled'
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            )
        }

    } catch (error: any) {
        console.error('[invite-user] Error:', error.message)
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
