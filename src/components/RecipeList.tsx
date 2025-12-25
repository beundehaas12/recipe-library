'use client';

import { Search, CookingPot, Camera, Link as LinkIcon } from 'lucide-react';
import { translations as t } from '@/lib/translations';
import RecipeThumbnail from './RecipeThumbnail';
import CollectionCard from './CollectionCard';
import type { Recipe, Collection } from '@/types/database';

interface RecipeListProps {
    recipes: Recipe[];
    collections?: Collection[];
    isEmptyState?: boolean;
    isNoResults?: boolean;
    searchQuery?: string;
    loading?: boolean;
}

export default function RecipeList({
    recipes,
    collections = [],
    isEmptyState,
    isNoResults,
    searchQuery,
    loading
}: RecipeListProps) {
    // -------------------------------------------------------------------------
    // VIEW: LOADING STATE (Skeleton)
    // -------------------------------------------------------------------------
    if (loading) {
        return (
            <div className="relative pt-4 pb-12">
                {/* Header Skeleton */}
                <div className="px-0 md:px-4 lg:px-20 mb-4 md:mb-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-48 bg-white/5 rounded-lg animate-pulse" />
                            <div className="h-6 w-12 bg-white/5 rounded-md animate-pulse" />
                        </div>
                    </div>
                </div>

                {/* Grid Skeleton */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-0.5 md:gap-1 lg:gap-2 px-0 md:px-4 lg:px-20">
                    {Array.from({ length: 12 }).map((_, i) => (
                        <div key={i} className="w-full">
                            <div className="relative aspect-[2/3] bg-white/5 rounded-[2px] md:rounded lg:rounded-lg overflow-hidden animate-pulse">
                                {/* Image Placeholder */}
                                <div className="absolute inset-0 bg-white/5" />

                                {/* Content Overlay Placeholder */}
                                <div className="absolute bottom-0 left-0 right-0 p-5 space-y-3">
                                    <div className="h-6 w-3/4 bg-white/10 rounded" />
                                    <div className="flex gap-2">
                                        <div className="h-4 w-1/3 bg-white/10 rounded" />
                                        <div className="h-4 w-1/4 bg-white/10 rounded" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // Mix collections and recipes for the main view
    const itemsToDisplay = [
        ...collections.map(c => ({ ...c, type: 'collection' as const })),
        ...recipes.map(r => ({ ...r, type: 'recipe' as const }))
    ];

    // -------------------------------------------------------------------------
    // VIEW: EMPTY STATE (No recipes and No collections)
    // -------------------------------------------------------------------------
    if (isEmptyState && collections.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-8">
                <div className="w-32 h-32 bg-secondary/30 rounded-full flex items-center justify-center mb-8 border border-white/5 shadow-2xl animate-pulse">
                    <CookingPot size={64} className="text-muted-foreground/50" strokeWidth={1} />
                </div>
                <h3 className="text-3xl font-bold text-white mb-4 tracking-tight">{t.noRecipes}</h3>
                <p className="text-muted-foreground max-w-md mb-10 text-lg leading-relaxed">{t.noRecipesDesc}</p>

                <div className="flex flex-wrap gap-4 justify-center">
                    <div className="flex items-center gap-3 px-6 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-white transition-all cursor-pointer backdrop-blur-md">
                        <Camera size={20} className="text-primary" />
                        <span className="font-medium">{t.takePhoto}</span>
                    </div>
                    <div className="flex items-center gap-3 px-6 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-white transition-all cursor-pointer backdrop-blur-md">
                        <LinkIcon size={20} className="text-primary" />
                        <span className="font-medium">{t.fromUrl}</span>
                    </div>
                </div>
            </div>
        );
    }

    // -------------------------------------------------------------------------
    // VIEW: NO SEARCH RESULTS
    // -------------------------------------------------------------------------
    if (isNoResults) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[40vh] text-center p-8">
                <Search size={48} className="text-muted-foreground mb-4 opacity-50" strokeWidth={1} />
                <h3 className="text-xl font-bold text-white mb-2">{t.noResults}</h3>
                <p className="text-muted-foreground">
                    {t.noResultsDesc} <span className="text-primary">"{searchQuery}"</span>
                </p>
            </div>
        );
    }

    // -------------------------------------------------------------------------
    // VIEW: MAIN GRID (Recipes + Collections)
    // -------------------------------------------------------------------------
    return (
        <div className="relative pt-4 pb-12">
            {/* Header - Hidden when showing search results */}
            {!searchQuery && (
                <div className="px-4 lg:px-20 mb-4 md:mb-8">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-3">
                            {t.myCookbook}
                            <span className="text-sm font-bold text-muted-foreground/60 bg-white/5 px-2 py-1 rounded-md border border-white/5">
                                {recipes.length}
                            </span>
                        </h2>
                    </div>
                </div>
            )}

            {/* Grid Container */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-0.5 md:gap-1 lg:gap-2 px-0 md:px-4 lg:px-20">
                {itemsToDisplay.map((item) => (
                    <div
                        key={item.id}
                        className="w-full"
                    >
                        {item.type === 'collection' ? (
                            <CollectionCard
                                collection={item as Collection}
                                recipeCount={(item as Collection).recipe_count}
                            />
                        ) : (
                            <RecipeThumbnail recipe={item as Recipe} />
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
