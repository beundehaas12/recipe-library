/**
 * Query key factory for type-safe cache invalidation
 */
export const queryKeys = {
    // Recipes
    recipes: {
        all: ['recipes'] as const,
        list: () => [...queryKeys.recipes.all, 'list'] as const,
        infinite: () => [...queryKeys.recipes.all, 'infinite'] as const,
        detail: (id: string) => [...queryKeys.recipes.all, 'detail', id] as const,
        search: (query: string) => [...queryKeys.recipes.all, 'search', query] as const,
    },

    // Collections
    collections: {
        all: ['collections'] as const,
        list: () => [...queryKeys.collections.all, 'list'] as const,
        detail: (id: string) => [...queryKeys.collections.all, 'detail', id] as const,
    },

    // User
    user: {
        all: ['user'] as const,
        profile: () => [...queryKeys.user.all, 'profile'] as const,
    },

    // Author profiles
    authors: {
        all: ['authors'] as const,
        byIds: (ids: string[]) => [...queryKeys.authors.all, 'byIds', ids] as const,
    },
};
