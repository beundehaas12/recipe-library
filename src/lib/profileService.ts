import type { UserProfile } from '@/types/database';

/**
 * Get avatar URL with illustration fallback
 */
export function getAvatarUrl(
    profile: UserProfile | null | undefined,
    user?: { id?: string; email?: string }
): string {
    if (profile?.avatar_url) return profile.avatar_url;

    // Illustration fallback using Dicebear
    const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ');
    const seed = fullName || user?.email || user?.id || 'default';
    return `https://api.dicebear.com/9.x/micah/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
}

/**
 * Get user's full display name
 */
export function getUserDisplayName(
    profile: UserProfile | null | undefined
): string {
    if (!profile) return '';
    const { first_name, last_name } = profile;
    if (first_name && last_name) return `${first_name} ${last_name}`;
    if (first_name) return first_name;
    if (last_name) return last_name;
    return '';
}
