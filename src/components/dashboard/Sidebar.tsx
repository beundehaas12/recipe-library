'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutGrid, Clock, FolderOpen, Users, User, Home, Plus, Camera, Link as LinkIcon, ChevronDown, Rocket, Settings, LogOut, CheckCircle2 } from 'lucide-react';
import type { Collection, UserProfile } from '@/types/database';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface SidebarProps {
    user?: SupabaseUser;
    profile?: UserProfile | null;
    activeFilter: string;
    onFilterChange: (filter: string) => void;
    collections?: Collection[];
    onCreateCollection?: () => void;
    isAdmin?: boolean;
    onShowAddMenu?: () => void;
    onShowUrlModal?: () => void;
    onMediaUpload?: () => void;
    theme?: 'dark' | 'light';
}

export default function Sidebar({
    user,
    profile,
    activeFilter,
    onFilterChange,
    collections = [],
    onCreateCollection,
    isAdmin = false,
    onShowAddMenu,
    onShowUrlModal,
    onMediaUpload,
    theme = 'light' // Default to light for this design
}: SidebarProps) {
    const pathname = usePathname();
    const [collectionsExpanded, setCollectionsExpanded] = useState(true);
    const [showToevoegenMenu, setShowToevoegenMenu] = useState(false);

    // Monochrome Design - No Blue
    const activeClass = "bg-zinc-100 text-zinc-900 font-bold";
    const inactiveClass = "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50";

    const NavItem = ({ active, onClick, icon: Icon, label, href }: any) => {
        if (href) {
            return (
                <Link href={href} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${active ? activeClass : inactiveClass}`}>
                    <Icon size={20} className={active ? "text-zinc-900" : "text-zinc-400"} />
                    {label}
                </Link>
            );
        }
        return (
            <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${active ? activeClass : inactiveClass}`}>
                <Icon size={20} className={active ? "text-zinc-900" : "text-zinc-400"} />
                {label}
            </button>
        );
    };

    return (
        <div className="w-[280px] flex flex-col h-full bg-white shadow-sm flex-shrink-0">
            {/* 1. Header: User Profile */}
            <div className="p-6 pb-2">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-zinc-100 ring-2 ring-white shadow-sm">
                        {profile?.avatar_url ? (
                            <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-400">
                                <User size={20} />
                            </div>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-zinc-900 truncate text-sm">{profile?.first_name || 'Chef'} {profile?.last_name}</h3>
                        <p className="text-xs text-zinc-400 truncate">{user?.email}</p>
                    </div>
                </div>


            </div>

            {/* 2. Navigation */}
            <div className="flex-1 overflow-y-auto px-4 space-y-1">
                <div className="text-xs font-semibold text-zinc-400 px-4 mb-2 mt-2 uppercase tracking-wider">Main Menu</div>

                <NavItem
                    active={pathname === '/dashboard' && activeFilter === 'overview'}
                    onClick={() => onFilterChange('overview')}
                    icon={LayoutGrid}
                    label="Overview"
                />
                <NavItem
                    active={pathname === '/dashboard' && activeFilter === 'all'}
                    onClick={() => onFilterChange('all')}
                    icon={FolderOpen}
                    label="All Recipes"
                />

                {/* Toevoegen Dropdown Trigger */}
                <div className="relative">
                    <button
                        onClick={() => setShowToevoegenMenu(!showToevoegenMenu)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${inactiveClass} justify-between`}
                    >
                        <div className="flex items-center gap-3">
                            <Plus size={20} className="text-zinc-400" />
                            <span>Add New</span>
                        </div>
                        <ChevronDown size={14} className={`transition-transform ${showToevoegenMenu ? 'rotate-180' : ''}`} />
                    </button>
                    <AnimatePresence>
                        {showToevoegenMenu && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden pl-4 pr-2 space-y-1"
                            >
                                <button onClick={() => { setShowToevoegenMenu(false); onMediaUpload?.(); }} className="w-full text-left px-4 py-2 text-sm text-zinc-500 hover:text-zinc-900 flex items-center gap-2">
                                    <Camera size={16} /> Media
                                </button>
                                <button onClick={() => { setShowToevoegenMenu(false); onShowUrlModal?.(); }} className="w-full text-left px-4 py-2 text-sm text-zinc-500 hover:text-zinc-900 flex items-center gap-2">
                                    <LinkIcon size={16} /> URL
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="text-xs font-semibold text-zinc-400 px-4 mb-2 mt-6 uppercase tracking-wider">Workspace</div>
                <NavItem
                    active={pathname === '/dashboard' && activeFilter === 'drafts'}
                    onClick={() => onFilterChange('drafts')}
                    icon={Clock}
                    label="Processing"
                />
                {isAdmin && (
                    <NavItem
                        href="/dashboard/users"
                        active={pathname === '/dashboard/users'}
                        icon={Users}
                        label="Team"
                    />
                )}
                <NavItem
                    href="/dashboard/profile"
                    active={pathname === '/dashboard/profile'}
                    icon={Settings}
                    label="Settings"
                />
            </div>

            {/* 3. Bottom Pro Card */}
            <div className="p-4 mt-auto">
                <div className="bg-zinc-900 rounded-2xl p-5 text-white shadow-lg shadow-zinc-900/10 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-3 opacity-10">
                        <Rocket size={60} />
                    </div>
                    <h3 className="font-bold text-lg mb-1 relative z-10">Upgrade to Pro</h3>
                    <p className="text-zinc-400 text-xs mb-4 relative z-10 opacity-90">Get unlimited recipes and AI features.</p>
                    <button className="w-full bg-white text-zinc-900 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:bg-zinc-100 transition-colors relative z-10">
                        Upgrade Now
                    </button>
                </div>
            </div>
        </div>
    );
}
