'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutGrid, Clock, FolderOpen, Users, User, Home, Plus, Camera, Link as LinkIcon, ChevronDown, Rocket, Settings, LogOut, CheckCircle2, Library, PanelLeftClose } from 'lucide-react';
import type { Collection, UserProfile } from '@/types/database';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface SidebarProps {
    user?: SupabaseUser;
    profile?: UserProfile | null;
    collections?: Collection[];
    onCreateCollection?: () => void;
    onShowAddMenu?: () => void;
    onShowUrlModal?: () => void;
    onMediaUpload?: () => void;

    theme?: 'dark' | 'light';
    isCollapsed?: boolean;
    onToggleCollapse?: () => void;
}

export default function Sidebar({
    user,
    profile,
    collections = [],
    onCreateCollection,
    onShowAddMenu,
    onShowUrlModal,
    onMediaUpload,

    theme = 'light',
    isCollapsed = false,
    onToggleCollapse,
}: SidebarProps) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const currentView = searchParams.get('view');

    // Overview is active if pathname is /dashboard AND view is empty or 'overview'
    // Other items usually match specific routes or views
    const isOverview = pathname === '/dashboard' && (!currentView || currentView === 'overview');

    const [showToevoegenMenu, setShowToevoegenMenu] = useState(false);

    // Monochrome Design - No Blue
    const activeClass = "bg-zinc-100 text-zinc-900 font-bold";
    const inactiveClass = "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50";

    const NavItem = ({ active, onClick, icon: Icon, label, href, badgeCount }: any) => {
        const content = (
            <>
                <Icon size={20} className={`shrink-0 w-5 h-5 ${active ? "text-zinc-900" : "text-zinc-400"}`} />
                {!isCollapsed && (
                    <>
                        <span className="whitespace-nowrap overflow-hidden flex-1">{label}</span>
                        {badgeCount > 0 && (
                            <span className="ml-auto px-2 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[20px] text-center">
                                {badgeCount}
                            </span>
                        )}
                    </>
                )}
                {isCollapsed && badgeCount > 0 && (
                    <span className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[16px] text-center">
                        {badgeCount}
                    </span>
                )}
                {isCollapsed && (
                    <div className="absolute left-[calc(100%+10px)] top-1/2 -translate-y-1/2 bg-zinc-900 text-white text-xs font-bold px-3 py-1.5 rounded-md shadow-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-[100]">
                        {label}
                    </div>
                )}
            </>
        );

        const className = `relative group flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${active ? activeClass : inactiveClass} ${isCollapsed ? 'justify-center' : ''}`;

        if (href) {
            return (
                <Link href={href} className={className}>
                    {content}
                </Link>
            );
        }
        return (
            <button onClick={onClick} className={`w-full ${className}`}>
                {content}
            </button>
        );
    };

    return (

        <div className={`${isCollapsed ? 'w-20' : 'w-[280px]'} flex flex-col h-full bg-white border-r border-zinc-100 flex-shrink-0 relative`}>
            <button
                onClick={onToggleCollapse}
                className={`p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors z-50 flex items-center justify-center ${isCollapsed ? 'mx-auto mt-4 mb-2' : 'absolute top-3 right-3'}`}
            >
                <PanelLeftClose size={20} className={`shrink-0 transition-transform ${isCollapsed ? 'rotate-180' : ''}`} />
            </button>

            {/* 2. Navigation */}
            <div className={`flex-1 px-4 space-y-1 ${isCollapsed ? 'mt-2 overflow-visible' : 'mt-14 overflow-y-auto'}`}>
                {/* Overview Above Title */}
                <NavItem
                    href="/dashboard"
                    active={isOverview}
                    icon={LayoutGrid}
                    label="Overview"
                />

                {/* Main Menu Title (Renamed) */}
                {/* Main Menu Title (Renamed) */}
                {!isCollapsed && <div className="text-xs font-semibold text-zinc-400 px-4 mb-2 mt-6 uppercase tracking-wider">Receptenbeheer</div>}

                <NavItem
                    href="/dashboard?view=all"
                    active={pathname === '/dashboard' && currentView === 'all'}
                    icon={FolderOpen}
                    label="All Recipes"
                />

                {/* Collections (Simplified to Button) */}
                <NavItem
                    href="/dashboard?view=collections"
                    active={pathname === '/dashboard' && currentView === 'collections'}
                    icon={Library}
                    label="Collections"
                />

                {/* Toevoegen Dropdown Trigger */}
                <div className="relative">
                    <button
                        onClick={() => setShowToevoegenMenu(!showToevoegenMenu)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${inactiveClass} justify-between`}
                    >
                        <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center w-full' : ''}`}>
                            <Plus size={20} className="text-zinc-400 shrink-0" />
                            {!isCollapsed && <span>Add New</span>}
                        </div>
                        {!isCollapsed && <ChevronDown size={14} className={`transition-transform ${showToevoegenMenu ? 'rotate-180' : ''}`} />}
                    </button>
                    {/* Simplified Add Menu Logic for collapsed? Or keep it simple */}
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

                {!isCollapsed && <div className="text-xs font-semibold text-zinc-400 px-4 mb-2 mt-6 uppercase tracking-wider">Workspace</div>}
                <NavItem
                    href="/dashboard?view=drafts"
                    active={pathname === '/dashboard' && currentView === 'drafts'}
                    icon={Clock}
                    label="Processing"
                />
                <NavItem
                    href="/dashboard/profile"
                    active={pathname === '/dashboard/profile'}
                    icon={Settings}
                    label="Settings"
                />


            </div>
        </div>
    );
}
