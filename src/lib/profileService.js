import { supabase } from './supabase';

// =============================================================================
// USER PROFILE SERVICE
// =============================================================================
// Manages user profiles, preferences, and account operations.
// =============================================================================

/**
 * Fetch the current user's profile
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
/**
 * Get avatar URL with illustration fallback
 * @param {Object} profile - User profile object
 * @param {Object} user - User auth object
 * @returns {string} Public URL or Dicebear fallback
 */
export function getAvatarUrl(profile, user) {
    if (profile?.avatar_url) return profile.avatar_url;

    // Illustration fallback using Dicebear (Notionists style)
    // Use Dicebear API for consistent avatar generation
    // Using 'micah' style for a clean, modern, and friendly look
    // See: https://www.dicebear.com/styles/micah/
    // Use metadata seed if available (for manual randomization), otherwise fallback to stable identifiers
    const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ');
    const seed = profile?.metadata?.avatar_seed || fullName || user?.email || user?.id || 'default';
    return `https://api.dicebear.com/9.x/micah/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
}

export async function getUserProfile() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { data: null, error: new Error('Not authenticated') };

        const { data, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('Error fetching profile:', error);
            return { data: null, error };
        }

        return { data, error: null };
    } catch (err) {
        console.error('Failed to fetch profile:', err);
        return { data: null, error: err };
    }
}

/**
 * Update the current user's profile
 * @param {Object} updates - Fields to update (first_name, last_name, bio, metadata)
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function updateUserProfile(updates) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { data: null, error: new Error('Not authenticated') };

        // Filter to allowed fields
        const allowedFields = ['first_name', 'last_name', 'bio', 'metadata'];
        const safeUpdates = {};
        for (const key of allowedFields) {
            if (updates[key] !== undefined) {
                safeUpdates[key] = updates[key];
            }
        }

        const { data, error } = await supabase
            .from('user_profiles')
            .update(safeUpdates)
            .eq('user_id', user.id)
            .select()
            .single();

        if (error) {
            console.error('Error updating profile:', error);
            return { data: null, error };
        }

        return { data, error: null };
    } catch (err) {
        console.error('Failed to update profile:', err);
        return { data: null, error: err };
    }
}

/**
 * Upload a new avatar for the current user
 * @param {File} file - Image file to upload
 * @returns {Promise<{data: {avatar_url: string}|null, error: Error|null}>}
 */
export async function uploadAvatar(file) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { data: null, error: new Error('Not authenticated') };

        // Get current profile to check for existing avatar
        const { data: profile } = await supabase
            .from('user_profiles')
            .select('avatar_storage_path')
            .eq('user_id', user.id)
            .single();

        // Delete old avatar if exists
        if (profile?.avatar_storage_path) {
            await supabase.storage
                .from('recipe-images')
                .remove([profile.avatar_storage_path]);
        }

        // Create unique filename
        const ext = file.name.split('.').pop().toLowerCase();
        const filename = `avatars/${user.id}/${Date.now()}.${ext}`;

        // Upload new avatar
        const { error: uploadError } = await supabase.storage
            .from('recipe-images')
            .upload(filename, file, {
                contentType: file.type,
                upsert: false
            });

        if (uploadError) {
            console.error('Avatar upload error:', uploadError);
            return { data: null, error: uploadError };
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from('recipe-images')
            .getPublicUrl(filename);

        // Update profile with new avatar
        const { data, error } = await supabase
            .from('user_profiles')
            .update({
                avatar_url: publicUrl,
                avatar_storage_path: filename
            })
            .eq('user_id', user.id)
            .select()
            .single();

        if (error) {
            // Cleanup uploaded file on profile update failure
            await supabase.storage.from('recipe-images').remove([filename]);
            return { data: null, error };
        }

        return { data: { avatar_url: publicUrl }, error: null };
    } catch (err) {
        console.error('Failed to upload avatar:', err);
        return { data: null, error: err };
    }
}

/**
 * Delete the current user's avatar
 * @returns {Promise<{success: boolean, error: Error|null}>}
 */
export async function deleteAvatar() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: new Error('Not authenticated') };

        // Get current storage path
        const { data: profile } = await supabase
            .from('user_profiles')
            .select('avatar_storage_path')
            .eq('user_id', user.id)
            .single();

        if (profile?.avatar_storage_path) {
            await supabase.storage
                .from('recipe-images')
                .remove([profile.avatar_storage_path]);
        }

        // Clear avatar in profile
        const { error } = await supabase
            .from('user_profiles')
            .update({ avatar_url: null, avatar_storage_path: null })
            .eq('user_id', user.id);

        if (error) {
            return { success: false, error };
        }

        return { success: true, error: null };
    } catch (err) {
        console.error('Failed to delete avatar:', err);
        return { success: false, error: err };
    }
}

// =============================================================================
// USER PREFERENCES
// =============================================================================

/**
 * Fetch the current user's preferences
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function getUserPreferences() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { data: null, error: new Error('Not authenticated') };

        const { data, error } = await supabase
            .from('user_preferences')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('Error fetching preferences:', error);
            return { data: null, error };
        }

        return { data, error: null };
    } catch (err) {
        console.error('Failed to fetch preferences:', err);
        return { data: null, error: err };
    }
}

/**
 * Update the current user's preferences
 * @param {Object} updates - Fields to update (theme, language, email_notifications, preferences)
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function updateUserPreferences(updates) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { data: null, error: new Error('Not authenticated') };

        // Filter to allowed fields
        const allowedFields = ['theme', 'language', 'email_notifications', 'preferences'];
        const safeUpdates = {};
        for (const key of allowedFields) {
            if (updates[key] !== undefined) {
                safeUpdates[key] = updates[key];
            }
        }

        const { data, error } = await supabase
            .from('user_preferences')
            .update(safeUpdates)
            .eq('user_id', user.id)
            .select()
            .single();

        if (error) {
            console.error('Error updating preferences:', error);
            return { data: null, error };
        }

        return { data, error: null };
    } catch (err) {
        console.error('Failed to update preferences:', err);
        return { data: null, error: err };
    }
}

// =============================================================================
// ACCOUNT MANAGEMENT
// =============================================================================

/**
 * Get full user account data (profile + preferences + role) in one call
 * Uses the database function for efficiency
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function getUserAccount() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { data: null, error: new Error('Not authenticated') };

        const { data, error } = await supabase
            .rpc('get_user_account', { p_user_id: user.id });

        if (error) {
            console.error('Error fetching account:', error);
            return { data: null, error };
        }

        return { data, error: null };
    } catch (err) {
        console.error('Failed to fetch account:', err);
        return { data: null, error: err };
    }
}

/**
 * Request account deletion (soft delete with audit trail)
 * @param {string} reason - Optional reason for deletion
 * @returns {Promise<{success: boolean, message: string, error: Error|null}>}
 */
export async function requestAccountDeletion(reason = null) {
    try {
        const { data, error } = await supabase
            .rpc('request_account_deletion', { p_reason: reason });

        if (error) {
            console.error('Error requesting deletion:', error);
            return { success: false, message: '', error };
        }

        return {
            success: data?.success || false,
            message: data?.message || data?.error || '',
            error: null
        };
    } catch (err) {
        console.error('Failed to request account deletion:', err);
        return { success: false, message: '', error: err };
    }
}
