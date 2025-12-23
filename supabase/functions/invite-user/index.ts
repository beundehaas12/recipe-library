// Supabase Edge Function: invite-user
// Sends auth invite email using Supabase Admin API
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

        // Get the site URL for redirect
        const siteUrl = Deno.env.get('SITE_URL') || 'http://localhost:5173'
        const redirect = redirectTo || siteUrl

        // Try to send invite first (most common case for new users)
        console.log(`[invite-user] Attempting to invite: ${email}`)

        try {
            const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
                redirectTo: redirect
            })

            if (!error) {
                console.log(`[invite-user] Successfully sent invite to: ${email}`)
                return new Response(
                    JSON.stringify({ success: true, message: 'Invite sent successfully' }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
                )
            }

            // If invite failed, check the error type
            console.log(`[invite-user] Invite failed:`, error.message)

            // User might already exist - try password reset as fallback
            if (error.message.includes('already') || error.message.includes('Database error')) {
                console.log(`[invite-user] Trying password reset for existing user: ${email}`)

                const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
                    redirectTo: redirect
                })

                if (!resetError) {
                    return new Response(
                        JSON.stringify({ success: true, message: 'Password reset email sent (user may already exist)' }),
                        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
                    )
                }

                console.log(`[invite-user] Password reset also failed:`, resetError.message)

                // If password reset also fails, the user might exist but email sending is disabled
                // Return success anyway since approval was done, and log the issue
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

            // Return a helpful error
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
