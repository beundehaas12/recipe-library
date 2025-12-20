import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X } from 'lucide-react';

export default function FloatingMenu({ onSearch }) {
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const inputRef = useRef(null);
    const location = useLocation();

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
        { label: 'Ontdek', path: '/' },
        { label: 'Planning', path: '/planning' },
        { label: 'Boodschappen', path: '/shopping' },
        { label: 'Favorieten', path: '/favorites' },
    ];

    return (
        <div className="fixed top-6 left-0 right-0 z-[60] flex justify-center px-4 pointer-events-none">
            <motion.div
                layout
                className={`pointer-events-auto bg-black/80 backdrop-blur-xl border border-white/10 shadow-2xl flex items-center ${isSearchOpen ? 'rounded-full p-2 w-full max-w-2xl' : 'rounded-full p-2'}`}
            >
                <AnimatePresence mode="wait">
                    {/* SEARCH EXPANDED VIEW */}
                    {isSearchOpen ? (
                        <motion.form
                            key="search"
                            initial={{ opacity: 0, width: '90%' }}
                            animate={{ opacity: 1, width: '100%' }}
                            exit={{ opacity: 0, width: '90%' }}
                            transition={{ duration: 0.2 }}
                            className="flex items-center gap-3 w-full pl-2"
                            onSubmit={handleSearchSubmit}
                        >
                            <Search size={20} className="text-white/50" />
                            <input
                                ref={inputRef}
                                type="text"
                                placeholder="Zoek recepten..."
                                className="flex-1 bg-transparent border-none text-white focus:outline-none placeholder:text-white/30 h-10 text-base"
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    onSearch(e.target.value);
                                }}
                            />
                            <button
                                type="button"
                                onClick={handleCloseSearch}
                                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </motion.form>
                    ) : (
                        /* DEFAULT MENU VIEW */
                        <motion.div
                            key="menu"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center gap-1 md:gap-2"
                        >
                            {navItems.map((item) => {
                                const isActive = location.pathname === item.path;
                                return (
                                    <NavLink
                                        key={item.label}
                                        to={item.path}
                                        className={({ isActive }) => `
                                            relative px-4 h-10 flex items-center justify-center rounded-full text-sm font-bold tracking-wide transition-all
                                            ${isActive ? 'text-black bg-primary' : 'text-white/70 hover:text-white hover:bg-white/10'}
                                        `}
                                    >
                                        {item.label}
                                    </NavLink>
                                );
                            })}

                            <div className="w-px h-5 bg-white/10 mx-2" />

                            <button
                                onClick={() => setIsSearchOpen(true)}
                                className="w-10 h-10 flex items-center justify-center rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                            >
                                <Search size={20} />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}
