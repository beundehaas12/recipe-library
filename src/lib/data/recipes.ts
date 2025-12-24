import { createClient } from '@/lib/supabase/server';
import type { Recipe, Collection, AuthorProfile } from '@/types/database';

/**
 * Fetch initial recipes for SSR (first page only)
 */
export async function getRecipes(limit = 20): Promise<Recipe[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .range(0, limit - 1)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching recipes:', error);
        return [];
    }

    // Fetch author profiles
    const userIds = [...new Set((data ?? []).map((r) => r.user_id).filter(Boolean))];
    const profileMap = await getAuthorProfiles(userIds);

    return (data ?? []).map((r) => ({
        ...r,
        author_profile: profileMap[r.user_id] ?? null,
    }));
}

/**
 * Fetch a single recipe by ID for SSR
 */
export async function getRecipe(id: string): Promise<Recipe | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        console.error('Error fetching recipe:', error);
        return null;
    }

    // Fetch author profile
    if (data.user_id) {
        const profileMap = await getAuthorProfiles([data.user_id]);
        return {
            ...data,
            author_profile: profileMap[data.user_id] ?? null,
        };
    }

    return data;
}

/**
 * Fetch collections for SSR
 */
export async function getCollections(): Promise<Collection[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('collections')
        .select(`
      *,
      recipe_collections (
        recipe:recipes (
          id,
          image_url
        )
      )
    `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching collections:', error);
        return [];
    }

    // Fetch author profiles
    const userIds = [...new Set((data ?? []).map((c) => c.user_id).filter(Boolean))];
    const profileMap = await getAuthorProfiles(userIds);

    return (data ?? []).map((c) => {
        const validRecipes = c.recipe_collections
            ?.map((rc: { recipe: { id: string; image_url: string } | null }) => rc.recipe)
            .filter((r: { id: string; image_url: string } | null) => r) ?? [];

        return {
            ...c,
            author_profile: profileMap[c.user_id] ?? null,
            recipe_count: validRecipes.length,
            preview_images: validRecipes
                .map((r: { image_url: string }) => r.image_url)
                .filter((url: string) => url)
                .slice(0, 4),
        };
    });
}

/**
 * Fetch author profiles by user IDs
 */
async function getAuthorProfiles(userIds: string[]): Promise<Record<string, AuthorProfile>> {
    if (userIds.length === 0) return {};

    const supabase = await createClient();

    const { data, error } = await supabase
        .from('author_profiles')
        .select('user_id, first_name, last_name, avatar_url')
        .in('user_id', userIds);

    if (error) {
        console.error('Error fetching author profiles:', error);
        return {};
    }

    return (data ?? []).reduce((acc, p) => {
        acc[p.user_id] = p;
        return acc;
    }, {} as Record<string, AuthorProfile>);
}
