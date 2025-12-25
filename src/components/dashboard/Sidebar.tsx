'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutGrid, Clock, FolderOpen, Users, User, Home, Plus, Camera, Link as LinkIcon, ChevronDown } from 'lucide-react';
import type { Collection } from '@/types/database';

interface SidebarProps {
    activeFilter: string;
    onFilterChange: (filter: string) => void;
    collections?: Collection[];
    onCreateCollection?: () => void;
    isAdmin?: boolean;
    onShowAddMenu?: () => void;
    onShowUrlModal?: () => void;
    onMediaUpload?: () => void;
}

export default function Sidebar({
    activeFilter,
    onFilterChange,
    collections = [],
    onCreateCollection,
    isAdmin = false,
    onShowAddMenu,
    onShowUrlModal,
    onMediaUpload
}: SidebarProps) {
    const pathname = usePathname();
    const [collectionsExpanded, setCollectionsExpanded] = useState(false);
    const [showToevoegenMenu, setShowToevoegenMenu] = useState(false);

    return (
        <div className="w-64 bg-zinc-950 border-r border-white/10 flex flex-col h-full">
            {/* Dashboard Button - No Title */}
            <div className="p-4 pb-2">
                <button
                    onClick={() => onFilterChange('overview')}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${activeFilter === 'overview'
                        ? 'bg-white/10 text-white font-semibold shadow-sm'
                        : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
                        }`}
                >
                    <Home size={18} className={activeFilter === 'overview' ? "text-primary" : "text-zinc-500"} />
                    Dashboard
                </button>
            </div>

            {/* Recepten Management Section */}
            <div className="p-4 pt-2">
                <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-3 mb-2">Recepten management</h2>
                <div className="space-y-1">
                    {/* Toevoegen Button with Dropdown */}
                    <div className="relative">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowToevoegenMenu(!showToevoegenMenu);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold bg-primary text-black hover:bg-primary/90 transition-all"
                        >
                            <Plus size={18} />
                            Toevoegen
                        </button>

                        <AnimatePresence>
                            {showToevoegenMenu && (
                                <motion.div
                                    initial={{ opacity: 0, y: -5, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -5, scale: 0.95 }}
                                    transition={{ duration: 0.1 }}
                                    className="absolute left-0 right-0 top-full mt-1 bg-black/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden py-1 z-50"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <button
                                        onClick={() => {
                                            setShowToevoegenMenu(false);
                                            onMediaUpload?.();
                                        }}
                                        className="w-full text-left px-4 py-2.5 hover:bg-white/10 text-zinc-200 flex items-center gap-3 transition-colors text-sm font-semibold group/item"
                                    >
                                        <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center group-hover/item:bg-primary/20 group-hover/item:text-primary transition-colors">
                                            <Camera size={14} />
                                        </div>
                                        <span>Media</span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowToevoegenMenu(false);
                                            onShowUrlModal?.();
                                        }}
                                        className="w-full text-left px-4 py-2.5 hover:bg-white/10 text-zinc-200 flex items-center gap-3 transition-colors text-sm font-semibold group/item"
                                    >
                                        <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center group-hover/item:bg-primary/20 group-hover/item:text-primary transition-colors">
                                            <LinkIcon size={14} />
                                        </div>
                                        <span>URL</span>
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Alle recepten */}
                    <button
                        onClick={() => onFilterChange('all')}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${activeFilter === 'all'
                            ? 'bg-white/10 text-white font-semibold shadow-sm'
                            : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
                            }`}
                    >
                        <LayoutGrid size={18} className={activeFilter === 'all' ? "text-primary" : "text-zinc-500"} />
                        Alle recepten
                    </button>

                    {/* Collections (Collapsible) */}
                    <div>
                        <button
                            onClick={() => setCollectionsExpanded(!collectionsExpanded)}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${collectionsExpanded || collections.some(c => activeFilter === c.id)
                                ? 'bg-white/10 text-white font-semibold shadow-sm'
                                : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
                                }`}
                        >
                            <FolderOpen size={18} className={collectionsExpanded || collections.some(c => activeFilter === c.id) ? "text-primary" : "text-zinc-500"} />
                            <span className="flex-1 text-left">Collections</span>
                            <ChevronDown
                                size={16}
                                className={`transition-transform duration-200 ${collectionsExpanded ? 'rotate-180' : ''}`}
                            />
                        </button>

                        <AnimatePresence>
                            {collectionsExpanded && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden"
                                >
                                    <div className="pl-4 mt-1 space-y-0.5 border-l border-white/10 ml-5">
                                        {collections.length === 0 ? (
                                            <div className="px-3 py-2 text-xs text-zinc-500 italic">Geen collections</div>
                                        ) : (
                                            collections.map((collection) => (
                                                <button
                                                    key={collection.id}
                                                    onClick={() => onFilterChange(collection.id)}
                                                    className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-all ${activeFilter === collection.id
                                                        ? 'bg-white/10 text-white font-semibold'
                                                        : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
                                                        }`}
                                                >
                                                    {collection.name}
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Processing */}
                    <button
                        onClick={() => onFilterChange('drafts')}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${activeFilter === 'drafts'
                            ? 'bg-white/10 text-white font-semibold shadow-sm'
                            : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
                            }`}
                    >
                        <Clock size={18} className={activeFilter === 'drafts' ? "text-primary" : "text-zinc-500"} />
                        Processing
                    </button>
                </div>
            </div>

            {/* Administratie Section */}
            <div className="p-4 pt-0">
                <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-3 mb-2">Administratie</h2>
                <div className="space-y-1">
                    <Link
                        href="/dashboard/profile"
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${pathname === '/dashboard/profile'
                            ? 'bg-white/10 text-white font-semibold'
                            : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
                            }`}
                    >
                        <User size={18} className={pathname === '/dashboard/profile' ? "text-primary" : "text-zinc-500"} />
                        Auteurs profiel
                    </Link>
                    {isAdmin && (
                        <Link
                            href="/dashboard/users"
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${pathname === '/dashboard/users'
                                ? 'bg-white/10 text-white font-semibold'
                                : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
                                }`}
                        >
                            <Users size={18} className={pathname === '/dashboard/users' ? "text-primary" : "text-zinc-500"} />
                            Gebruikersbeheer
                        </Link>
                    )}
                </div>
            </div>

            {/* Storage at bottom */}
            <div className="mt-auto p-4 border-t border-white/10">
                <div className="bg-zinc-900 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-white">Storage</span>
                        <span className="text-xs text-muted-foreground">75%</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-primary h-full rounded-full w-3/4" />
                    </div>
                </div>
            </div>
        </div>
    );
}
