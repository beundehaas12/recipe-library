'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChefHat, Search, ArrowRight, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import type { Recipe, Collection, UserProfile } from '@/types/database';
import { translations as t } from '@/lib/translations';
import { useRecipes, useRecipeSearch } from '@/lib/hooks/useRecipes';
import { useCollections } from '@/lib/hooks/useCollections';
import RecipeList from '@/components/RecipeList';
import MainLayout from '@/components/MainLayout';

interface HomePageProps {
    initialRecipes: Recipe[];
    initialCollections: Collection[];
    user: User;
    profile?: UserProfile | null;
    role?: 'user' | 'author' | 'admin' | null;
}

export default function HomePage({ initialRecipes, initialCollections, user, profile, role }: HomePageProps) {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');

    // Use TanStack Query with initial data from server
    const { data: recipesData } = useRecipes({ initialData: initialRecipes });
    const { data: collections } = useCollections({ initialData: initialCollections });
    const { data: searchResults, isFetching: isSearching } = useRecipeSearch(searchQuery);

    // Flatten infinite query pages
    const recipes = useMemo(() => {
        return recipesData?.pages.flat() ?? initialRecipes;
    }, [recipesData, initialRecipes]);

    // Display logic
    const displayRecipes = useMemo(() => {
        if (!searchQuery.trim()) return recipes;
        if (searchResults && searchResults.length > 0) return searchResults;
        // Local filter as fallback while searching
        const query = searchQuery.toLowerCase();
        return recipes.filter(recipe =>
            recipe.title?.toLowerCase().includes(query) ||
            recipe.description?.toLowerCase().includes(query) ||
            recipe.author?.toLowerCase().includes(query)
        );
    }, [searchQuery, searchResults, recipes]);

    const heroRecipe = !searchQuery && recipes.length > 0 ? recipes[0] : null;
    const isEmptyState = recipes.length === 0 && !searchQuery;
    const isNoResults = searchQuery && displayRecipes.length === 0;

    return (
        <div className="min-h-screen bg-background text-foreground pb-20 selection:bg-primary selection:text-white">
            {/* App Header - Mobile & Desktop Navigation */}
            {/* App Header & Floating Menu handled by MainLayout */}
            <MainLayout
                user={user}
                profile={profile}
                role={role}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
            >

                {/* Helper Badge for Searching State Only */}
                <AnimatePresence>
                    {isSearching && (
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 flex items-center gap-2"
                        >
                            <Loader2 className="animate-spin text-primary" size={16} />
                            <span className="text-xs font-bold text-white uppercase tracking-wider">
                                Zoeken...
                            </span>
                        </motion.div>
                    )}
                </AnimatePresence>

                <main className="relative min-h-screen">
                    {/* Hero Section - Hide when searching */}
                    {!searchQuery && (
                        <div className="relative w-full h-[75vh] md:h-[85vh] overflow-hidden">
                            {/* Background */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 1 }}
                                className="absolute inset-0 z-0"
                                style={{ willChange: 'opacity' }}
                            >
                                {heroRecipe?.image_url ? (
                                    <img
                                        src={heroRecipe.image_url}
                                        className="w-full h-full object-cover"
                                        alt={heroRecipe.title}
                                    />
                                ) : (
                                    <div className="w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/40 via-[#000000] to-[#000000]" />
                                )}

                                {/* Cinematic Vignettes */}
                                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent z-10" />
                                <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/20 to-transparent z-10" />
                            </motion.div>

                            {/* Hero Content */}
                            <div className="absolute bottom-0 left-0 right-0 z-20 pb-12 pointer-events-none">
                                <div className="max-w-[1600px] mx-auto px-4 lg:px-20 w-full flex flex-col items-start gap-4">
                                    {heroRecipe ? (
                                        <>
                                            <motion.div
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.2 }}
                                                className="flex flex-wrap gap-3 items-center pointer-events-auto"
                                            >
                                                <span className="px-3 py-1 rounded-md bg-white/10 backdrop-blur-md border border-white/10 text-white/90 text-[10px] md:text-xs font-bold uppercase tracking-widest shadow-lg">
                                                    {t.latestDiscovery}
                                                </span>
                                                {heroRecipe.cuisine && (
                                                    <span className="text-white/60 text-sm font-medium border-l border-white/20 pl-3 uppercase tracking-wider">
                                                        {heroRecipe.cuisine}
                                                    </span>
                                                )}
                                            </motion.div>

                                            <motion.h2
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.3 }}
                                                className="text-5xl md:text-7xl lg:text-9xl font-black text-white leading-[0.85] drop-shadow-2xl font-display max-w-4xl pointer-events-auto"
                                            >
                                                {heroRecipe.title}
                                            </motion.h2>

                                            <motion.p
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.4 }}
                                                className="text-gray-200 text-lg md:text-xl line-clamp-3 max-w-2xl drop-shadow-md font-medium leading-relaxed pointer-events-auto"
                                            >
                                                {heroRecipe.description || ''}
                                            </motion.p>

                                            <motion.div
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.5 }}
                                                className="flex items-center gap-4 mt-2 pointer-events-auto"
                                            >
                                                <button
                                                    onClick={() => router.push(`/recipe/${heroRecipe.id}`)}
                                                    className="btn-primary !px-10 !py-5 !text-black font-black uppercase tracking-widest flex items-center gap-4 text-sm group/btn shadow-2xl shadow-primary/20 active:scale-95"
                                                >
                                                    <span>{t.startCooking}</span>
                                                    <ArrowRight size={20} className="group-hover/btn:translate-x-1 transition-transform" />
                                                </button>
                                            </motion.div>
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-start gap-4 pointer-events-auto">
                                            <h1 className="text-6xl font-black text-white mb-4 leading-tight">{t.appTitle}</h1>
                                            <p className="text-xl text-gray-400 max-w-md">Jouw culinaire reis begint hier. Scan recepten en ontdek nieuwe smaken.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Content Area */}
                    <div className={`relative z-20 space-y-12 pb-24 bg-background max-w-[1600px] mx-auto ${searchQuery ? 'pt-32' : 'pt-6'}`}>
                        {isEmptyState ? (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex flex-col items-center justify-center py-20 text-center"
                            >
                                <div className="w-32 h-32 bg-gradient-to-tr from-gray-800 to-gray-900 rounded-[2rem] flex items-center justify-center mb-8 shadow-2xl border border-white/5 transform rotate-3">
                                    <ChefHat size={64} className="text-white/20" />
                                </div>
                                <h2 className="text-4xl font-black text-white mb-4 tracking-tight">{t.welcome}</h2>
                                <p className="text-lg text-muted-foreground max-w-md mx-auto leading-relaxed mb-8">
                                    {t.startAdding}
                                </p>
                                <p className="text-sm text-white/30 uppercase tracking-widest font-bold">
                                    Klik op + om te beginnen
                                </p>
                            </motion.div>
                        ) : isNoResults ? (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex flex-col items-center justify-center py-20 text-center"
                            >
                                <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6">
                                    <Search size={40} className="text-white/20" />
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-2">{t.noResults}</h3>
                                <p className="text-muted-foreground">{t.tryDifferentTerm}</p>
                            </motion.div>
                        ) : (
                            <>
                                {searchQuery && (
                                    <motion.h3
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="text-2xl font-bold text-white mb-8 flex items-center gap-3 px-4"
                                    >
                                        Zoekresultaten
                                        <span className="text-primary bg-primary/10 px-3 py-1 rounded-full text-sm">
                                            {displayRecipes.length}
                                        </span>
                                    </motion.h3>
                                )}
                                <RecipeList
                                    recipes={searchQuery ? displayRecipes : recipes.slice(1)}
                                    collections={!searchQuery ? (collections ?? []) : []}
                                />
                            </>
                        )}
                    </div>
                </main>
            </MainLayout>
        </div>
    );
}
