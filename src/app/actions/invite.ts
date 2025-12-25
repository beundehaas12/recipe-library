'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

/**
 * Invite a user from the waitlist.
 * Uses Supabase's built-in inviteUserByEmail which:
 * - Creates user in auth.users (unconfirmed)
 * - Sends invite email automatically
 * - User clicks link → sets password → becomes full user
 */
export async function inviteWaitlistUser(waitlistId: string, email: string) {
    const adminSupabase = createAdminClient();
    const supabase = await createClient();

    try {
        // Check if user already exists in auth
        const { data: existingUsers } = await adminSupabase.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());

        if (existingUser) {
            // User exists - check if confirmed
            if (existingUser.email_confirmed_at) {
                // Already a full user, can't invite again
                return { success: false, error: 'Deze gebruiker heeft al een account. Ze kunnen inloggen.' };
            }

            // User exists but unconfirmed - resend invite
            const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
            const { error: resendError } = await adminSupabase.auth.admin.inviteUserByEmail(email, {
                redirectTo: `${siteUrl}/invite-accept`,
            });

            if (resendError) {
                // If invite fails, try password reset as fallback
                await adminSupabase.auth.resetPasswordForEmail(email, {
                    redirectTo: `${siteUrl}/invite-accept`,
                });
            }

            // Update waitlist status
            const supabase = await createClient();
            await supabase.from('waitlist').update({ status: 'invited' }).eq('id', waitlistId);

            return { success: true, message: 'Uitnodiging opnieuw verzonden' };
        }

        // Send invite using Supabase's built-in flow
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

        const { error: inviteError } = await adminSupabase.auth.admin.inviteUserByEmail(email, {
            redirectTo: `${siteUrl}/invite-accept`,
        });

        if (inviteError) {
            console.error('[invite] Error:', inviteError);
            return { success: false, error: inviteError.message };
        }

        // Update waitlist status to 'invited'
        const { error: updateError } = await supabase
            .from('waitlist')
            .update({ status: 'invited' })
            .eq('id', waitlistId);

        if (updateError) {
            console.error('[invite] Failed to update waitlist:', updateError);
        }

        return { success: true };
    } catch (err) {
        console.error('[invite] Unexpected error:', err);
        return { success: false, error: 'Failed to send invite' };
    }
}

/**
 * Delete a waitlist entry (reject)
 */
export async function deleteWaitlistEntry(waitlistId: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from('waitlist')
        .delete()
        .eq('id', waitlistId);

    if (error) {
        return { success: false, error: error.message };
    }

    return { success: true };
}
