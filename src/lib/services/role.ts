import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

/**
 * Validate an invitation token (for account completion)
 * @param {string} token - UUID invitation token
 */
export async function validateInvitationToken(token: string) {
    try {
        const { data, error } = await supabase
            .rpc('validate_invitation_token', { p_token: token });

        if (error) {
            console.error('Error validating invitation token:', error);
            return { valid: false, error: error.message };
        }

        return data;
    } catch (err) {
        console.error('Failed to validate invitation token:', err);
        return { valid: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
}

/**
 * Mark early access request as completed (after account creation)
 * @param {string} token - UUID invitation token
 */
export async function completeEarlyAccess(token: string) {
    try {
        const { data, error } = await supabase
            .rpc('complete_early_access', { p_token: token });

        if (error) {
            console.error('Error completing early access:', error);
            return { success: false, error: error.message };
        }

        return data;
    } catch (err) {
        console.error('Failed to complete early access:', err);
        return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
}
