'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { queryKeys } from '@/lib/query/keys';
import type { Recipe } from '@/types/database';

/**
 * Hook for creating a new recipe with optimistic updates
 */
export function useCreateRecipe() {
    const supabase = createClient();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (recipeData: Partial<Recipe>) => {
            const { data, error } = await supabase
                .from('recipes')
                .insert(recipeData)
                .select()
                .single();

            if (error) throw error;
            return data as Recipe;
        },
        onSuccess: () => {
            // Invalidate and refetch recipes
            queryClient.invalidateQueries({ queryKey: queryKeys.recipes.all });
        },
    });
}

/**
 * Hook for updating a recipe with optimistic updates
 */
export function useUpdateRecipe() {
    const supabase = createClient();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...updates }: Partial<Recipe> & { id: string }) => {
            const { data, error } = await supabase
                .from('recipes')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data as Recipe;
        },
        onMutate: async (updatedRecipe) => {
            // Cancel any outgoing refetches
            await queryClient.cancelQueries({ queryKey: queryKeys.recipes.detail(updatedRecipe.id) });

            // Snapshot the previous value
            const previousRecipe = queryClient.getQueryData(queryKeys.recipes.detail(updatedRecipe.id));

            // Optimistically update the cache
            queryClient.setQueryData(queryKeys.recipes.detail(updatedRecipe.id), (old: Recipe | undefined) => ({
                ...old,
                ...updatedRecipe,
            }));

            return { previousRecipe };
        },
        onError: (_err, updatedRecipe, context) => {
            // Rollback on error
            if (context?.previousRecipe) {
                queryClient.setQueryData(
                    queryKeys.recipes.detail(updatedRecipe.id),
                    context.previousRecipe
                );
            }
        },
        onSettled: (_data, _error, variables) => {
            // Refetch after mutation
            queryClient.invalidateQueries({ queryKey: queryKeys.recipes.detail(variables.id) });
            queryClient.invalidateQueries({ queryKey: queryKeys.recipes.infinite() });
        },
    });
}

/**
 * Hook for deleting a recipe
 */
export function useDeleteRecipe() {
    const supabase = createClient();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('recipes').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            // Invalidate recipes list
            queryClient.invalidateQueries({ queryKey: queryKeys.recipes.all });
        },
    });
}


