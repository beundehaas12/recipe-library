import { supabase } from './supabase';

/**
 * Fetch the role for a specific user
 * @param {string} userId - The user's UUID
 * @returns {Promise<string>} - The role ('user', 'author', or 'admin')
 */
export async function getUserRole(userId) {
    if (!userId) return 'user';

    try {
        const { data, error } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', userId)
            .single();

        if (error) {
            // If no role found, default to 'user'
            if (error.code === 'PGRST116') return 'user';
            console.error('Error fetching user role:', error);
            return 'user';
        }

        return data?.role || 'user';
    } catch (err) {
        console.error('Failed to fetch user role:', err);
        return 'user';
    }
}

/**
 * Check if a role has dashboard access (author or admin)
 * @param {string} role - The user's role
 * @returns {boolean}
 */
export function canAccessDashboard(role) {
    return role === 'author' || role === 'admin';
}

/**
 * Check if a role has user management access (admin only)
 * @param {string} role - The user's role
 * @returns {boolean}
 */
export function canManageUsers(role) {
    return role === 'admin';
}

/**
 * Update a user's role (admin only)
 * @param {string} userId - Target user's UUID
 * @param {string} newRole - New role to assign
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function updateUserRole(userId, newRole) {
    if (!['user', 'author', 'admin'].includes(newRole)) {
        return { success: false, error: 'Invalid role' };
    }

    try {
        const { error } = await supabase
            .from('user_roles')
            .update({ role: newRole, updated_at: new Date().toISOString() })
            .eq('user_id', userId);

        if (error) {
            console.error('Error updating role:', error);
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (err) {
        console.error('Failed to update role:', err);
        return { success: false, error: err.message };
    }
}

/**
 * Fetch all users with their roles (admin only)
 * @returns {Promise<Array>}
 */
export async function getAllUsersWithRoles() {
    try {
        const { data, error } = await supabase
            .from('user_roles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching users:', error);
            return [];
        }

        return data || [];
    } catch (err) {
        console.error('Failed to fetch users:', err);
        return [];
    }
}

/**
 * Get counts of users by role (admin only)
 * @returns {Promise<{total: number, admins: number, authors: number, users: number}>}
 */
export async function getRoleCounts() {
    try {
        const { data, error } = await supabase
            .from('user_roles')
            .select('role');

        if (error) throw error;

        const counts = {
            total: data.length,
            admins: 0,
            authors: 0,
            users: 0
        };

        data.forEach(user => {
            if (counts[user.role + 's'] !== undefined) {
                counts[user.role + 's']++;
            }
        });

        return counts;
    } catch (err) {
        console.error('Failed to get role counts:', err);
        return { total: 0, admins: 0, authors: 0, users: 0 };
    }
}

// ============================================================================
// EARLY ACCESS FUNCTIONS
// ============================================================================

/**
 * Submit an early access request (public, from login page)
 * @param {string} email - Email address to register
 * @param {string} firstName - First name
 * @param {string} lastName - Last name
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function submitEarlyAccessRequest(email, firstName, lastName) {
    try {
        const { error } = await supabase
            .from('early_access_requests')
            .insert({
                email: email.toLowerCase().trim(),
                first_name: firstName?.trim() || null,
                last_name: lastName?.trim() || null
            });

        if (error) {
            if (error.code === '23505') { // Unique constraint violation
                return { success: false, error: 'Dit e-mailadres staat al op de lijst.' };
            }
            console.error('Error submitting early access request:', error);
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (err) {
        console.error('Failed to submit early access request:', err);
        return { success: false, error: err.message };
    }
}

/**
 * Get all early access requests (admin only)
 * @returns {Promise<Array>}
 */
export async function getEarlyAccessRequests() {
    try {
        const { data, error } = await supabase
            .from('early_access_requests')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching early access requests:', error);
            return [];
        }

        return data || [];
    } catch (err) {
        console.error('Failed to fetch early access requests:', err);
        return [];
    }
}

/**
 * Get counts of early access requests by status (admin only)
 * @returns {Promise<{pending: number, approved: number, completed: number}>}
 */
export async function getEarlyAccessCounts() {
    try {
        const { data, error } = await supabase
            .from('early_access_requests')
            .select('status');

        if (error) throw error;

        const counts = { pending: 0, approved: 0, completed: 0 };
        data.forEach(req => {
            if (counts[req.status] !== undefined) {
                counts[req.status]++;
            }
        });

        return counts;
    } catch (err) {
        console.error('Failed to get early access counts:', err);
        return { pending: 0, approved: 0, completed: 0 };
    }
}

/**
 * Approve an early access request (admin only)
 * Generates invitation token and automatically sends invite email
 * @param {string} requestId - UUID of the request
 * @returns {Promise<{success: boolean, email?: string, invitation_token?: string, error?: string}>}
 */
export async function approveEarlyAccessRequest(requestId) {
    try {
        const { data, error } = await supabase
            .rpc('approve_early_access', { p_request_id: requestId });

        if (error) {
            console.error('Error approving early access request:', error);
            return { success: false, error: error.message };
        }

        // Automatically send invite email via Edge Function
        if (data.success && data.email) {
            try {
                const { error: inviteError } = await supabase.functions.invoke('invite-user', {
                    body: { email: data.email }
                });

                if (inviteError) {
                    console.error('Failed to send invite email:', inviteError);
                    // Don't fail the approval, just log the email error
                    return { ...data, emailSent: false, emailError: inviteError.message };
                }

                return { ...data, emailSent: true };
            } catch (emailErr) {
                console.error('Email sending failed:', emailErr);
                return { ...data, emailSent: false, emailError: emailErr.message };
            }
        }

        return data;
    } catch (err) {
        console.error('Failed to approve early access request:', err);
        return { success: false, error: err.message };
    }
}

/**
 * Validate an invitation token (for account completion)
 * @param {string} token - UUID invitation token
 * @returns {Promise<{valid: boolean, email?: string, request_id?: string, error?: string}>}
 */
export async function validateInvitationToken(token) {
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
        return { valid: false, error: err.message };
    }
}

/**
 * Mark early access request as completed (after account creation)
 * @param {string} token - UUID invitation token
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function completeEarlyAccess(token) {
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
        return { success: false, error: err.message };
    }
}

/**
 * Delete an early access request (admin only)
 * @param {string} requestId - UUID of the request
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deleteEarlyAccessRequest(requestId) {
    try {
        const { error } = await supabase
            .from('early_access_requests')
            .delete()
            .eq('id', requestId);

        if (error) {
            console.error('Error deleting early access request:', error);
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (err) {
        console.error('Failed to delete early access request:', err);
        return { success: false, error: err.message };
    }
}
