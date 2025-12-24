import { createClient } from '@/lib/supabase/server';
import type { Recipe, Collection, AuthorProfile } from '@/types/database';

/**
 * Fetch author profile by user ID
 */
export async function getAuthorProfile(userId: string): Promise<AuthorProfile | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('author_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (error || !data) {
        console.error('Error fetching author profile:', error);
        return null;
    }

    return data;
}

/**
 * Fetch all recipes created by an author
 */
export async function getAuthorRecipes(userId: string): Promise<Recipe[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error || !data) {
        console.error('Error fetching author recipes:', error);
        return [];
    }

    // Fetch author profile
    const authorProfile = await getAuthorProfile(userId);

    // Attach author profile to each recipe
    return data.map((recipe) => ({
        ...recipe,
        author_profile: authorProfile,
    }));
}

/**
 * Fetch all collections created by an author
 */
export async function getAuthorCollections(userId: string): Promise<Collection[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('collections')
        .select(`
            *,
            recipe_collections (
                recipe:recipes (image_url)
            )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error || !data) {
        console.error('Error fetching author collections:', error);
        return [];
    }

    // Fetch author profile
    const authorProfile = await getAuthorProfile(userId);

    // Process preview images for each collection and attach author profile
    return data.map((collection: any) => {
        const previewImages = collection.recipe_collections
            ?.map((rc: any) => rc.recipe?.image_url)
            .filter(Boolean)
            .slice(0, 4) || [];

        return {
            ...collection,
            recipe_count: collection.recipe_collections?.length || 0,
            preview_images: previewImages,
            author_profile: authorProfile,
        };
    });
}
