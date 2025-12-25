'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { User } from '@supabase/supabase-js';
import type { Recipe, Collection, UserProfile } from '@/types/database';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { LayoutGrid, Clock, Users, Plus, ImageIcon, Loader2, FolderOpen, Heart, ShoppingBag, ChefHat, PanelLeftClose, Grid3X3, ExternalLink } from 'lucide-react';

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
    const [activeFilter, setActiveFilter] = useState('overview');
    const [theme, setTheme] = useState<'dark' | 'light'>('light');
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

    // Theme helpers
    // Theme helpers - Minimalist
    const cardClass = theme === 'light'
        ? 'bg-white border border-zinc-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)]'
        : 'bg-zinc-900 border-white/5';
    const textPrimary = theme === 'light' ? 'text-zinc-900' : 'text-white';
    const textSecondary = theme === 'light' ? 'text-zinc-500' : 'text-muted-foreground';
    const bgSecondary = theme === 'light' ? 'bg-zinc-50' : 'bg-zinc-800';

    return (
        <DashboardLayout
            user={user}
            profile={profile}
            role={role}
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            collections={collections}
            isAdmin={isAdmin}
            currentTheme={theme}
            onThemeToggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
            {showOverview ? (
                /* OVERVIEW / STATS DASHBOARD */
                <div className="flex-1 overflow-y-auto p-10">
                    {/* Header Section */}
                    <div className="flex items-center justify-between mb-12">
                        <div>
                            <h1 className={`text-3xl font-bold tracking-tight mb-2 ${textPrimary}`}>
                                Hello, {profile?.first_name || 'Chef'}
                            </h1>
                            <p className={textSecondary}>Track your culinary collection here.</p>
                        </div>
                        <div className={`text-sm font-medium px-4 py-2 rounded-full border ${theme === 'light' ? 'bg-zinc-50 border-zinc-100 text-zinc-500' : 'bg-white/5 border-white/5 text-zinc-400'}`}>
                            {new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </div>
                    </div>

                    {/* Stats Row - Horizontal & Seamless */}
                    <div className={`flex items-center gap-12 border-b pb-12 mb-12 ${theme === 'light' ? 'border-zinc-100' : 'border-white/5'}`}>
                        {/* Total Recipes */}
                        <div className="flex items-center gap-6">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${theme === 'light' ? 'bg-zinc-50 text-zinc-900' : 'bg-zinc-800 text-white'}`}>
                                <LayoutGrid size={20} />
                            </div>
                            <div>
                                <span className={`block text-sm font-medium mb-1 ${textSecondary}`}>Total Recipes</span>
                                <span className={`text-2xl font-bold tracking-tight ${textPrimary}`}>
                                    {recipes.length} <span className="text-emerald-500 text-sm font-medium ml-2">+2 this week</span>
                                </span>
                            </div>
                        </div>

                        <div className={`h-10 w-px ${theme === 'light' ? 'bg-zinc-100' : 'bg-white/5'}`} />

                        {/* Processing */}
                        <div className="flex items-center gap-6">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${theme === 'light' ? 'bg-zinc-50 text-zinc-900' : 'bg-zinc-800 text-white'}`}>
                                <Clock size={20} />
                            </div>
                            <div>
                                <span className={`block text-sm font-medium mb-1 ${textSecondary}`}>Processing</span>
                                <span className={`text-2xl font-bold tracking-tight ${textPrimary}`}>
                                    {recipes.filter(r => r.status === 'draft').length}
                                </span>
                            </div>
                        </div>

                        <div className={`h-10 w-px ${theme === 'light' ? 'bg-zinc-100' : 'bg-white/5'}`} />

                        {/* Collections */}
                        <div className="flex items-center gap-6">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${theme === 'light' ? 'bg-zinc-50 text-zinc-900' : 'bg-zinc-800 text-white'}`}>
                                <FolderOpen size={20} />
                            </div>
                            <div>
                                <span className={`block text-sm font-medium mb-1 ${textSecondary}`}>Collections</span>
                                <span className={`text-2xl font-bold tracking-tight ${textPrimary}`}>
                                    {collections.length}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6 mb-8">
                        {/* Recipe Status */}
                        <div className={`rounded-2xl p-6 ${cardClass}`}>
                            <h3 className={`text-lg font-bold tracking-tight mb-6 ${textPrimary}`}>Performance</h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                        <span className={`text-sm ${textPrimary}`}>Published</span>
                                    </div>
                                    <span className={`font-medium ${textPrimary}`}>{recipes.filter(r => r.status === 'complete').length}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-amber-500" />
                                        <span className={`text-sm ${textPrimary}`}>Processing</span>
                                    </div>
                                    <span className={`font-medium ${textPrimary}`}>{recipes.filter(r => r.status === 'processing').length}</span>
                                </div>
                            </div>
                        </div>

                        {/* Recent Collections */}
                        <div className={`rounded-2xl p-6 ${cardClass}`}>
                            <h3 className={`text-lg font-bold tracking-tight mb-6 ${textPrimary}`}>Current Tasks</h3>
                            <div className="space-y-3">
                                {collections.slice(0, 3).map(c => (
                                    <div key={c.id} className={`flex items-center justify-between p-3 rounded-xl transition-colors ${theme === 'light' ? 'hover:bg-zinc-50' : 'hover:bg-white/5'}`}>
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${bgSecondary}`}>
                                                <FolderOpen size={16} className={theme === 'light' ? 'text-zinc-900' : 'text-white'} />
                                            </div>
                                            <div>
                                                <p className={`text-sm font-medium ${textPrimary}`}>{c.name}</p>
                                                <p className={`text-xs ${textSecondary}`}>{c.recipe_count || 0} recipes</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>


                </div>
            ) : (
                /* RECIPE LIST - FULL WIDTH */
                <div className="flex-1 flex flex-col h-full overflow-hidden">
                    {/* Compact Header */}
                    <div className={`flex items-center justify-between px-4 py-3 border-b flex-shrink-0 ${theme === 'light' ? 'bg-white border-zinc-200' : 'border-white/5'}`}>
                        <h2 className={`font-bold ${textPrimary}`}>
                            {activeFilter === 'all' ? 'All Recipes' :
                                activeFilter === 'drafts' ? 'Processing' :
                                    activeFilter === 'recent' ? 'Recently Added' : 'Recipes'}
                            <span className={`ml-2 text-sm font-normal ${textSecondary}`}>
                                ({filteredRecipes.length})
                            </span>
                        </h2>

                        {/* View Toggle */}
                        <div className={`flex items-center rounded-lg p-1 border ${theme === 'light' ? 'bg-zinc-100 border-zinc-200' : 'bg-white/5 border-white/10'}`}>
                            <button
                                onClick={() => setViewMode('split')}
                                className={`p-2 rounded-md transition-colors ${viewMode === 'split'
                                    ? (theme === 'light' ? 'bg-white text-zinc-900 shadow-sm' : 'bg-primary text-black')
                                    : (theme === 'light' ? 'text-zinc-500 hover:text-zinc-900' : 'text-white/50 hover:text-white')}`}
                                title="Split View"
                            >
                                <PanelLeftClose size={16} />
                            </button>
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-2 rounded-md transition-colors ${viewMode === 'grid'
                                    ? (theme === 'light' ? 'bg-white text-zinc-900 shadow-sm' : 'bg-primary text-black')
                                    : (theme === 'light' ? 'text-zinc-500 hover:text-zinc-900' : 'text-white/50 hover:text-white')}`}
                                title="Grid View"
                            >
                                <Grid3X3 size={16} />
                            </button>
                        </div>
                    </div>

                    {filteredRecipes.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="text-center">
                                <ChefHat size={48} className="text-white mx-auto mb-4" />
                                <p className="text-muted-foreground">No recipes found</p>
                            </div>
                        </div>
                    ) : viewMode === 'split' ? (
                        /* SPLIT VIEW - FULL HEIGHT */
                        <div className="flex-1 flex overflow-hidden">
                            {/* Left: Recipe List */}
                            <div className={`w-72 flex-shrink-0 border-r overflow-y-auto ${theme === 'light' ? 'bg-white border-zinc-200' : 'border-white/5'}`}>
                                {filteredRecipes.map((recipe) => (
                                    <button
                                        key={recipe.id}
                                        onClick={() => setSelectedRecipe(recipe)}
                                        className={`w-full flex items-center gap-3 p-3 text-left transition-colors border-b ${theme === 'light' ? 'border-zinc-100' : 'border-white/5'} ${selectedRecipe?.id === recipe.id
                                            ? (theme === 'light' ? 'bg-primary/5 border-l-2 border-l-primary' : 'bg-primary/10 border-l-2 border-l-primary')
                                            : (theme === 'light' ? 'hover:bg-zinc-50' : 'hover:bg-white/5')
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
                                                    <ChefHat size={18} className="text-white" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className={`font-bold text-sm truncate ${textPrimary}`}>{recipe.title}</h3>
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
                                                    <ChefHat size={64} className="text-white" />
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
                                                <p className={`mb-6 ${textSecondary}`}>{selectedRecipe.description}</p>
                                            )}

                                            {/* Meta */}
                                            <div className="flex flex-wrap gap-4 mb-6">
                                                {selectedRecipe.prep_time && (
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <Clock size={16} className="text-primary" />
                                                        <span className={textPrimary}>{selectedRecipe.prep_time}</span>
                                                    </div>
                                                )}
                                                {selectedRecipe.servings && (
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <Users size={16} className="text-primary" />
                                                        <span className={textPrimary}>{selectedRecipe.servings} servings</span>
                                                    </div>
                                                )}
                                                {selectedRecipe.cuisine && (
                                                    <span className={`text-sm px-3 py-1 rounded-full ${theme === 'light' ? 'bg-zinc-100 text-zinc-600' : 'bg-white/5 text-white/60'}`}>
                                                        {selectedRecipe.cuisine}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Ingredients */}
                                            {selectedRecipe.ingredients && selectedRecipe.ingredients.length > 0 && (
                                                <div className="mb-6">
                                                    <h3 className={`text-sm font-bold uppercase tracking-wider mb-3 ${textPrimary}`}>Ingredients</h3>
                                                    <ul className="space-y-2">
                                                        {selectedRecipe.ingredients.map((ing, i) => (
                                                            <li key={i} className={`text-sm flex items-start gap-2 ${theme === 'light' ? 'text-zinc-700' : 'text-white/80'}`}>
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
                                                        <span key={i} className={`text-xs px-2 py-1 rounded-full ${theme === 'light' ? 'bg-zinc-100 text-zinc-500' : 'bg-white/5 text-white/60'}`}>
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
                                        className={`group relative aspect-[2/3] rounded-xl overflow-hidden ${cardClass}`}
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
                                                <ChefHat size={40} className="text-white" />
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
            )
            }
        </DashboardLayout >
    );
}
