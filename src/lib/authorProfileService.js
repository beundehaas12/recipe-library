import { supabase } from './supabase';

// =============================================================================
// AUTHOR PROFILE SERVICE
// =============================================================================
// Manages author-specific profiles (separate from user profiles).
// These are public-facing profiles displayed with recipes.
// =============================================================================

/**
 * Get avatar URL with fallback
 * @param {Object} authorProfile - Author profile object
 * @param {Object} user - User auth object (for fallback seed)
 * @returns {string} Avatar URL or Dicebear fallback
 */
export function getAuthorAvatarUrl(authorProfile, user) {
    if (authorProfile?.avatar_url) {
        return authorProfile.avatar_url;
    }
    // Use Dicebear for consistent placeholder avatars
    const seed = user?.id || 'default';
    return `https://api.dicebear.com/7.x/initials/svg?seed=${authorProfile?.first_name || seed}&backgroundColor=0ea5e9`;
}

/**
 * Fetch the current user's author profile
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function getAuthorProfile() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { data: null, error: new Error('Not authenticated') };

        const { data, error } = await supabase
            .from('author_profiles')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('Error fetching author profile:', error);
            return { data: null, error };
        }

        return { data, error: null };
    } catch (err) {
        console.error('Failed to fetch author profile:', err);
        return { data: null, error: err };
    }
}

/**
 * Fetch an author profile by user ID (for recipe display)
 * @param {string} userId - User's UUID
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function getAuthorProfileById(userId) {
    try {
        const { data, error } = await supabase
            .from('author_profiles')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('Error fetching author profile:', error);
            return { data: null, error };
        }

        return { data, error: null };
    } catch (err) {
        console.error('Failed to fetch author profile:', err);
        return { data: null, error: err };
    }
}

/**
 * Update the current user's author profile
 * @param {Object} updates - Fields to update (first_name, last_name, bio)
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function updateAuthorProfile(updates) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { data: null, error: new Error('Not authenticated') };

        // Only allow specific fields to be updated
        const allowedFields = ['first_name', 'last_name', 'bio', 'metadata'];
        const sanitizedUpdates = {};
        for (const key of allowedFields) {
            if (updates[key] !== undefined) {
                sanitizedUpdates[key] = updates[key];
            }
        }

        // Use upsert to handle case where profile doesn't exist yet
        const { data, error } = await supabase
            .from('author_profiles')
            .upsert({
                user_id: user.id,
                ...sanitizedUpdates,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' })
            .select()
            .single();

        if (error) {
            console.error('Error updating author profile:', error);
            return { data: null, error };
        }

        return { data, error: null };
    } catch (err) {
        console.error('Failed to update author profile:', err);
        return { data: null, error: err };
    }
}

/**
 * Upload a new avatar for the author profile
 * @param {File} file - Image file to upload
 * @returns {Promise<{data: {avatar_url: string}|null, error: Error|null}>}
 */
export async function uploadAuthorAvatar(file) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { data: null, error: new Error('Not authenticated') };

        // Get current profile to check for existing avatar
        const { data: currentProfile } = await getAuthorProfile();

        // Delete old avatar if exists
        if (currentProfile?.avatar_storage_path) {
            await supabase.storage
                .from('author-avatars')
                .remove([currentProfile.avatar_storage_path]);
        }

        // Generate unique filename
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;

        // Upload new avatar
        const { error: uploadError } = await supabase.storage
            .from('author-avatars')
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (uploadError) {
            console.error('Error uploading avatar:', uploadError);
            return { data: null, error: uploadError };
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from('author-avatars')
            .getPublicUrl(fileName);

        // Update profile with new avatar URL
        const { data, error } = await supabase
            .from('author_profiles')
            .upsert({
                user_id: user.id,
                avatar_url: publicUrl,
                avatar_storage_path: fileName,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' })
            .select()
            .single();

        if (error) {
            console.error('Error updating profile with avatar:', error);
            return { data: null, error };
        }

        return { data: { avatar_url: publicUrl }, error: null };
    } catch (err) {
        console.error('Failed to upload author avatar:', err);
        return { data: null, error: err };
    }
}

/**
 * Delete the current author's avatar
 * @returns {Promise<{success: boolean, error: Error|null}>}
 */
export async function deleteAuthorAvatar() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: new Error('Not authenticated') };

        // Get current profile
        const { data: currentProfile } = await getAuthorProfile();

        if (currentProfile?.avatar_storage_path) {
            // Delete from storage
            await supabase.storage
                .from('author-avatars')
                .remove([currentProfile.avatar_storage_path]);
        }

        // Clear avatar fields in profile
        const { error } = await supabase
            .from('author_profiles')
            .update({
                avatar_url: null,
                avatar_storage_path: null,
                updated_at: new Date().toISOString()
            })
            .eq('user_id', user.id);

        if (error) {
            console.error('Error clearing avatar:', error);
            return { success: false, error };
        }

        return { success: true, error: null };
    } catch (err) {
        console.error('Failed to delete author avatar:', err);
        return { success: false, error: err };
    }
}

/**
 * Get author's full display name
 * @param {Object} authorProfile - Author profile object
 * @returns {string} Full name or empty string
 */
export function getAuthorDisplayName(authorProfile) {
    if (!authorProfile) return '';
    const { first_name, last_name } = authorProfile;
    if (first_name && last_name) return `${first_name} ${last_name}`;
    if (first_name) return first_name;
    if (last_name) return last_name;
    return '';
}
