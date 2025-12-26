'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChefHat, Search, LogOut, X, Menu, Compass, Calendar, ShoppingBasket, Heart } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import type { UserProfile } from '@/types/database';
import { translations as t } from '@/lib/translations';
import { createClient } from '@/lib/supabase/client';
import BackButton from './BackButton';
import UserMenu from './UserMenu';
import SearchOverlay from './SearchOverlay';

interface AppHeaderProps {
    user: User;
    profile?: UserProfile | null;
    role?: 'user' | 'author' | 'admin' | null;
}

export default function AppHeader({
    user,
    profile,
    role,
}: AppHeaderProps) {
    const [showSearch, setShowSearch] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
    const supabase = createClient();

    // Initial value from URL
    const initialQuery = searchParams.get('q') || '';


    // Hide header on dashboard/admin/settings (they have their own layout)
    if (pathname.startsWith('/dashboard') || pathname.startsWith('/admin') || pathname.startsWith('/settings')) return null;

    const isDeepPage = pathname.startsWith('/recipe/') || pathname.startsWith('/collection/') || pathname.startsWith('/author/');

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/');
        router.refresh();
    };

    const navItems = [
        { icon: Compass, label: 'Ontdek', path: '/' },
        { icon: Calendar, label: 'Planning', path: '/planning' },
        { icon: ShoppingBasket, label: 'Boodschappen', path: '/shopping' },
        { icon: Heart, label: 'Favorieten', path: '/favorites' },
    ];

    return (
        <>
            {/* Cinematic Navbar - Transparent by default */}
            <header className="fixed top-0 left-0 right-0 z-50 pointer-events-none px-4 lg:px-20 py-4">
                <div className="w-full flex items-center justify-between">
                    <div className="flex items-center gap-3 pointer-events-auto relative z-[5000]">
                        {isDeepPage && (
                            <BackButton className="!bg-black/40 !backdrop-blur-md !border-white/10" />
                        )}

                        {!isDeepPage && (
                            <>
                                {/* Mobile Hamburger */}
                                <button
                                    onClick={() => setMobileMenuOpen(true)}
                                    className="lg:hidden w-11 h-11 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-black/60 transition-all"
                                >
                                    <Menu size={22} />
                                </button>
                            </>
                        )}

                        {/* Logo - always visible */}
                        <div className="hidden lg:flex bg-black/40 backdrop-blur-md border border-white/10 text-primary p-2.5 rounded-full">
                            <ChefHat size={22} />
                        </div>
                        <h1 className="text-xl font-bold text-white tracking-tight drop-shadow-md hidden lg:block">
                            {t.appTitle}
                        </h1>
                    </div>

                    <div className="flex items-center gap-3 flex-1 justify-end max-w-2xl pointer-events-auto relative z-[5000]">
                        <div className="flex-1" />

                        {/* Search Icon (Desktop & Mobile Unified) */}
                        <button
                            onClick={() => setShowSearch(true)}
                            className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-black/60 transition-all active:scale-95"
                        >
                            <Search size={22} />
                        </button>

                        {/* User Profile */}
                        <UserMenu user={user} profile={profile} role={role} />
                    </div>
                </div>
            </header>

            {/* Search Overlay */}
            <SearchOverlay
                isOpen={showSearch}
                onClose={() => setShowSearch(false)}
                initialQuery={initialQuery}
            />

            {/* Mobile Hamburger Menu Overlay */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-md lg:hidden"
                        onClick={() => setMobileMenuOpen(false)}
                    >
                        <motion.div
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                            className="absolute top-0 left-0 bottom-0 w-[80%] max-w-sm bg-zinc-900 border-r border-white/10 shadow-3xl p-6 flex flex-col"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-3">
                                    <div className="bg-primary/10 text-primary p-2 rounded-xl">
                                        <ChefHat size={24} />
                                    </div>
                                    <h2 className="text-xl font-black text-white tracking-tight">{t.appTitle}</h2>
                                </div>
                                <button
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="p-2 text-white/50 hover:text-white rounded-full hover:bg-white/5"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            <nav className="flex flex-col gap-2">
                                {navItems.map((item) => {
                                    const isActive = pathname === item.path;
                                    return (
                                        <Link
                                            key={item.label}
                                            href={item.path}
                                            onClick={() => setMobileMenuOpen(false)}
                                            className={`flex items-center gap-4 px-4 py-4 rounded-xl font-bold transition-all ${isActive ? 'bg-primary text-black' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                                        >
                                            <item.icon size={20} />
                                            {item.label}
                                        </Link>
                                    );
                                })}
                            </nav>

                            <div className="mt-auto pt-6 border-t border-white/5">
                                <div className="px-4 py-2 mb-2">
                                    <p className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-black">{t.signedInAs}</p>
                                    <p className="text-white font-bold truncate text-sm mt-1">
                                        {[profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || user.email}
                                    </p>
                                </div>
                                <button
                                    onClick={handleSignOut}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-colors text-sm font-bold"
                                >
                                    <LogOut size={18} />
                                    <span>{t.signOut}</span>
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
