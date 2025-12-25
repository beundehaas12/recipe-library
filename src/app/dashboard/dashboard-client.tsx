'use client';

import { useState, useMemo } from 'react';
import type { User } from '@supabase/supabase-js';
import type { Recipe, Collection, UserProfile } from '@/types/database';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { LayoutGrid, Clock, Users, Plus, ImageIcon, Loader2, FolderOpen, Heart, ShoppingBag, ChefHat, PanelLeftClose, Grid3X3, ExternalLink, ThumbsUp, MessageCircle, Share2, BarChart2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

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
    const [viewMode, setViewMode] = useState<'split' | 'grid'>('grid'); // Default to grid for V4

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
        <DashboardLayout
            user={user}
            profile={profile}
            role={role}
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            collections={collections}
            isAdmin={isAdmin}
        // Add handlers here if needed
        >
            {/* V4 Header: Title & Tabs */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-red-200 shadow-lg">
                            <ChefHat size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-zinc-900">Kitchen Overview</h1>
                            <p className="text-zinc-400 text-sm">Manage your culinary collection.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 bg-white rounded-lg p-1 shadow-sm">
                        <span className="px-3 py-1 text-xs font-bold text-green-600 bg-green-50 rounded-md">Status: Active</span>
                        <span className="px-3 py-1 text-xs text-zinc-400">Updated: Today</span>
                    </div>
                </div>

                {/* Tabs - No Underlines */}
                <div className="flex items-center gap-8 border-b border-transparent">
                    <button
                        onClick={() => setActiveFilter('overview')}
                        className={`pb-4 text-sm transition-colors ${activeFilter === 'overview' ? 'text-zinc-900 font-bold' : 'text-zinc-400 font-medium hover:text-zinc-600'}`}
                    >
                        Overview
                    </button>
                    <button
                        onClick={() => setActiveFilter('all')}
                        className={`pb-4 text-sm transition-colors ${activeFilter === 'all' ? 'text-zinc-900 font-bold' : 'text-zinc-400 font-medium hover:text-zinc-600'}`}
                    >
                        All Recipes
                    </button>
                    <button
                        onClick={() => setActiveFilter('drafts')}
                        className={`pb-4 text-sm transition-colors ${activeFilter === 'drafts' ? 'text-zinc-900 font-bold' : 'text-zinc-400 font-medium hover:text-zinc-600'}`}
                    >
                        Processing
                    </button>
                </div>
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
            ) : (
                /* RECIPE GRID LIST */
                <div className="bg-white p-8 rounded-2xl shadow-sm min-h-[500px]">
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
                </div>
            )}
        </DashboardLayout>
    );
}
