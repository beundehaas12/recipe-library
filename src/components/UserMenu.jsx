import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, LogOut, LayoutGrid, User, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getAvatarUrl } from '../lib/profileService';

export default function UserMenu() {
    const { user, profile, signOut, role } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const location = useLocation();
    const menuRef = useRef(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!user) return null;

    const isOnDashboard = location.pathname.startsWith('/dashboard');
    const isSpecialUser = role === 'admin' || role === 'author';
    const displayName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || user?.email?.split('@')[0];
    const displayRole = role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Author';

    // Helper toggle function
    const toggleMenu = (e) => {
        e.stopPropagation();
        setIsOpen(!isOpen);
    };

    return (
        <div className="relative" ref={menuRef}>
            {isSpecialUser ? (
                // Split Button Design for Authors/Admins
                <div className={`group flex items-center bg-black/40 backdrop-blur-md rounded-full transition-all shadow-sm ${isOpen ? 'ring-2 ring-primary/50 border-primary/50' : ''}`}>
                    {/* Main Part: Avatar + Name */}
                    <button
                        onClick={toggleMenu}
                        className="flex items-center gap-3 pl-1.5 pr-2 py-1.5 rounded-l-full transition-colors focus:outline-none"
                    >
                        <div className="relative overflow-hidden rounded-full border border-white/10 shadow-sm w-8 h-8">
                            <img
                                src={getAvatarUrl(profile, user)}
                                alt="User"
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <div className="hidden md:flex flex-col items-start text-left">
                            <span className="text-xs font-bold text-white leading-none mb-0.5">{displayName}</span>
                            <span className="text-[10px] font-semibold text-primary/80 uppercase tracking-wider leading-none">{displayRole}</span>
                        </div>
                    </button>

                    {/* Dropdown Action Part */}
                    <button
                        onClick={toggleMenu}
                        className="w-8 h-8 mr-1 rounded-full hover:bg-white/10 transition-colors focus:outline-none flex items-center justify-center text-zinc-400 group-hover:text-white"
                        aria-label="Open user menu"
                    >
                        <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                </div>
            ) : (
                // Standard Button for Users
                <button
                    onClick={toggleMenu}
                    className="w-11 h-11 md:w-9 md:h-9 rounded-full bg-zinc-800/80 backdrop-blur-md border border-white/10 overflow-hidden hover:border-white/30 transition-all focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-xl"
                >
                    <img
                        src={getAvatarUrl(profile, user)}
                        alt="User"
                        className="w-full h-full object-cover"
                    />
                </button>
            )}

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        transition={{ duration: 0.1 }}
                        className="absolute right-0 top-full mt-2 w-56 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-[60] flex flex-col py-1"
                    >
                        <div className="px-4 py-3 border-b border-white/5">
                            <p className="text-sm font-medium text-white truncate">
                                {[profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || user?.email?.split('@')[0]}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                                {user?.email}
                            </p>
                        </div>

                        {!isOnDashboard && (
                            <Link
                                to="/dashboard"
                                onClick={() => setIsOpen(false)}
                                className="px-4 py-2 text-sm text-zinc-300 hover:text-white hover:bg-white/10 flex items-center gap-2 transition-colors"
                            >
                                <LayoutGrid size={16} />
                                Dashboard
                            </Link>
                        )}

                        <Link
                            to="/settings"
                            onClick={() => setIsOpen(false)}
                            className="px-4 py-2 text-sm text-zinc-300 hover:text-white hover:bg-white/10 flex items-center gap-2 transition-colors"
                        >
                            <Settings size={16} />
                            Instellingen
                        </Link>

                        <div className="h-px bg-white/5 my-1" />

                        <button
                            onClick={() => {
                                setIsOpen(false);
                                signOut();
                            }}
                            className="px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 flex items-center gap-2 transition-colors text-left w-full"
                        >
                            <LogOut size={16} />
                            Log uit
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
