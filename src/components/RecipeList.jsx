import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, CookingPot, Camera, Link as LinkIcon, ChevronRight, ChevronLeft } from 'lucide-react';
import { translations as t } from '../lib/translations';
import RecipeThumbnail from './RecipeThumbnail';
import CollectionCard from './CollectionCard';
import { supabase } from '../lib/supabase';

export default function RecipeList({ recipes, collections = [], isEmptyState, isNoResults, searchQuery }) {
    const [activeCollectionId, setActiveCollectionId] = useState(null);
    const [collectionRecipes, setCollectionRecipes] = useState([]);
    const [isLoadingCollection, setIsLoadingCollection] = useState(false);

    // Filter recipes for active collection
    useEffect(() => {
        if (activeCollectionId) {
            fetchCollectionRecipes();
        }
    }, [activeCollectionId]);

    const fetchCollectionRecipes = async () => {
        setIsLoadingCollection(true);
        try {
            // First get the recipe IDs in this collection
            const { data: relations, error } = await supabase
                .from('recipe_collections')
                .select('recipe_id')
                .eq('collection_id', activeCollectionId);

            if (error) throw error;

            const recipeIds = relations.map(r => r.recipe_id);
            // We use the passed 'recipes' prop as the source of truth for recipe objects
            // This assumes all recipes are already loaded in the parent. 
            // If pagination is used later, we might need a direct DB fetch here.
            // For now, filtering the client-side list is efficient enough.
            const filtered = recipes.filter(r => recipeIds.includes(r.id));
            setCollectionRecipes(filtered);
        } catch (err) {
            console.error('Error fetching collection recipes:', err);
        } finally {
            setIsLoadingCollection(false);
        }
    };

    // Derived state for display
    const activeCollection = activeCollectionId ? collections.find(c => c.id === activeCollectionId) : null;

    // Mix collections and recipes for the main view
    const itemsToDisplay = activeCollectionId
        ? collectionRecipes.map(r => ({ ...r, type: 'recipe' }))
        : [
            ...collections.map(c => ({ ...c, type: 'collection' })),
            ...recipes.map(r => ({ ...r, type: 'recipe' }))
        ];

    // -------------------------------------------------------------------------
    // VIEW: ACTIVE COLLECTION
    // -------------------------------------------------------------------------
    if (activeCollectionId) {
        return (
            <div className="relative min-h-screen pb-20">
                {/* Floating Header (Like RecipeCard) */}
                <header className="fixed top-20 left-0 right-0 z-40 pointer-events-none px-4 lg:px-20 py-4">
                    <div className="max-w-[1600px] mx-auto w-full flex justify-between items-center px-0">
                        <button
                            onClick={() => setActiveCollectionId(null)}
                            className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white border border-white/10 hover:bg-black/60 transition-colors pointer-events-auto"
                        >
                            <ChevronLeft size={20} />
                        </button>
                    </div>
                </header>

                {/* Hero Title Section */}
                <div className="px-0 md:px-4 lg:px-20 pt-12 mb-12">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="max-w-4xl space-y-4"
                    >
                        <div className="flex items-center gap-3">
                            <span className="px-3 py-1 bg-white/10 backdrop-blur-md text-white/90 text-[10px] font-bold uppercase tracking-widest rounded-md border border-white/10">
                                {t.collection}
                            </span>
                            <span className="px-3 py-1 bg-white/5 backdrop-blur-md text-white/70 text-[10px] font-bold uppercase tracking-widest rounded-md border border-white/5">
                                {collectionRecipes.length} recept{collectionRecipes.length !== 1 ? 'en' : ''}
                            </span>
                        </div>

                        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white leading-[0.85] drop-shadow-2xl font-display uppercase">
                            {activeCollection?.name}
                        </h1>
                    </motion.div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-0.5 md:gap-1 lg:gap-2 px-0 md:px-4 lg:px-20">
                    {itemsToDisplay.map(recipe => (
                        <div key={recipe.id} className="w-full">
                            <RecipeThumbnail recipe={recipe} t={t} />
                        </div>
                    ))}
                    {itemsToDisplay.length === 0 && !isLoadingCollection && (
                        <div className="col-span-full py-20 text-center text-muted-foreground">
                            {t.noRecipesInCollection}
                        </div>
                    )}
                </div>
            </div>
        );
    }

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
            {/* Header - Aligned with Grid */}
            <div className="px-0 md:px-4 lg:px-20 mb-4 md:mb-8">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-3">
                        {t.myCookbook}
                        <span className="text-sm font-bold text-muted-foreground/60 bg-white/5 px-2 py-1 rounded-md border border-white/5">
                            {recipes.length}
                        </span>
                    </h2>
                </div>
            </div>

            {/* Grid Container - Edge-to-edge on mobile, padded on larger screens */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-0.5 md:gap-1 lg:gap-2 px-0 md:px-4 lg:px-20">
                {itemsToDisplay.map((item) => (
                    <div
                        key={item.id}
                        className="w-full"
                    >
                        {item.type === 'collection' ? (
                            <CollectionCard
                                collection={item}
                                recipeCount={item.recipe_count}
                                onClick={() => setActiveCollectionId(item.id)}
                            />
                        ) : (
                            <RecipeThumbnail recipe={item} t={t} />
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
