import type { AuthorProfile } from '@/types/database';

/**
 * Get avatar URL with fallback
 */
export function getAuthorAvatarUrl(
    authorProfile: AuthorProfile | null | undefined,
    user?: { id?: string }
): string {
    if (authorProfile?.avatar_url) {
        return authorProfile.avatar_url;
    }
    // Use Dicebear for consistent placeholder avatars
    const seed = user?.id || 'default';
    return `https://api.dicebear.com/7.x/initials/svg?seed=${authorProfile?.first_name || seed}&backgroundColor=0ea5e9`;
}

/**
 * Get author's full display name
 */
export function getAuthorDisplayName(
    authorProfile: AuthorProfile | null | undefined
): string {
    if (!authorProfile) return '';
    const { first_name, last_name } = authorProfile;
    if (first_name && last_name) return `${first_name} ${last_name}`;
    if (first_name) return first_name;
    if (last_name) return last_name;
    return '';
}
