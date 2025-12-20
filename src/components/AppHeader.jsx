import React, { useState, useEffect } from 'react';
import { ChefHat, Plus, Camera as CameraCaptureIcon, Upload as UploadIcon, Link as LinkIcon, Search, LogOut, X, Menu, Compass, Calendar, ShoppingBasket, Heart, UserPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';

export default function AppHeader({
    user,
    signOut,
    t,
    searchQuery,
    handleSearch,
    clearSearch,
    instantFilteredRecipes,
    searchResults,
    onCameraClick,
    onUrlClick,
    workspace,
    workspaceMembers = [],
    onInviteClick
}) {
    const [showAddMenu, setShowAddMenu] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [showMobileSearch, setShowMobileSearch] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = () => {
            setShowAddMenu(false);
            setShowProfileMenu(false);
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    // Hide header on recipe detail pages to favor the back button
    if (location.pathname.startsWith('/recipe/')) return null;

    return (
        <>
            {/* Cinematic Navbar - Transparent by default like Detail Page */}
            <header className="fixed top-0 left-0 right-0 z-50 pointer-events-none px-4 lg:px-20 py-4">
                <div className="max-w-[1600px] mx-auto w-full flex items-center justify-between">
                    <div className="flex items-center gap-3 pointer-events-auto relative z-[5000]">
                        {/* Mobile Hamburger */}
                        <button
                            onClick={() => setMobileMenuOpen(true)}
                            className="lg:hidden w-11 h-11 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-black/60 transition-all"
                        >
                            <Menu size={22} />
                        </button>

                        <div className={`hidden lg:flex bg-black/40 backdrop-blur-md border border-white/10 text-primary p-2.5 rounded-full`}>
                            <ChefHat size={22} />
                        </div>
                        <h1 className="text-xl font-bold text-white tracking-tight drop-shadow-md hidden lg:block">
                            {t.appTitle}
                        </h1>
                    </div>

                    <div className="flex items-center gap-3 flex-1 justify-end max-w-2xl pointer-events-auto relative z-[5000]">
                        {/* Search Input Moved to FloatingMenu - Keep spacer if needed or remove */}
                        <div className="flex-1" />

                        {/* Mobile Search Icon */}
                        <button
                            onClick={() => setShowMobileSearch(true)}
                            className="lg:hidden w-11 h-11 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-black/60 transition-all"
                        >
                            <Search size={22} />
                        </button>

                        {/* Add Recipe */}
                        <div className="relative">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowAddMenu(!showAddMenu);
                                    setShowProfileMenu(false);
                                }}
                                className="w-11 h-11 md:h-11 md:w-auto md:px-5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 hover:bg-black/60 transition-all flex items-center justify-center md:gap-3 whitespace-nowrap active:scale-95 group shadow-xl"
                            >
                                <Plus size={22} className="text-primary md:hidden" />
                                <div className="hidden md:flex w-6 h-6 rounded-full bg-primary/20 items-center justify-center group-hover:bg-primary/30 transition-colors">
                                    <Plus size={14} className="text-primary" />
                                </div>
                                <span className="hidden md:inline text-sm font-bold text-white tracking-tight">
                                    {t.addRecipe}
                                </span>
                            </button>

                            <AnimatePresence>
                                {showAddMenu && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        transition={{ duration: 0.1 }}
                                        className="absolute top-full right-0 mt-3 w-60 bg-black/90 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-3xl overflow-hidden py-2 z-50"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {/* Media option - triggers native iOS picker */}
                                        <button
                                            onClick={() => {
                                                setShowAddMenu(false);
                                                onCameraClick();
                                            }}
                                            className="w-full text-left px-4 py-2.5 hover:bg-white/5 text-gray-200 flex items-center gap-3 transition-colors text-sm font-semibold group/item"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover/item:bg-primary/20 group-hover/item:text-primary transition-colors">
                                                <CameraCaptureIcon size={16} />
                                            </div>
                                            <span>Media</span>
                                        </button>
                                        {/* URL option */}
                                        <button
                                            onClick={() => {
                                                setShowAddMenu(false);
                                                onUrlClick();
                                            }}
                                            className="w-full text-left px-4 py-2.5 hover:bg-white/5 text-gray-200 flex items-center gap-3 transition-colors text-sm font-semibold group/item"
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

                        {/* Stacked Workspace Member Avatars */}
                        {workspaceMembers.length > 1 && (
                            <div className="hidden md:flex items-center -space-x-2">
                                {workspaceMembers.slice(0, 3).map((member, idx) => (
                                    <div
                                        key={member.user_id || idx}
                                        className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-md border-2 border-black flex items-center justify-center text-white text-xs font-bold shadow-lg"
                                        style={{ zIndex: 10 - idx }}
                                    >
                                        {member.avatar_url ? (
                                            <img src={member.avatar_url} className="w-full h-full object-cover rounded-full" alt="" />
                                        ) : (
                                            member.email?.[0]?.toUpperCase() || '?'
                                        )}
                                    </div>
                                ))}
                                {workspaceMembers.length > 3 && (
                                    <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-md border-2 border-black flex items-center justify-center text-white text-xs font-bold shadow-lg">
                                        +{workspaceMembers.length - 3}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Invite Button */}
                        {onInviteClick && (
                            <button
                                onClick={onInviteClick}
                                className="hidden md:flex h-11 w-11 rounded-full bg-black/40 backdrop-blur-md border border-white/10 items-center justify-center text-white/70 hover:text-primary hover:bg-black/60 transition-all"
                                title="Uitnodigen"
                            >
                                <UserPlus size={18} />
                            </button>
                        )}

                        {/* User Profile */}
                        <div className="relative">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowProfileMenu(!showProfileMenu);
                                    setShowAddMenu(false);
                                }}
                                className="h-11 w-11 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-black/60 transition-all overflow-hidden shadow-xl"
                            >
                                {user?.user_metadata?.avatar_url ? (
                                    <img src={user.user_metadata.avatar_url} className="w-full h-full object-cover" alt="Avatar" />
                                ) : (
                                    user?.email?.[0]?.toUpperCase() || '?'
                                )}
                            </button>

                            <AnimatePresence>
                                {showProfileMenu && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        transition={{ duration: 0.1 }}
                                        className="absolute top-full right-0 mt-3 w-56 bg-black/90 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-3xl overflow-hidden py-2 z-50"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <div className="px-4 py-2 border-b border-white/5 mb-1">
                                            <p className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-black">{t.signedInAs}</p>
                                            <p className="text-white font-bold truncate text-sm">{user.email}</p>
                                        </div>

                                        <button
                                            onClick={signOut}
                                            className="w-full flex items-center gap-3 px-4 py-2.5 text-red-400 hover:bg-red-500/10 transition-colors text-sm font-bold"
                                        >
                                            <LogOut size={18} />
                                            <span>{t.signOut}</span>
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </header>

            {/* Mobile Search Overlay */}
            <AnimatePresence>
                {showMobileSearch && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-[70] bg-[#000000] flex flex-col pt-safe px-4 lg:px-20"
                    >
                        <div className="flex items-center gap-4 px-4 py-4 border-b border-white/10 mt-safe-top glass-panel !border-none">
                            <div className="relative flex-1">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder={t.searchPlaceholder}
                                    className="input-standard !rounded-full pl-10 py-3"
                                    value={searchQuery}
                                    onChange={(e) => {
                                        handleSearch(e.target.value);
                                        // Navigate to home if not already there
                                        if (location.pathname !== '/') {
                                            navigate('/');
                                        }
                                    }}
                                />
                                {searchQuery && (
                                    <button
                                        onClick={clearSearch}
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white"
                                    >
                                        <X size={16} />
                                    </button>
                                )}
                            </div>
                            <button
                                onClick={() => {
                                    setShowMobileSearch(false);
                                    if (!searchQuery) clearSearch();
                                }}
                                className="text-white font-medium px-2"
                            >
                                {t.cancel}
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-4 py-4">
                            {/* Mobile Search Results */}
                            {(instantFilteredRecipes || searchResults) && searchQuery && (
                                <div className="space-y-4 pb-20">
                                    {(instantFilteredRecipes || searchResults).length > 0 ? (
                                        (instantFilteredRecipes || searchResults).map(recipe => (
                                            <div
                                                key={recipe.id}
                                                onClick={() => {
                                                    navigate(`/recipe/${recipe.id}`);
                                                    setShowMobileSearch(false);
                                                }}
                                                className="flex items-center gap-4 p-3 glass-card rounded-[var(--radius-btn)] active:bg-white/10"
                                            >
                                                {recipe.image_url ? (
                                                    <img src={recipe.image_url} alt={recipe.title} className="w-16 h-16 rounded-[var(--radius-btn)] object-cover" />
                                                ) : (
                                                    <div className="w-16 h-16 rounded-[var(--radius-btn)] bg-white/10 flex items-center justify-center">
                                                        <ChefHat size={24} className="text-white/20" />
                                                    </div>
                                                )}
                                                <div>
                                                    <h4 className="font-bold text-white line-clamp-1">{recipe.title}</h4>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        {recipe.cuisine && <span className="text-xs text-muted-foreground uppercase">{recipe.cuisine}</span>}
                                                        {recipe.cook_time && <span className="text-xs text-muted-foreground">• {recipe.cook_time}</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center text-muted-foreground py-10">
                                            {t.noResults} <span className="text-primary">"{searchQuery}"</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

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
                                {[
                                    { icon: Compass, label: 'Recepten', path: '/' },
                                    { icon: Calendar, label: 'Planning', path: '/planning' },
                                    { icon: ShoppingBasket, label: 'Boodschappen', path: '/shopping' },
                                    { icon: Heart, label: 'Favorieten', path: '/favorites' },
                                ].map((item) => (
                                    <NavLink
                                        key={item.label}
                                        to={item.path}
                                        onClick={() => setMobileMenuOpen(false)}
                                        className={({ isActive }) => `flex items-center gap-4 px-4 py-4 rounded-xl font-bold transition-all ${isActive ? 'bg-primary text-black' : 'text-white/60 hover:text-white hover:bg-white/5'
                                            }`}
                                    >
                                        <item.icon size={20} />
                                        {item.label}
                                    </NavLink>
                                ))}
                            </nav>

                            <div className="mt-auto pt-6 border-t border-white/5">
                                <div className="px-4 py-2 mb-2">
                                    <p className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-black">{t.signedInAs}</p>
                                    <p className="text-white font-bold truncate text-sm mt-1">{user.email}</p>
                                </div>
                                <button
                                    onClick={signOut}
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
