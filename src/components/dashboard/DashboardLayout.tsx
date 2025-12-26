'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChefHat, Bell, ChevronDown, ArrowLeft, Plus, Settings, LogOut, User, Search, Menu, X, Shield } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getAvatarUrl, getUserDisplayName } from '@/lib/profileService';
import Sidebar from '@/components/dashboard/Sidebar';
import SearchOverlay from '@/components/SearchOverlay';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { Collection, UserProfile, AuthorProfile } from '@/types/database';
import './dashboard-theme.css';

interface DashboardLayoutProps {
    children: React.ReactNode;
    user: SupabaseUser;
    profile: UserProfile | null;
    authorProfile?: AuthorProfile | null;
    role: 'user' | 'author' | 'admin' | null;
    collections: Collection[];
    onCreateCollection?: () => void;
    currentTheme?: 'dark' | 'light';
    onThemeToggle?: () => void;
}

export default function DashboardLayout({
    children,
    user,
    profile,
    authorProfile,
    role,
    collections = [],
    onCreateCollection,
    currentTheme = 'light',
    onThemeToggle,
}: DashboardLayoutProps) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);

    const profileRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const supabase = createClient();

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
                setIsProfileOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/');
        router.refresh();
    };

    const displayName = getUserDisplayName(profile) || user?.email?.split('@')[0] || 'User';
    const avatarUrl = getAvatarUrl(profile, user);

    // V4 Layout: Grey Background, White Top Bar, Floating Content
    // Uses .light-theme class to activate light CSS variables from globals.css
    // V4 Layout: Full Width Header + Sidebar/Content Split
    // Uses .dashboard-theme class to activate light CSS variables from dashboard-theme.css
    return (
        <div className="dashboard-theme flex flex-col h-screen bg-[#F8FAFC] font-sans text-zinc-900 overflow-hidden">
            {/* 1. TOP HEADER (Full Width) */}
            <header className="h-16 bg-white flex items-center justify-between px-4 lg:px-6 flex-shrink-0 z-50 relative border-b border-zinc-100">
                {/* Left: Logo, Back, Title, Author Switcher */}
                {/* Left: Move Back to App to start, Reuse Logo, Rename Title */}
                <div className="flex items-center gap-4">
                    {/* Back Button (Moved to Start) */}
                    <a href="/" className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-50 hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900 transition-colors text-xs font-bold ring-1 ring-zinc-900/5">
                        <ArrowLeft size={14} />
                        <span>Back to App</span>
                    </a>

                    <div className="h-6 w-px bg-zinc-100 mx-2"></div>

                    {/* Official Forkify Logo (Reused Green Style) */}
                    <div className="flex items-center gap-2">
                        <div className="bg-green-600/10 text-green-600 p-2 rounded-full">
                            <ChefHat size={22} />
                        </div>
                        <h1 className="text-xl font-bold text-zinc-900 tracking-tight">Forkify</h1>
                    </div>

                    <div className="h-6 w-px bg-zinc-100 mx-2"></div>

                    {/* Dashboard Title */}
                    <h1 className="font-bold text-zinc-900 text-sm hidden md:block">Auteurs Dashboard</h1>

                    {/* Author Switcher (Real Data) */}
                    <button className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-full hover:bg-zinc-50 transition-colors ml-2 group">
                        <div className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 text-xs font-bold overflow-hidden ring-2 ring-white shadow-sm">
                            {authorProfile?.avatar_url ? (
                                <img src={authorProfile.avatar_url} alt="Author" className="w-full h-full object-cover" />
                            ) : (
                                <span>{authorProfile?.pen_name?.[0] || authorProfile?.first_name?.[0] || profile?.first_name?.[0] || 'A'}</span>
                            )}
                        </div>
                        <span className="text-xs font-medium text-zinc-600 group-hover:text-zinc-900">
                            {authorProfile?.pen_name || authorProfile?.first_name || profile?.first_name || 'Author'}
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

                    {/* Fishbowl Profile & Dropdown */}
                    <div className="relative" ref={profileRef}>
                        <button
                            onClick={() => setIsProfileOpen(!isProfileOpen)}
                            className={`pl-1 pr-4 py-1 bg-zinc-50 rounded-full flex items-center gap-3 border border-zinc-100 transition-all cursor-pointer group hover:border-zinc-200 ${isProfileOpen ? 'ring-2 ring-zinc-100 border-zinc-200' : ''}`}
                        >
                            <div className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center text-zinc-500 font-bold overflow-hidden ring-2 ring-white shadow-sm">
                                <img src={avatarUrl} alt="User" className="w-full h-full object-cover" />
                            </div>
                            <div className="text-left hidden sm:block">
                                <p className="text-xs font-bold text-zinc-900 leading-none group-hover:text-zinc-900 transition-colors">
                                    {displayName}
                                </p>
                                <p className="text-[10px] text-zinc-400 mt-0.5 font-medium uppercase tracking-wider">
                                    {role || 'Admin'}
                                </p>
                            </div>
                            <ChevronDown size={14} className={`text-zinc-400 group-hover:text-zinc-600 ml-1 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
                        </button>

                        <AnimatePresence>
                            {isProfileOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                                    transition={{ duration: 0.1 }}
                                    className="absolute right-0 top-full mt-2 w-56 bg-white border border-zinc-100 rounded-xl shadow-xl overflow-hidden z-[60] flex flex-col py-1"
                                >
                                    <div className="px-4 py-3 border-b border-zinc-50">
                                        <p className="text-sm font-bold text-zinc-900 truncate">
                                            {displayName}
                                        </p>
                                        <p className="text-xs text-zinc-400 truncate">
                                            {user?.email}
                                        </p>
                                    </div>

                                    {role === 'admin' && (
                                        <a
                                            href="/admin"
                                            onClick={() => setIsProfileOpen(false)}
                                            className="px-4 py-2 text-sm text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 flex items-center gap-2 transition-colors"
                                        >
                                            <Shield size={16} />
                                            Admin Dashboard
                                        </a>
                                    )}

                                    <a
                                        href="/dashboard/profile"
                                        onClick={() => setIsProfileOpen(false)}
                                        className="px-4 py-2 text-sm text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 flex items-center gap-2 transition-colors"
                                    >
                                        <Settings size={16} />
                                        Instellingen
                                    </a>

                                    <div className="h-px bg-zinc-50 my-1" />

                                    <button
                                        onClick={() => {
                                            setIsProfileOpen(false);
                                            handleSignOut();
                                        }}
                                        className="px-4 py-2 text-sm text-red-500 hover:text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors text-left w-full"
                                    >
                                        <LogOut size={16} />
                                        Uitloggen
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
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
                        collections={collections}
                        onCreateCollection={onCreateCollection}
                        isCollapsed={isCollapsed}
                        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
                        onShowUrlModal={() => setIsUrlModalOpen(true)}
                    />
                </div>

                {/* Content */}
                <main className="flex-1 overflow-auto bg-[#F8FAFC] relative">
                    <div className="p-8 max-w-7xl mx-auto space-y-8">
                        {children}
                    </div>
                </main>
            </div>
            {/* Modals */}
            <SearchOverlay
                isOpen={isUrlModalOpen}
                onClose={() => setIsUrlModalOpen(false)}
            />
        </div>
    );
}
