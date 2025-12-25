'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import type { Recipe, Collection, UserProfile, AuthorProfile } from '@/types/database';
import { LayoutGrid, Clock, Users, Plus, ImageIcon, Loader2, FolderOpen, Heart, ShoppingBag, ChefHat, PanelLeftClose, Grid3X3, ExternalLink, ThumbsUp, MessageCircle, Share2, BarChart2, List, Columns } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

interface DashboardClientProps {
    user: User;
    profile: UserProfile | null;
    role: 'user' | 'author' | 'admin' | null;
    isAdmin: boolean;
    initialRecipes: Recipe[];
    initialCollections: Collection[];
    authorProfile?: AuthorProfile | null;
}

export default function DashboardClient({
    user,
    profile,
    role,
    isAdmin,
    initialRecipes,
    initialCollections,
    authorProfile
}: DashboardClientProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const viewParam = searchParams.get('view');

    const [activeFilter, setActiveFilter] = useState(viewParam || 'overview');
    const [viewMode, setViewMode] = useState<'split' | 'grid'>('grid');
    const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

    // Auto-select first recipe in split view if none selected
    useEffect(() => {
        if (viewMode === 'split' && !selectedRecipe && initialRecipes.length > 0) {
            setSelectedRecipe(initialRecipes[0]);
        }
    }, [viewMode, selectedRecipe, initialRecipes]);


    // Sync activeFilter with URL param
    useEffect(() => {
        if (viewParam) {
            setActiveFilter(viewParam);
        } else {
            setActiveFilter('overview');
        }
    }, [viewParam]);

    const handleFilterChange = (filter: string) => {
        setActiveFilter(filter);
        if (filter === 'overview') {
            router.push('/dashboard');
        } else {
            router.push(`/dashboard?view=${filter}`);
        }
    };

    // V4: Stats Cards Component - Monochrome
    const StatCard = ({ icon: Icon, label, value, subtext }: any) => (
        <div className="bg-white p-6 rounded-2xl shadow-sm flex flex-col justify-between h-40 group transition-all hover:shadow-md">
            <div className="w-10 h-10 rounded-full bg-zinc-50 flex items-center justify-center text-zinc-500 group-hover:bg-zinc-900 group-hover:text-white transition-colors">
                <Icon size={20} />
            </div>
            <div>
                <p className="text-zinc-500 text-sm font-medium mb-1">{label}</p>
                <h3 className="text-3xl font-bold text-zinc-900 tracking-tight">{value}</h3>
                {subtext && <p className="text-xs text-zinc-400 mt-1">{subtext}</p>}
            </div>
        </div>
    );

    // Recipes Filter
    const recipes = initialRecipes;
    const collections = initialCollections;

    const filteredRecipes = useMemo(() => {
        if (activeFilter === 'overview') return [];
        if (activeFilter === 'drafts') return recipes.filter(r => r.status === 'processing' || r.status === 'draft');
        if (activeFilter === 'all') return recipes;
        // Check for collection ID
        return recipes; // Fallback
    }, [activeFilter, recipes]);

    const showOverview = activeFilter === 'overview';

    return (
        <div className="flex flex-col">
            {/* V4 Header: Title & Tabs */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        {/* Icon Removed per user request */}
                        <div>
                            <h1 className="text-2xl font-bold text-zinc-900">
                                {activeFilter === 'overview' ? 'Kitchen Overview' :
                                    activeFilter === 'all' ? 'All Recipes' :
                                        activeFilter === 'drafts' ? 'Processing' :
                                            activeFilter === 'collections' ? 'Collections' : 'Dashboard'}
                            </h1>
                            <p className="text-zinc-400 text-sm">
                                {activeFilter === 'overview' ? 'Manage your culinary collection.' :
                                    activeFilter === 'all' ? 'View and manage all your recipes.' :
                                        activeFilter === 'collections' ? 'Organize your recipes into collections.' :
                                            activeFilter === 'drafts' ? 'Recipes currently being digitized.' : ''}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {activeFilter === 'all' && (
                            <div className="flex bg-zinc-100 p-1 rounded-lg mr-2">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-400 hover:text-zinc-600'}`}
                                    title="Grid View"
                                >
                                    <LayoutGrid size={16} />
                                </button>
                                <button
                                    onClick={() => setViewMode('split')}
                                    className={`p-1.5 rounded-md transition-all ${viewMode === 'split' ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-400 hover:text-zinc-600'}`}
                                    title="Split View"
                                >
                                    <Columns size={16} />
                                </button>
                            </div>
                        )}
                        <div className="flex items-center gap-2 bg-white rounded-lg p-1 shadow-sm">
                            <span className="px-3 py-1 text-xs font-bold text-green-600 bg-green-50 rounded-md">Status: Active</span>
                            <span className="px-3 py-1 text-xs text-zinc-400">Updated: Today</span>
                        </div>
                    </div>
                </div>

                {/* Tabs - No Underlines */}
                {/* Tabs Removed - Controlled by Sidebar */}
            </div>

            {/* CONTENT AREA */}
            {showOverview ? (
                <div className="space-y-8">
                    {/* 1. Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard
                            icon={ThumbsUp}
                            label="Total Recipes"
                            value={recipes.length}
                            subtext="+12% from last month"
                        />
                        <StatCard
                            icon={MessageCircle}
                            label="Collections"
                            value={collections.length}
                            subtext="organized categories"
                        />
                        <StatCard
                            icon={Share2}
                            label="Shared"
                            value="24"
                            subtext="recipes viewed by others"
                        />
                        <StatCard
                            icon={BarChart2}
                            label="Engagement"
                            value="89%"
                            subtext="completion rate"
                        />
                    </div>

                    {/* 2. Main Content Cards */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Big Chart Area (Placeholder) */}
                        <div className="lg:col-span-2 bg-white p-8 rounded-2xl shadow-sm min-h-[400px]">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h3 className="text-lg font-bold text-zinc-900">Recipe Analytics</h3>
                                    <p className="text-zinc-400 text-sm">Growth over time</p>
                                </div>
                                <div className="flex gap-2">
                                    <span className="px-3 py-1 rounded-lg bg-zinc-900 text-white text-xs font-bold">12 Months</span>
                                    <span className="px-3 py-1 rounded-lg bg-zinc-50 text-zinc-500 text-xs font-bold">30 Days</span>
                                </div>
                            </div>
                            {/* Visual Chart Placeholder - Monochrome */}
                            <div className="w-full h-64 bg-zinc-50/50 rounded-xl flex items-end justify-between px-8 py-4 gap-4">
                                {[40, 60, 45, 70, 50, 80, 65, 85, 90, 75, 60, 95].map((h, i) => (
                                    <div key={i} className="w-full bg-zinc-200 rounded-t-lg relative group hover:bg-zinc-800 transition-colors" style={{ height: `${h}%` }}>
                                        <div className="opacity-0 group-hover:opacity-100 absolute -top-10 left-1/2 -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded transition-opacity">
                                            {h}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Right Side List (Influencer/Recent) */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold text-zinc-900">Recent Activity</h3>
                                <button className="text-zinc-900 text-sm font-bold hover:underline">+ Add New</button>
                            </div>
                            <div className="space-y-4">
                                {recipes.slice(0, 5).map(recipe => (
                                    <div key={recipe.id} className="flex items-center gap-4 p-3 hover:bg-zinc-50 rounded-xl transition-colors cursor-pointer group">
                                        <div className="w-10 h-10 rounded-full bg-zinc-100 overflow-hidden relative">
                                            {recipe.image_url ? (
                                                <Image src={recipe.image_url} alt={recipe.title} fill className="object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-zinc-400"><ChefHat size={16} /></div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-sm font-bold text-zinc-900 truncate">{recipe.title}</h4>
                                            <p className="text-xs text-zinc-400">Recipe</p>
                                        </div>
                                        <div className="text-zinc-400 font-bold text-sm group-hover:text-zinc-900">
                                            →
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            ) : activeFilter === 'collections' ? (
                /* COLLECTIONS GRID */
                <div className="bg-white p-8 rounded-2xl shadow-sm min-h-[500px]">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {collections.map(collection => (
                            <div
                                key={collection.id}
                                onClick={() => router.push(`/collection/${collection.id}`)}
                                className="group bg-white border border-zinc-100 rounded-2xl p-4 hover:shadow-lg hover:border-zinc-200 transition-all cursor-pointer"
                            >
                                <div className="aspect-video bg-zinc-100 rounded-xl overflow-hidden relative mb-4">
                                    <div className="w-full h-full flex items-center justify-center text-zinc-300">
                                        <FolderOpen size={32} />
                                    </div>
                                </div>
                                <h3 className="font-bold text-zinc-900 truncate mb-1">{collection.name}</h3>
                                <p className="text-xs text-zinc-500">{collection.description || 'No description'}</p>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                /* RECIPE GRID / SPLIT VIEW */
                <div className="bg-white p-6 rounded-2xl shadow-sm min-h-[500px]">
                    {viewMode === 'split' ? (
                        <div className="flex h-[600px] gap-6">
                            {/* Left: Compact List */}
                            <div className="w-1/3 overflow-y-auto pr-2 space-y-2">
                                {filteredRecipes.map(recipe => (
                                    <div
                                        key={recipe.id}
                                        onClick={() => setSelectedRecipe(recipe)}
                                        className={`p-3 rounded-xl cursor-pointer transition-all flex items-center gap-3 ${selectedRecipe?.id === recipe.id ? 'bg-zinc-900 text-white shadow-md' : 'hover:bg-zinc-50 text-zinc-900'}`}
                                    >
                                        <div className={`w-12 h-12 rounded-lg bg-zinc-100 flex-shrink-0 relative overflow-hidden ${selectedRecipe?.id === recipe.id ? 'ring-1 ring-white/20' : ''}`}>
                                            {recipe.image_url ? (
                                                <Image src={recipe.image_url} alt={recipe.title} fill className="object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center"><ChefHat size={16} className={selectedRecipe?.id === recipe.id ? 'text-zinc-500' : 'text-zinc-300'} /></div>
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="text-sm font-bold truncate">{recipe.title}</h4>
                                            <p className={`text-xs ${selectedRecipe?.id === recipe.id ? 'text-zinc-400' : 'text-zinc-500'}`}>By {recipe.author || 'Chef'}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Right: Preview Detail */}
                            <div className="flex-1 bg-zinc-50 rounded-2xl p-8 overflow-y-auto border border-zinc-100">
                                {selectedRecipe ? (
                                    <div className="max-w-2xl mx-auto">
                                        <div className="aspect-video bg-zinc-200 rounded-2xl overflow-hidden relative mb-6 shadow-sm">
                                            {selectedRecipe.image_url ? (
                                                <Image src={selectedRecipe.image_url} alt={selectedRecipe.title} fill className="object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-zinc-400"><ImageIcon size={48} /></div>
                                            )}
                                        </div>
                                        <h2 className="text-2xl font-bold text-zinc-900 mb-2">{selectedRecipe.title}</h2>
                                        <div className="flex items-center gap-4 text-zinc-500 text-sm mb-6">
                                            <span>{selectedRecipe.author || 'Chef'}</span>
                                            <span>•</span>
                                            <span>{selectedRecipe.cook_time || '30 mins'}</span>
                                            <span>•</span>
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${selectedRecipe.status === 'complete' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                {selectedRecipe.status || 'Draft'}
                                            </span>
                                        </div>
                                        <div className="prose prose-zinc max-w-none">
                                            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 mb-2">Description</h3>
                                            <p className="text-zinc-600 mb-6">{selectedRecipe.description || 'No description available.'}</p>

                                            <div className="grid grid-cols-2 gap-4">
                                                <button onClick={() => router.push(`/recipe/${selectedRecipe.id}`)} className="flex items-center justify-center gap-2 w-full py-3 bg-zinc-900 text-white rounded-xl font-bold hover:bg-black transition-colors">
                                                    Full Details <ExternalLink size={16} />
                                                </button>
                                                <button className="flex items-center justify-center gap-2 w-full py-3 bg-white border border-zinc-200 text-zinc-900 rounded-xl font-bold hover:bg-zinc-50 transition-colors">
                                                    Edit Recipe
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-zinc-400">
                                        Select a recipe to view details
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filteredRecipes.map(recipe => (
                                <div key={recipe.id} className="group bg-white rounded-2xl p-3 hover:shadow-xl hover:shadow-zinc-200/50 transition-all cursor-pointer">
                                    <div className="aspect-square bg-zinc-100 rounded-xl overflow-hidden relative mb-3">
                                        {recipe.image_url ? (
                                            <Image src={recipe.image_url} alt={recipe.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-zinc-300">
                                                <ImageIcon size={32} />
                                            </div>
                                        )}
                                        <div className="absolute top-2 right-2 bg-white/90 backdrop-blur rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                                            <Heart size={14} className="text-zinc-400 hover:text-red-500 transition-colors" />
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-zinc-900 truncate mb-1">{recipe.title}</h3>
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs text-zinc-500">By {recipe.author || 'Chef'}</p>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${recipe.status === 'complete' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                {recipe.status || 'Draft'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
