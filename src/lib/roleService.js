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
