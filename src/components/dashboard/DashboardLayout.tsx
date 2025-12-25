'use client';

import { useState } from 'react';
import type { User } from '@supabase/supabase-js';
import type { Collection, UserProfile } from '@/types/database';
import Sidebar from '@/components/dashboard/Sidebar';
import { Menu, Search, Bell } from 'lucide-react';

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
    return (
        <div className="light-theme flex h-screen bg-[#F8FAFC] font-sans text-zinc-900">
            {/* Mobile Overlay */}
            {!isSidebarOpen && (
                <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsSidebarOpen(true)} />
            )}

            {/* Sidebar (Desktop Fixed / Mobile Drawer) */}
            <div className={`fixed inset-y-0 left-0 z-50 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition-transform duration-200 ease-in-out`}>
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
                    theme="light" // Force light for V4 design
                />
            </div>

            {/* Main Content Wrapper */}
            <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                {/* TOP HEADER */}
                <header className="h-20 bg-white border-b border-zinc-100/50 flex items-center justify-between px-8 flex-shrink-0 z-10 sticky top-0">
                    <div className="flex items-center gap-4 flex-1">
                        <button className="md:hidden p-2 text-zinc-500" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                            <Menu size={24} />
                        </button>
                        {/* Search Bar - Visual Placeholder */}
                        <div className="relative w-full max-w-xl hidden md:block">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300" size={20} />
                            <input
                                type="text"
                                placeholder="Search something..."
                                className="w-full pl-12 pr-4 py-3 bg-zinc-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-zinc-200 placeholder:text-zinc-400 transition-all hover:bg-zinc-100 focus:bg-white text-zinc-600 outline-none"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <button className="relative p-2 text-zinc-400 hover:text-zinc-600 transition-colors">
                            <Bell size={24} />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                        </button>
                        <div className="h-8 w-px bg-zinc-100"></div>
                        <div className="flex items-center gap-3">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-bold text-zinc-900 leading-none">Joxy Inc.</p>
                                <p className="text-xs text-zinc-400 mt-1">Brand</p>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center text-white font-bold shadow-lg shadow-zinc-200">
                                J
                            </div>
                        </div>
                    </div>
                </header>

                {/* SCROLLABLE MAIN CONTENT */}
                <main className="flex-1 overflow-auto p-8 relative">
                    <div className="max-w-7xl mx-auto space-y-8">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
