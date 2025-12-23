import React, { useState, useEffect, useRef } from 'react';
import { ChefHat, Search, Bell, ChevronLeft, Plus, Camera, Link as LinkIcon, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './Sidebar';
import ActivityPanel from './ActivityPanel';
import { getUnreadCount } from '../../lib/activityService';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { getAvatarUrl } from '../../lib/profileService';
import UserMenu from '../UserMenu';

export default function DashboardLayout({ children, user, signOut, activeFilter, onFilterChange, collections = [], onCreateCollection, isAdmin = false, onUpload, onUrlSubmit }) {
    const [showActivities, setShowActivities] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showAddMenu, setShowAddMenu] = useState(false);
    const [showUrlModal, setShowUrlModal] = useState(false);
    const [urlInputValue, setUrlInputValue] = useState('');
    const fileInputRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = () => setShowAddMenu(false);
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    // Fetch initial count and subscribe to changes
    useEffect(() => {
        if (!user) return;

        const updateCount = async () => {
            const count = await getUnreadCount(user.id);
            setUnreadCount(count);
        };

        updateCount();

        // Subscribe to new activities for badge update
        const channel = supabase
            .channel('dashboard-activities')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'user_activities', filter: `user_id=eq.${user.id}` },
                () => {
                    setUnreadCount(prev => prev + 1);
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'user_activities', filter: `user_id=eq.${user.id}` },
                () => updateCount() // Refresh on read status change
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    const handleUrlSubmit = () => {
        if (urlInputValue && onUrlSubmit) {
            onUrlSubmit(urlInputValue);
            setUrlInputValue('');
            setShowUrlModal(false);
        }
    };

    return (
        <div className="h-screen bg-black text-foreground flex flex-col overflow-hidden relative">
            {/* Dashboard Toolbar (Finder-style) */}
            <div className="h-14 bg-zinc-950 border-b border-white/10 flex items-center justify-between px-4 shrink-0">
                <div className="flex items-center gap-4">
                    <Link to="/" className="p-2 hover:bg-white/10 rounded-lg text-muted-foreground hover:text-white transition-colors">
                        <ChevronLeft size={20} />
                    </Link>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                            <ChefHat size={18} className="text-black" />
                        </div>
                        <h1 className="font-bold text-white tracking-tight">Author Studio</h1>
                    </div>
                </div>

                <div className="flex-1 max-w-xl mx-8">
                    <div className="relative group">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            placeholder="Search recipes..."
                            className="w-full bg-zinc-900 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all font-display"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowActivities(!showActivities)}
                        className={`p-2 rounded-lg transition-colors relative ${showActivities ? 'bg-primary/20 text-primary' : 'hover:bg-white/10 text-muted-foreground hover:text-white'}`}
                    >
                        <Bell size={20} />
                        {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-red-500 rounded-full flex items-center justify-center text-[9px] font-bold text-white shadow-sm ring-2 ring-black">
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        )}
                    </button>

                    {/* Toevoegen Button with Dropdown */}
                    <div className="relative">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowAddMenu(!showAddMenu);
                            }}
                            className="flex items-center gap-2 px-3 py-2 bg-primary text-black rounded-lg font-bold text-xs uppercase tracking-wider hover:bg-primary/90 transition-colors"
                        >
                            <Plus size={16} />
                            <span>Toevoegen</span>
                        </button>

                        <AnimatePresence>
                            {showAddMenu && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    transition={{ duration: 0.1 }}
                                    className="absolute top-full right-0 mt-2 w-52 bg-black/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden py-2 z-50"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {/* Media option */}
                                    <button
                                        onClick={() => {
                                            setShowAddMenu(false);
                                            fileInputRef.current?.click();
                                        }}
                                        className="w-full text-left px-4 py-2.5 hover:bg-white/10 text-zinc-200 flex items-center gap-3 transition-colors text-sm font-semibold group/item"
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover/item:bg-primary/20 group-hover/item:text-primary transition-colors">
                                            <Camera size={16} />
                                        </div>
                                        <span>Media</span>
                                    </button>
                                    {/* URL option */}
                                    <button
                                        onClick={() => {
                                            setShowAddMenu(false);
                                            setShowUrlModal(true);
                                        }}
                                        className="w-full text-left px-4 py-2.5 hover:bg-white/10 text-zinc-200 flex items-center gap-3 transition-colors text-sm font-semibold group/item"
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover/item:bg-primary/20 group-hover/item:text-primary transition-colors">
                                            <LinkIcon size={16} />
                                        </div>
                                        <span>URL</span>
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Hidden file input */}
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={(e) => e.target.files && onUpload && onUpload(e.target.files)}
                        className="hidden"
                        accept="image/*"
                        multiple
                    />

                    <div className="w-px h-6 bg-white/10 mx-2" />

                    {/* User Menu Dropdown */}
                    <UserMenu />
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
                />

                {/* Content Area (List + Preview) */}
                <div className="flex-1 flex min-w-0 bg-background relative min-h-0 z-0">
                    {children}
                </div>

                {/* Activity Log Panel Overlay */}
                <ActivityPanel
                    isOpen={showActivities}
                    onClose={() => setShowActivities(false)}
                    userId={user?.id}
                />
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

