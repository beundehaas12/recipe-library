'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { User } from '@supabase/supabase-js';
import type { Recipe, Collection, UserProfile } from '@/types/database';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { ChefHat, Clock, LayoutGrid, ImageIcon, PanelLeftClose, Grid3X3, Users, ExternalLink } from 'lucide-react';

interface DashboardClientProps {
    user: User;
    profile: UserProfile | null;
    role: 'user' | 'author' | 'admin' | null;
    isAdmin: boolean;
    initialRecipes: Recipe[];
    initialCollections: Collection[];
}

export default function DashboardClient({
    user,
    profile,
    role,
    isAdmin,
    initialRecipes,
    initialCollections
}: DashboardClientProps) {
    const [activeFilter, setActiveFilter] = useState('all');
    const [viewMode, setViewMode] = useState<'split' | 'grid'>('split');
    const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(initialRecipes[0] || null);
    const [recipes] = useState(initialRecipes);
    const [collections] = useState(initialCollections);

    // Filter recipes based on active filter
    const filteredRecipes = useMemo(() => {
        switch (activeFilter) {
            case 'drafts':
                return recipes.filter(r => r.status === 'processing' || r.status === 'draft');
            case 'recent':
                return recipes.slice(0, 10);
            case 'overview':
                return []; // Overview doesn't show recipes
            default:
                if (activeFilter !== 'all') {
                    return recipes;
                }
                return recipes;
        }
    }, [activeFilter, recipes]);

    // Show overview/stats page
    const showOverview = activeFilter === 'overview';

    return (
        <DashboardLayout
            user={user}
            profile={profile}
            role={role}
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            collections={collections}
            isAdmin={isAdmin}
        >
            {showOverview ? (
                /* OVERVIEW / STATS DASHBOARD */
                <div className="flex-1 overflow-y-auto p-6">
                    <h1 className="text-2xl font-black text-white mb-6">Dashboard</h1>

                    {/* Main Stats Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <div className="bg-zinc-900 border border-white/10 rounded-xl p-5">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <LayoutGrid size={22} className="text-primary" />
                                </div>
                            </div>
                            <span className="text-3xl font-black text-white">{recipes.length}</span>
                            <p className="text-sm text-muted-foreground mt-1">Total Recipes</p>
                        </div>

                        <div className="bg-zinc-900 border border-white/10 rounded-xl p-5">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-11 h-11 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                                    <Clock size={22} className="text-yellow-400" />
                                </div>
                            </div>
                            <span className="text-3xl font-black text-white">
                                {recipes.filter(r => r.status === 'processing').length}
                            </span>
                            <p className="text-sm text-muted-foreground mt-1">Processing</p>
                        </div>

                        <div className="bg-zinc-900 border border-white/10 rounded-xl p-5">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-11 h-11 rounded-lg bg-green-500/10 flex items-center justify-center">
                                    <ChefHat size={22} className="text-green-400" />
                                </div>
                            </div>
                            <span className="text-3xl font-black text-white">
                                {recipes.filter(r => r.status === 'complete').length}
                            </span>
                            <p className="text-sm text-muted-foreground mt-1">Published</p>
                        </div>

                        <div className="bg-zinc-900 border border-white/10 rounded-xl p-5">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-11 h-11 rounded-lg bg-purple-500/10 flex items-center justify-center">
                                    <ImageIcon size={22} className="text-purple-400" />
                                </div>
                            </div>
                            <span className="text-3xl font-black text-white">{collections.length}</span>
                            <p className="text-sm text-muted-foreground mt-1">Collections</p>
                        </div>
                    </div>

                    {/* Secondary Stats */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                        {/* Recipe Status Breakdown */}
                        <div className="bg-zinc-900 border border-white/10 rounded-xl p-5">
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Recipe Status</h3>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-green-500" />
                                        <span className="text-sm text-white/80">Published</span>
                                    </div>
                                    <span className="text-sm font-bold text-white">{recipes.filter(r => r.status === 'complete').length}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-yellow-500" />
                                        <span className="text-sm text-white/80">Processing</span>
                                    </div>
                                    <span className="text-sm font-bold text-white">{recipes.filter(r => r.status === 'processing').length}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-zinc-500" />
                                        <span className="text-sm text-white/80">Draft</span>
                                    </div>
                                    <span className="text-sm font-bold text-white">{recipes.filter(r => !r.status || r.status === 'draft').length}</span>
                                </div>
                            </div>
                            {/* Progress bar */}
                            <div className="mt-4 h-2 bg-zinc-800 rounded-full overflow-hidden flex">
                                <div
                                    className="bg-green-500 h-full"
                                    style={{ width: `${(recipes.filter(r => r.status === 'complete').length / Math.max(recipes.length, 1)) * 100}%` }}
                                />
                                <div
                                    className="bg-yellow-500 h-full"
                                    style={{ width: `${(recipes.filter(r => r.status === 'processing').length / Math.max(recipes.length, 1)) * 100}%` }}
                                />
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="bg-zinc-900 border border-white/10 rounded-xl p-5">
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Quick Actions</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setActiveFilter('all')}
                                    className="p-4 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-left transition-colors"
                                >
                                    <LayoutGrid size={20} className="text-primary mb-2" />
                                    <span className="text-sm font-bold text-white block">View All</span>
                                    <span className="text-xs text-muted-foreground">Browse recipes</span>
                                </button>
                                <button
                                    onClick={() => setActiveFilter('drafts')}
                                    className="p-4 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-left transition-colors"
                                >
                                    <Clock size={20} className="text-yellow-400 mb-2" />
                                    <span className="text-sm font-bold text-white block">Processing</span>
                                    <span className="text-xs text-muted-foreground">Review queue</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Collections Overview */}
                    <div className="bg-zinc-900 border border-white/10 rounded-xl p-5">
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Collections Overview</h3>
                        {collections.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No collections yet</p>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                {collections.map((collection) => (
                                    <div key={collection.id} className="p-3 bg-zinc-800 rounded-lg">
                                        <div className="flex items-center gap-2 mb-1">
                                            <ImageIcon size={14} className="text-purple-400" />
                                            <span className="text-sm font-bold text-white truncate">{collection.name}</span>
                                        </div>
                                        <span className="text-xs text-muted-foreground">{collection.recipe_count || 0} recipes</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                /* RECIPE LIST - FULL WIDTH */
                <div className="flex-1 flex flex-col h-full overflow-hidden">
                    {/* Compact Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 flex-shrink-0">
                        <h2 className="font-bold text-white">
                            {activeFilter === 'all' ? 'All Recipes' :
                                activeFilter === 'drafts' ? 'Processing' :
                                    activeFilter === 'recent' ? 'Recently Added' : 'Recipes'}
                            <span className="ml-2 text-muted-foreground text-sm font-normal">
                                ({filteredRecipes.length})
                            </span>
                        </h2>

                        {/* View Toggle */}
                        <div className="flex items-center bg-white/5 rounded-lg p-1 border border-white/10">
                            <button
                                onClick={() => setViewMode('split')}
                                className={`p-2 rounded-md transition-colors ${viewMode === 'split' ? 'bg-primary text-black' : 'text-white/50 hover:text-white'}`}
                                title="Split View"
                            >
                                <PanelLeftClose size={16} />
                            </button>
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-primary text-black' : 'text-white/50 hover:text-white'}`}
                                title="Grid View"
                            >
                                <Grid3X3 size={16} />
                            </button>
                        </div>
                    </div>

                    {filteredRecipes.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="text-center">
                                <ChefHat size={48} className="text-white/10 mx-auto mb-4" />
                                <p className="text-muted-foreground">No recipes found</p>
                            </div>
                        </div>
                    ) : viewMode === 'split' ? (
                        /* SPLIT VIEW - FULL HEIGHT */
                        <div className="flex-1 flex overflow-hidden">
                            {/* Left: Recipe List */}
                            <div className="w-72 flex-shrink-0 border-r border-white/5 overflow-y-auto">
                                {filteredRecipes.map((recipe) => (
                                    <button
                                        key={recipe.id}
                                        onClick={() => setSelectedRecipe(recipe)}
                                        className={`w-full flex items-center gap-3 p-3 text-left transition-colors border-b border-white/5 ${selectedRecipe?.id === recipe.id
                                            ? 'bg-primary/10 border-l-2 border-l-primary'
                                            : 'hover:bg-white/5'
                                            }`}
                                    >
                                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-white/5 flex-shrink-0 relative">
                                            {recipe.image_url ? (
                                                <Image
                                                    src={recipe.image_url}
                                                    alt={recipe.title}
                                                    fill
                                                    sizes="48px"
                                                    className="object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <ChefHat size={18} className="text-white/20" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-white text-sm truncate">{recipe.title}</h3>
                                            <span className={`text-[10px] font-bold ${recipe.status === 'processing' ? 'text-yellow-400' :
                                                recipe.status === 'complete' ? 'text-green-400' :
                                                    'text-white/40'
                                                }`}>
                                                {recipe.status || 'draft'}
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>

                            {/* Right: Recipe Detail - FULL WIDTH */}
                            <div className="flex-1 overflow-hidden">
                                {selectedRecipe ? (
                                    <div className="h-full flex flex-col">
                                        {/* Hero Image */}
                                        <div className="relative h-72 flex-shrink-0">
                                            {selectedRecipe.image_url ? (
                                                <Image
                                                    src={selectedRecipe.image_url}
                                                    alt={selectedRecipe.title}
                                                    fill
                                                    sizes="100vw"
                                                    className="object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                                                    <ChefHat size={64} className="text-white/10" />
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />

                                            {/* Status + Link */}
                                            <div className="absolute top-4 right-4 flex items-center gap-2">
                                                <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${selectedRecipe.status === 'processing' ? 'bg-yellow-500 text-black' :
                                                    selectedRecipe.status === 'complete' ? 'bg-green-500 text-black' :
                                                        'bg-white/20 text-white'
                                                    }`}>
                                                    {selectedRecipe.status || 'draft'}
                                                </span>
                                                <Link
                                                    href={`/recipe/${selectedRecipe.id}`}
                                                    className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                                                >
                                                    <ExternalLink size={16} />
                                                </Link>
                                            </div>

                                            {/* Title on image */}
                                            <div className="absolute bottom-0 left-0 right-0 p-6">
                                                <h2 className="text-3xl font-black text-white drop-shadow-lg">{selectedRecipe.title}</h2>
                                            </div>
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 overflow-y-auto p-6">
                                            {selectedRecipe.description && (
                                                <p className="text-muted-foreground mb-6">{selectedRecipe.description}</p>
                                            )}

                                            {/* Meta */}
                                            <div className="flex flex-wrap gap-4 mb-6">
                                                {selectedRecipe.prep_time && (
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <Clock size={16} className="text-primary" />
                                                        <span className="text-white">{selectedRecipe.prep_time}</span>
                                                    </div>
                                                )}
                                                {selectedRecipe.servings && (
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <Users size={16} className="text-primary" />
                                                        <span className="text-white">{selectedRecipe.servings} servings</span>
                                                    </div>
                                                )}
                                                {selectedRecipe.cuisine && (
                                                    <span className="text-sm text-white/60 bg-white/5 px-3 py-1 rounded-full">
                                                        {selectedRecipe.cuisine}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Ingredients */}
                                            {selectedRecipe.ingredients && selectedRecipe.ingredients.length > 0 && (
                                                <div className="mb-6">
                                                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3">Ingredients</h3>
                                                    <ul className="space-y-2">
                                                        {selectedRecipe.ingredients.map((ing, i) => (
                                                            <li key={i} className="text-sm text-white/80 flex items-start gap-2">
                                                                <span className="text-primary">•</span>
                                                                {typeof ing === 'string' ? ing : `${ing.amount || ''} ${ing.unit || ''} ${ing.item || ''}`.trim()}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}

                                            {/* Tags */}
                                            {selectedRecipe.tags && selectedRecipe.tags.length > 0 && (
                                                <div className="flex flex-wrap gap-2">
                                                    {selectedRecipe.tags.map((tag, i) => (
                                                        <span key={i} className="text-xs bg-white/5 text-white/60 px-2 py-1 rounded-full">
                                                            #{tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-full flex items-center justify-center">
                                        <p className="text-muted-foreground">Select a recipe to view details</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        /* GRID VIEW - FULL WIDTH */
                        <div className="flex-1 overflow-y-auto p-4">
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
                                {filteredRecipes.map((recipe) => (
                                    <Link
                                        key={recipe.id}
                                        href={`/recipe/${recipe.id}`}
                                        className="group relative aspect-[2/3] rounded-xl overflow-hidden bg-zinc-900 border border-white/10"
                                    >
                                        {recipe.image_url ? (
                                            <Image
                                                src={recipe.image_url}
                                                alt={recipe.title}
                                                fill
                                                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                                                className="object-cover transition-transform duration-500 group-hover:scale-105"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <ChefHat size={40} className="text-white/20" />
                                            </div>
                                        )}

                                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

                                        <div className="absolute top-2 right-2">
                                            <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${recipe.status === 'processing' ? 'bg-yellow-500/80 text-black' :
                                                recipe.status === 'complete' ? 'bg-green-500/80 text-black' :
                                                    'bg-white/20 text-white backdrop-blur-sm'
                                                }`}>
                                                {recipe.status || 'draft'}
                                            </span>
                                        </div>

                                        <div className="absolute bottom-0 left-0 right-0 p-4">
                                            <h3 className="font-bold text-white text-sm line-clamp-2 group-hover:text-primary transition-colors">
                                                {recipe.title}
                                            </h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                {recipe.prep_time && (
                                                    <span className="text-[10px] text-white/60">{recipe.prep_time}</span>
                                                )}
                                                {recipe.cuisine && (
                                                    <span className="text-[10px] text-white/60">• {recipe.cuisine}</span>
                                                )}
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </DashboardLayout>
    );
}
