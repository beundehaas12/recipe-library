'use client';

import { useState, useRef } from 'react';
import { ChefHat, Search, Bell, ChevronLeft, X, Sun, Moon } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import type { User } from '@supabase/supabase-js';
import type { Collection, UserProfile } from '@/types/database';
import Sidebar from './Sidebar';
import UserMenu from '@/components/UserMenu';
import { createClient } from '@/lib/supabase/client';

interface DashboardLayoutProps {
    children: React.ReactNode;
    user: User;
    profile?: UserProfile | null;
    role?: 'user' | 'author' | 'admin' | null;
    activeFilter: string;
    onFilterChange: (filter: string) => void;
    collections?: Collection[];
    onCreateCollection?: () => void;
    isAdmin?: boolean;
    onUpload?: (files: FileList) => void;
    onUrlSubmit?: (url: string) => void;
    currentTheme: 'dark' | 'light';
    onThemeToggle: () => void;
}

export default function DashboardLayout({
    children,
    user,
    profile,
    role,
    activeFilter,
    onFilterChange,
    collections = [],
    onCreateCollection,
    isAdmin = false,
    onUpload,
    onUrlSubmit,
    currentTheme,
    onThemeToggle
}: DashboardLayoutProps) {
    const [showUrlModal, setShowUrlModal] = useState(false);
    const [urlInputValue, setUrlInputValue] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const supabase = createClient();



    const handleUrlSubmit = () => {
        if (urlInputValue && onUrlSubmit) {
            onUrlSubmit(urlInputValue);
            setUrlInputValue('');
            setShowUrlModal(false);
        }
    };

    return (
        <div className={`h-screen flex flex-col overflow-hidden relative transition-colors duration-300 ${currentTheme === 'light'
            ? 'bg-zinc-50 text-zinc-900'
            : 'bg-black text-foreground'
            }`}>
            {/* Dashboard Toolbar (Finder-style) */}
            <div className={`h-14 border-b flex items-center justify-between px-4 shrink-0 ${currentTheme === 'light'
                ? 'bg-white border-zinc-200'
                : 'bg-zinc-950 border-white/10'
                }`}>
                <div className="flex items-center gap-4">
                    <Link href="/" className={`p-2 rounded-lg transition-colors ${currentTheme === 'light'
                        ? 'hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900'
                        : 'hover:bg-white/10 text-muted-foreground hover:text-white'
                        }`}>
                        <ChevronLeft size={20} />
                    </Link>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                            <ChefHat size={18} className="text-black" />
                        </div>
                        <h1 className={`font-bold tracking-tight ${currentTheme === 'light' ? 'text-zinc-900' : 'text-white'}`}>Author Studio</h1>
                    </div>
                </div>

                <div className="flex-1 max-w-xl mx-8">
                    <div className="relative group">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            placeholder="Search recipes..."
                            className={`w-full border rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all font-display ${currentTheme === 'light'
                                ? 'bg-zinc-100 border-zinc-200 text-zinc-900 placeholder:text-zinc-400'
                                : 'bg-zinc-900 border-white/10 text-white'
                                }`}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Theme Toggle */}
                    <button
                        onClick={onThemeToggle}
                        className={`p-2 rounded-lg transition-colors relative ${currentTheme === 'light'
                            ? 'hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900'
                            : 'hover:bg-white/10 text-muted-foreground hover:text-white'
                            }`}
                        title={currentTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                    >
                        {currentTheme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                    </button>

                    {/* Notifications (placeholder) */}
                    <button className={`p-2 rounded-lg transition-colors relative ${currentTheme === 'light'
                        ? 'hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900'
                        : 'hover:bg-white/10 text-muted-foreground hover:text-white'
                        }`}>
                        <Bell size={20} />
                    </button>

                    {/* Hidden file input */}
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={(e) => e.target.files && onUpload?.(e.target.files)}
                        className="hidden"
                        accept="image/*"
                        multiple
                    />

                    <div className={`w-px h-6 mx-2 ${currentTheme === 'light' ? 'bg-zinc-200' : 'bg-white/10'}`} />

                    {/* User Menu Dropdown */}
                    <UserMenu user={user} profile={profile} role={role} />
                </div>
            </div>

            {/* Main Workspace Area (Finder Layout) */}
            <div className="flex-1 flex overflow-hidden min-h-0 relative">
                <Sidebar
                    activeFilter={activeFilter}
                    onFilterChange={onFilterChange}
                    collections={collections}
                    onCreateCollection={onCreateCollection}
                    isAdmin={isAdmin}
                    onShowUrlModal={() => setShowUrlModal(true)}
                    onMediaUpload={() => fileInputRef.current?.click()}
                    theme={currentTheme}
                />

                {/* Content Area */}
                <div className={`flex-1 flex min-w-0 relative min-h-0 z-0 ${currentTheme === 'light' ? 'bg-zinc-50' : 'bg-zinc-950'}`}>
                    {children}
                </div>
            </div>

            {/* URL Input Modal */}
            <AnimatePresence>
                {showUrlModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-md flex items-center justify-center p-4"
                        onClick={() => setShowUrlModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-zinc-900 border border-white/10 w-full max-w-md p-8 rounded-2xl shadow-2xl"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold text-white">URL toevoegen</h3>
                                <button
                                    onClick={() => setShowUrlModal(false)}
                                    className="p-2 hover:bg-white/10 rounded-lg text-muted-foreground hover:text-white transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <p className="text-muted-foreground text-sm mb-6">Plak een link van je favoriete receptensite.</p>

                            <input
                                type="url"
                                placeholder="https://example.com/lekker-recept"
                                className="w-full bg-zinc-800 border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all mb-6"
                                value={urlInputValue}
                                onChange={(e) => setUrlInputValue(e.target.value)}
                                autoFocus
                                onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
                            />
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowUrlModal(false)}
                                    className="flex-1 py-3 px-4 bg-zinc-800 text-white rounded-lg font-bold hover:bg-zinc-700 transition-colors"
                                >
                                    Annuleren
                                </button>
                                <button
                                    onClick={handleUrlSubmit}
                                    disabled={!urlInputValue}
                                    className="flex-1 py-3 px-4 bg-primary text-black rounded-lg font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Analyseren
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
