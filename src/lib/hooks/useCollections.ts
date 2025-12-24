'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { queryKeys } from '@/lib/query/keys';
import type { Collection, AuthorProfile } from '@/types/database';

interface UseCollectionsOptions {
    initialData?: Collection[];
}

// Helper to fetch author profiles for collections
async function attachAuthorProfiles(collections: Collection[]): Promise<Collection[]> {
    const userIds = [...new Set(collections.map(c => c.user_id).filter(Boolean))];
    if (userIds.length === 0) return collections;

    const supabase = createClient();
    const { data: profiles } = await supabase
        .from('author_profiles')
        .select('user_id, first_name, last_name, avatar_url')
        .in('user_id', userIds);

    const profileMap = (profiles ?? []).reduce((acc, p) => {
        acc[p.user_id] = p;
        return acc;
    }, {} as Record<string, AuthorProfile>);

    return collections.map(c => ({
        ...c,
        author_profile: profileMap[c.user_id] ?? null,
    }));
}

/**
 * Hook for fetching all collections
 */
export function useCollections(options: UseCollectionsOptions = {}) {
    const supabase = createClient();

    return useQuery({
        queryKey: queryKeys.collections.list(),
        queryFn: async () => {
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

            if (error) throw error;

            // Transform to include recipe count and preview images
            const transformed = (data ?? []).map((c) => {
                const validRecipes = c.recipe_collections
                    ?.map((rc: { recipe: { id: string; image_url: string } | null }) => rc.recipe)
                    .filter((r: { id: string; image_url: string } | null) => r) ?? [];

                return {
                    ...c,
                    recipe_count: validRecipes.length,
                    preview_images: validRecipes
                        .map((r: { image_url: string }) => r.image_url)
                        .filter((url: string) => url)
                        .slice(0, 4),
                };
            }) as Collection[];

            // Attach author profiles
            return attachAuthorProfiles(transformed);
        },
        initialData: options.initialData,
    });
}

/**
 * Hook for fetching a single collection by ID
 */
export function useCollection(id: string) {
    const supabase = createClient();

    return useQuery({
        queryKey: queryKeys.collections.detail(id),
        queryFn: async () => {
            const { data, error } = await supabase
                .from('collections')
                .select(`
          *,
          recipe_collections (
            recipe:recipes (*)
          )
        `)
                .eq('id', id)
                .single();

            if (error) throw error;

            const recipes = data.recipe_collections
                ?.map((rc: { recipe: unknown }) => rc.recipe)
                .filter((r: unknown) => r) ?? [];

            // Fetch author profile
            let author_profile = null;
            if (data.user_id) {
                const { data: profile } = await supabase
                    .from('author_profiles')
                    .select('user_id, first_name, last_name, avatar_url')
                    .eq('user_id', data.user_id)
                    .single();
                author_profile = profile;
            }

            return {
                ...data,
                recipes,
                author_profile,
            } as Collection & { recipes: unknown[] };
        },
        enabled: !!id,
    });
}
