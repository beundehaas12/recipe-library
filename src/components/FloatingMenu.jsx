import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X } from 'lucide-react';

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
        { label: 'Ontdek', path: '/' },
        { label: 'Planning', path: '/planning' },
        { label: 'Boodschappen', path: '/shopping' },
        { label: 'Mijn kookboek', path: '/favorites' },
    ];

    if (location.pathname.startsWith('/recipe/') || location.pathname.startsWith('/dashboard') || location.pathname.startsWith('/settings')) return null;

    return (
        <div className="fixed top-4 left-0 right-0 z-[5000] justify-center px-4 pointer-events-none hidden lg:flex">
            <div
                className="pointer-events-auto bg-black/80 backdrop-blur-xl border border-white/10 shadow-2xl flex items-center h-11 rounded-full p-1 min-w-[420px]"
            >
                <AnimatePresence mode="wait">
                    {/* SEARCH EXPANDED VIEW */}
                    {isSearchOpen ? (
                        <motion.form
                            key="search"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="flex items-center gap-2 w-full px-2"
                            onSubmit={handleSearchSubmit}
                        >
                            <Search size={18} className="text-white/50" />
                            <input
                                ref={inputRef}
                                type="text"
                                placeholder="Zoek recepten..."
                                className="flex-1 bg-transparent border-none text-white focus:outline-none placeholder:text-white/30 h-full text-sm font-medium"
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    onSearch(e.target.value);
                                    // Navigate to home if not already there
                                    if (location.pathname !== '/') {
                                        navigate('/');
                                    }
                                }}
                            />
                            <button
                                type="button"
                                onClick={handleCloseSearch}
                                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </motion.form>
                    ) : (
                        /* DEFAULT MENU VIEW */
                        <motion.div
                            key="menu"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center gap-1 md:gap-1"
                        >
                            {navItems.map((item) => {
                                const isActive = location.pathname === item.path;
                                return (
                                    <NavLink
                                        key={item.label}
                                        to={item.path}
                                        className={({ isActive }) => `
                                            relative px-4 h-9 flex items-center justify-center rounded-full text-sm font-bold tracking-wide transition-all
                                            ${isActive ? 'text-black bg-primary' : 'text-white/70 hover:text-white hover:bg-white/10'}
                                        `}
                                    >
                                        {item.label}
                                    </NavLink>
                                );
                            })}

                            <div className="w-px h-4 bg-white/10 mx-1" />

                            <button
                                onClick={() => setIsSearchOpen(true)}
                                className="w-9 h-9 flex items-center justify-center rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                            >
                                <Search size={18} />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
