import { supabase } from './supabase';

/**
 * Log a user activity
 * @param {string} userId 
 * @param {string} type - 'create_recipe', 'update_recipe', etc.
 * @param {string} description - Human readable description
 * @param {Object} metadata - Extra data (e.g. { recipeId: '...' })
 */
export async function logActivity(userId, type, description, metadata = {}) {
    try {
        const { error } = await supabase.from('user_activities').insert({
            user_id: userId,
            type,
            description,
            metadata
        });
        if (error) throw error;
    } catch (error) {
        console.error('Failed to log activity:', error);
        // We do not throw here to prevent blocking the main action
    }
}

/**
 * Fetch activities for a user
 * @param {string} userId 
 * @param {number} limit 
 */
export async function fetchActivities(userId, limit = 50) {
    const { data, error } = await supabase
        .from('user_activities')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) throw error;
    return data || [];
}

/**
 * Get count of unread activities
 * @param {string} userId 
 */
export async function getUnreadCount(userId) {
    const { count, error } = await supabase
        .from('user_activities')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false);

    if (error) return 0;
    return count || 0;
}

/**
 * Mark all activities as read for a user
 * @param {string} userId 
 */
export async function markAllAsRead(userId) {
    const { error } = await supabase
        .from('user_activities')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false);

    if (error) throw error;
}
