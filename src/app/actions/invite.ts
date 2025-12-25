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
        const existingUser = existingUsers?.users?.find(u => u.email === email.toLowerCase());

        if (existingUser) {
            return { success: false, error: 'User already exists' };
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
