import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Compass, Calendar, ShoppingBasket, Heart, Search, X } from 'lucide-react';
import { translations as t } from '../lib/translations';

export default function FloatingMenu({ onSearch }) {
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const inputRef = useRef(null);
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        if (isSearchOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isSearchOpen]);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        onSearch(searchQuery);
    };

    const handleCloseSearch = () => {
        setIsSearchOpen(false);
        setSearchQuery('');
        onSearch('');
    };

    const navItems = [
        { icon: Compass, label: 'Ontdek', path: '/' },
        { icon: Calendar, label: 'Planning', path: '/planning' },
        { icon: ShoppingBasket, label: 'Boodschappen', path: '/shopping' },
        { icon: Heart, label: 'Favorieten', path: '/favorites' },
    ];

    return (
        <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
            <motion.div
                layout
                className={`pointer-events-auto bg-black/80 backdrop-blur-xl border border-white/10 shadow-2xl flex items-center gap-1 ${isSearchOpen ? 'rounded-2xl p-2 w-full max-w-2xl' : 'rounded-full p-2'}`}
            >
                <AnimatePresence mode="popLayout">
                    {/* SEARCH EXPANDED VIEW */}
                    {isSearchOpen ? (
                        <motion.form
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex-1 flex items-center gap-2 w-full"
                            onSubmit={handleSearchSubmit}
                        >
                            <Search size={20} className="text-white/50 ml-3 shrink-0" />
                            <input
                                ref={inputRef}
                                type="text"
                                placeholder="Zoek recepten..." // t.searchPlaceholder
                                className="flex-1 bg-transparent border-none text-white focus:outline-none placeholder:text-white/30 h-10"
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    onSearch(e.target.value); // Live search
                                }}
                            />
                            <button
                                type="button"
                                onClick={handleCloseSearch}
                                className="p-2 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </motion.form>
                    ) : (
                        /* DEFAULT MENU VIEW */
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center gap-1 sm:gap-2"
                        >
                            {navItems.map((item) => {
                                const isActive = location.pathname === item.path;
                                return (
                                    <NavLink
                                        key={item.label}
                                        to={item.path}
                                        className={({ isActive }) => `
                                            relative flex items-center justify-center w-12 h-12 rounded-full transition-all group
                                            ${isActive ? 'text-primary bg-white/10' : 'text-white/60 hover:text-white hover:bg-white/5'}
                                        `}
                                    >
                                        <item.icon size={22} className="relative z-10" />
                                        {isActive && (
                                            <motion.div
                                                layoutId="activeTab"
                                                className="absolute inset-0 bg-white/10 rounded-full"
                                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                            />
                                        )}

                                        {/* Tooltip */}
                                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/90 rounded text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-white/10">
                                            {item.label}
                                        </div>
                                    </NavLink>
                                );
                            })}

                            {/* Separator */}
                            <div className="w-px h-6 bg-white/10 mx-1" />

                            {/* Search Trigger */}
                            <button
                                onClick={() => setIsSearchOpen(true)}
                                className="flex items-center justify-center w-12 h-12 rounded-full text-white/60 hover:text-white hover:bg-white/5 transition-all"
                            >
                                <Search size={22} />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}
