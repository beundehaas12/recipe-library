'use client';

import { useState } from 'react';
import type { User } from '@supabase/supabase-js';
import type { Collection, UserProfile } from '@/types/database';
import Sidebar from '@/components/dashboard/Sidebar';
import { Menu, Search, Bell, ArrowLeft, ChevronDown } from 'lucide-react';

interface DashboardLayoutProps {
    children: React.ReactNode;
    user: User;
    profile: UserProfile | null;
    role: 'user' | 'author' | 'admin' | null;
    activeFilter: string;
    onFilterChange: (filter: string) => void;
    collections: Collection[];
    onCreateCollection?: () => void;
    isAdmin?: boolean;
    onShowAddMenu?: () => void;
    onShowUrlModal?: () => void;
    onMediaUpload?: () => void;
    currentTheme?: 'dark' | 'light';
    onThemeToggle?: () => void;
}

export default function DashboardLayout({
    children,
    user,
    profile,
    role,
    activeFilter,
    onFilterChange,
    collections,
    onCreateCollection,
    isAdmin = false,
    onShowAddMenu,
    onShowUrlModal,
    onMediaUpload,
    currentTheme = 'light',
    onThemeToggle
}: DashboardLayoutProps) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    // V4 Layout: Grey Background, White Top Bar, Floating Content
    // Uses .light-theme class to activate light CSS variables from globals.css
    // V4 Layout: Full Width Header + Sidebar/Content Split
    // Uses .light-theme class to activate light CSS variables from globals.css
    return (
        <div className="light-theme flex flex-col h-screen bg-[#F8FAFC] font-sans text-zinc-900 overflow-hidden">
            {/* 1. TOP HEADER (Full Width) */}
            <header className="h-16 bg-white flex items-center justify-between px-4 lg:px-6 flex-shrink-0 z-50 shadow-sm relative">
                {/* Left: Logo, Back, Title, Author Switcher */}
                <div className="flex items-center gap-4">
                    {/* Original Logo (Icon) */}
                    <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center text-white shadow-green-200/50 shadow-lg">
                        <Menu size={18} className="text-white" />
                    </div>

                    {/* Back Button */}
                    <a href="/" className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-50 hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900 transition-colors text-xs font-bold ring-1 ring-zinc-900/5">
                        <ArrowLeft size={14} />
                        <span>Back to App</span>
                    </a>

                    <div className="h-6 w-px bg-zinc-100 mx-2"></div>

                    {/* App Title */}
                    <h1 className="font-bold text-zinc-900 text-sm hidden md:block">Forkify Auteurs dashboard</h1>

                    {/* Author Switcher (Mock) */}
                    <button className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-full hover:bg-zinc-50 transition-colors ml-2 group">
                        <div className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 text-xs font-bold">
                            {profile?.first_name?.[0] || 'A'}
                        </div>
                        <span className="text-xs font-medium text-zinc-600 group-hover:text-zinc-900">
                            {profile?.first_name || 'Author'}
                        </span>
                        <ChevronDown size={12} className="text-zinc-400 group-hover:text-zinc-600" />
                    </button>
                </div>

                {/* Right: Profile Fishbowl (Fishbowl Style) */}
                <div className="flex items-center gap-4">
                    <button className="relative p-2 text-zinc-400 hover:text-zinc-600 transition-colors">
                        <Bell size={20} />
                        <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-red-500 rounded-full border border-white"></span>
                    </button>

                    <div className="h-6 w-px bg-zinc-100"></div>

                    {/* Fishbowl Profile */}
                    <div className="pl-1 pr-4 py-1 bg-zinc-50 rounded-full flex items-center gap-3 border border-zinc-100 hover:border-zinc-200 transition-colors cursor-pointer group">
                        <div className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center text-zinc-500 font-bold overflow-hidden ring-2 ring-white shadow-sm">
                            {profile?.avatar_url ? (
                                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-xs">{profile?.first_name?.[0] || 'U'}</span>
                            )}
                        </div>
                        <div className="text-left hidden sm:block">
                            <p className="text-xs font-bold text-zinc-900 leading-none group-hover:text-zinc-900 transition-colors">
                                {profile?.first_name || 'User'} {profile?.last_name || ''}
                            </p>
                            <p className="text-[10px] text-zinc-400 mt-0.5 font-medium uppercase tracking-wider">
                                {role || 'Admin'}
                            </p>
                        </div>
                        <ChevronDown size={14} className="text-zinc-400 group-hover:text-zinc-600 ml-1" />
                    </div>
                </div>
            </header>

            {/* MAIN LAYOUT (Sidebar + Content) */}
            <div className="flex-1 flex overflow-hidden">
                {/* Mobile Overlay */}
                {!isSidebarOpen && (
                    <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsSidebarOpen(true)} />
                )}

                {/* Sidebar */}
                <div className={`fixed inset-y-0 left-0 z-40 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition-transform duration-200 ease-in-out h-full mt-16 md:mt-0`}>
                    <Sidebar
                        user={user}
                        profile={profile}
                        activeFilter={activeFilter}
                        onFilterChange={onFilterChange}
                        collections={collections}
                        onCreateCollection={onCreateCollection}
                        isAdmin={isAdmin}
                        onShowAddMenu={onShowAddMenu}
                        onShowUrlModal={onShowUrlModal}
                        onMediaUpload={onMediaUpload}
                        theme="light"
                    />
                </div>

                {/* Content */}
                <main className="flex-1 overflow-auto bg-[#F8FAFC] relative">
                    <div className="p-8 max-w-7xl mx-auto space-y-8">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
