'use client';

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { queryKeys } from '@/lib/query/keys';
import type { Recipe, AuthorProfile } from '@/types/database';

const PAGE_SIZE = 20;

interface UseRecipesOptions {
    initialData?: Recipe[];
}

// Helper to fetch author profiles for recipes
async function attachAuthorProfiles(recipes: Recipe[]): Promise<Recipe[]> {
    const userIds = [...new Set(recipes.map(r => r.user_id).filter(Boolean))];
    if (userIds.length === 0) return recipes;

    const supabase = createClient();
    const { data: profiles } = await supabase
        .from('author_profiles')
        .select('user_id, first_name, last_name, avatar_url')
        .in('user_id', userIds);

    const profileMap = (profiles ?? []).reduce((acc, p) => {
        acc[p.user_id] = p;
        return acc;
    }, {} as Record<string, AuthorProfile>);

    return recipes.map(r => ({
        ...r,
        author_profile: profileMap[r.user_id] ?? null,
    }));
}

/**
 * Hook for fetching paginated recipes with infinite scroll
 */
export function useRecipes(options: UseRecipesOptions = {}) {
    const supabase = createClient();

    return useInfiniteQuery({
        queryKey: queryKeys.recipes.infinite(),
        queryFn: async ({ pageParam = 0 }) => {
            const { data, error } = await supabase
                .from('recipes')
                .select('*')
                .range(pageParam, pageParam + PAGE_SIZE - 1)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Attach author profiles
            return attachAuthorProfiles(data ?? []);
        },
        initialPageParam: 0,
        getNextPageParam: (lastPage, allPages) =>
            lastPage.length === PAGE_SIZE ? allPages.length * PAGE_SIZE : undefined,
        initialData: options.initialData
            ? { pages: [options.initialData], pageParams: [0] }
            : undefined,
    });
}

/**
 * Hook for fetching a single recipe by ID
 */
export function useRecipe(id: string) {
    const supabase = createClient();

    return useQuery({
        queryKey: queryKeys.recipes.detail(id),
        queryFn: async () => {
            const { data, error } = await supabase
                .from('recipes')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;

            // Attach author profile
            if (data.user_id) {
                const { data: profile } = await supabase
                    .from('author_profiles')
                    .select('user_id, first_name, last_name, avatar_url')
                    .eq('user_id', data.user_id)
                    .single();

                return {
                    ...data,
                    author_profile: profile ?? null,
                } as Recipe;
            }

            return data as Recipe;
        },
        enabled: !!id,
    });
}

/**
 * Hook for searching recipes
 */
export function useRecipeSearch(query: string) {
    const supabase = createClient();

    return useQuery({
        queryKey: queryKeys.recipes.search(query),
        queryFn: async () => {
            if (!query.trim()) return [];

            const { data, error } = await supabase
                .from('recipes')
                .select('*')
                .textSearch('search_vector', query, { type: 'websearch', config: 'simple' })
                .order('created_at', { ascending: false });

            if (error) {
                // Fallback to ILIKE search
                const { data: fallbackData, error: fallbackError } = await supabase
                    .from('recipes')
                    .select('*')
                    .or(`title.ilike.%${query}%,description.ilike.%${query}%,author.ilike.%${query}%`)
                    .order('created_at', { ascending: false });

                if (fallbackError) throw fallbackError;
                return attachAuthorProfiles(fallbackData ?? []);
            }

            return attachAuthorProfiles(data ?? []);
        },
        enabled: !!query.trim(),
    });
}
