'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, ArrowRight, Clock, ChefHat, Loader2, Folder, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Recipe, Collection, AuthorProfile } from '@/types/database';
import { getAuthorDisplayName, getAuthorAvatarUrl } from '@/lib/authorProfileService';

const RECENT_SEARCHES_KEY = 'forkify_recent_searches';
const MAX_RECENT_SEARCHES = 5;

interface SearchOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    initialQuery?: string;
}

interface SearchResults {
    recipes: Recipe[];
    collections: Collection[];
    authors: AuthorProfile[];
}

export default function SearchOverlay({
    isOpen,
    onClose,
    initialQuery = '',
}: SearchOverlayProps) {
    const [query, setQuery] = useState(initialQuery);
    const [results, setResults] = useState<SearchResults>({ recipes: [], collections: [], authors: [] });
    const [isLoading, setIsLoading] = useState(false);
    const [recentSearches, setRecentSearches] = useState<string[]>([]);
    const router = useRouter();
    const supabase = createClient();

    // Load recent searches from localStorage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
            if (stored) {
                try {
                    setRecentSearches(JSON.parse(stored));
                } catch { }
            }
        }
    }, []);

    // Save search to recent
    const saveRecentSearch = useCallback((searchTerm: string) => {
        const trimmed = searchTerm.trim();
        if (!trimmed) return;

        setRecentSearches((prev) => {
            const filtered = prev.filter((s) => s.toLowerCase() !== trimmed.toLowerCase());
            const updated = [trimmed, ...filtered].slice(0, MAX_RECENT_SEARCHES);
            localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
            return updated;
        });
    }, []);

    // Sync query with initialQuery when opened
    useEffect(() => {
        if (isOpen) {
            setQuery(initialQuery);
            setResults({ recipes: [], collections: [], authors: [] });
        }
    }, [isOpen, initialQuery]);

    // Debounced search - now queries recipes, collections, and authors
    useEffect(() => {
        if (!query.trim()) {
            setResults({ recipes: [], collections: [], authors: [] });
            return;
        }

        const timer = setTimeout(async () => {
            setIsLoading(true);
            try {
                // Search all three in parallel
                const [recipesRes, collectionsRes, authorsRes] = await Promise.all([
                    // Recipes search
                    supabase
                        .from('recipes')
                        .select('id, title, image_url, cuisine, author')
                        .or(`title.ilike.%${query}%,description.ilike.%${query}%,cuisine.ilike.%${query}%`)
                        .limit(5),
                    // Collections search
                    supabase
                        .from('collections')
                        .select('id, name, user_id')
                        .ilike('name', `%${query}%`)
                        .limit(3),
                    // Authors search
                    supabase
                        .from('author_profiles')
                        .select('user_id, first_name, last_name, avatar_url')
                        .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
                        .limit(3),
                ]);

                setResults({
                    recipes: (recipesRes.data || []) as Recipe[],
                    collections: (collectionsRes.data || []) as Collection[],
                    authors: (authorsRes.data || []) as AuthorProfile[],
                });
            } catch (err) {
                console.error('Search error:', err);
            } finally {
                setIsLoading(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query, supabase]);

    // Handle Escape key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    // Handle search submit
    const handleSearch = (text: string) => {
        if (!text.trim()) return;
        saveRecentSearch(text);
        const params = new URLSearchParams();
        params.set('q', text);
        onClose();
        setTimeout(() => router.push(`/?${params.toString()}`), 50);
    };

    // Handle recipe click
    const handleRecipeClick = (recipe: Recipe) => {
        saveRecentSearch(recipe.title);
        onClose();
        setTimeout(() => router.push(`/recipe/${recipe.id}`), 50);
    };

    // Handle collection click
    const handleCollectionClick = (collection: Collection) => {
        saveRecentSearch(collection.name);
        onClose();
        setTimeout(() => router.push(`/collection/${collection.id}`), 50);
    };

    // Handle author click
    const handleAuthorClick = (author: AuthorProfile) => {
        const name = getAuthorDisplayName(author) || 'Unknown';
        saveRecentSearch(name);
        onClose();
        setTimeout(() => router.push(`/author/${author.user_id}`), 50);
    };

    // Handle Enter key
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSearch(query);
        }
    };

    // Clear recent searches
    const clearRecentSearches = () => {
        setRecentSearches([]);
        localStorage.removeItem(RECENT_SEARCHES_KEY);
    };

    const hasResults = results.recipes.length > 0 || results.collections.length > 0 || results.authors.length > 0;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-xl flex flex-col pt-20 px-4 lg:px-20"
                >
                    {/* Search Input */}
                    <motion.div
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.1, type: 'spring', damping: 20 }}
                        className="max-w-[800px] mx-auto w-full"
                    >
                        <div className="relative group">
                            <input
                                autoFocus
                                type="text"
                                placeholder="Wat zoek je..."
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 pl-16 text-xl md:text-2xl font-bold text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-all"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={handleKeyDown}
                            />
                            {isLoading ? (
                                <Loader2 size={28} className="absolute left-5 top-1/2 -translate-y-1/2 text-primary animate-spin" />
                            ) : (
                                <Search size={28} className="absolute left-5 top-1/2 -translate-y-1/2 text-white group-focus-within:text-primary transition-colors" />
                            )}
                            {query && (
                                <button
                                    onClick={() => setQuery('')}
                                    className="absolute right-5 top-1/2 -translate-y-1/2 p-2 hover:bg-white/10 rounded-full text-white/40 hover:text-white transition-colors"
                                >
                                    <X size={22} />
                                </button>
                            )}
                        </div>
                    </motion.div>

                    {/* Results / Suggestions */}
                    <div className="max-w-[800px] mx-auto w-full mt-8 flex-1 overflow-y-auto pb-20 scrollbar-hide">
                        {/* No query - show recent searches */}
                        {!query.trim() && recentSearches.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
                                        <Clock size={14} /> Recente zoekopdrachten
                                    </h3>
                                    <button
                                        onClick={clearRecentSearches}
                                        className="text-xs text-white/30 hover:text-white/60 transition-colors"
                                    >
                                        Wissen
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {recentSearches.map((term, i) => (
                                        <button
                                            key={i}
                                            onClick={() => handleSearch(term)}
                                            className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white/70 font-medium hover:bg-white/10 hover:text-white transition-all text-sm"
                                        >
                                            {term}
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {/* No query, no recent - show hint */}
                        {!query.trim() && recentSearches.length === 0 && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-center py-16"
                            >
                                <ChefHat size={48} className="mx-auto text-white mb-4" />
                                <p className="text-white/60 text-lg">Zoek naar recepten, collecties of chefs...</p>
                            </motion.div>
                        )}

                        {/* Query entered - show grouped results */}
                        {query.trim() && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="space-y-6"
                            >
                                {/* Recipes Section */}
                                {results.recipes.length > 0 && (
                                    <div>
                                        <h3 className="text-xs font-bold text-white/60 uppercase tracking-widest mb-3 flex items-center gap-2">
                                            <ChefHat size={14} /> Recepten ({results.recipes.length})
                                        </h3>
                                        <div className="space-y-1">
                                            {results.recipes.map((recipe) => (
                                                <button
                                                    key={recipe.id}
                                                    onClick={() => handleRecipeClick(recipe)}
                                                    className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 text-left group transition-colors"
                                                >
                                                    {recipe.image_url ? (
                                                        <img
                                                            src={recipe.image_url}
                                                            alt={recipe.title}
                                                            className="w-12 h-12 rounded-lg object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center">
                                                            <ChefHat size={20} className="text-white" />
                                                        </div>
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-white font-bold truncate group-hover:text-primary transition-colors">
                                                            {recipe.title}
                                                        </p>
                                                        {recipe.cuisine && (
                                                            <p className="text-white/40 text-sm">{recipe.cuisine}</p>
                                                        )}
                                                    </div>
                                                    <ArrowRight size={18} className="text-white group-hover:text-primary opacity-0 group-hover:opacity-100 transition-all" />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Collections Section */}
                                {results.collections.length > 0 && (
                                    <div>
                                        <h3 className="text-xs font-bold text-white/60 uppercase tracking-widest mb-3 flex items-center gap-2">
                                            <Folder size={14} /> Collecties ({results.collections.length})
                                        </h3>
                                        <div className="space-y-1">
                                            {results.collections.map((collection) => (
                                                <button
                                                    key={collection.id}
                                                    onClick={() => handleCollectionClick(collection)}
                                                    className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 text-left group transition-colors"
                                                >
                                                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                                        <Folder size={20} className="text-primary" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-white font-bold truncate group-hover:text-primary transition-colors">
                                                            {collection.name}
                                                        </p>
                                                        <p className="text-white/40 text-sm">Collectie</p>
                                                    </div>
                                                    <ArrowRight size={18} className="text-white group-hover:text-primary opacity-0 group-hover:opacity-100 transition-all" />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Authors Section */}
                                {results.authors.length > 0 && (
                                    <div>
                                        <h3 className="text-xs font-bold text-white/60 uppercase tracking-widest mb-3 flex items-center gap-2">
                                            <User size={14} /> Chefs ({results.authors.length})
                                        </h3>
                                        <div className="space-y-1">
                                            {results.authors.map((author) => (
                                                <button
                                                    key={author.user_id}
                                                    onClick={() => handleAuthorClick(author)}
                                                    className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 text-left group transition-colors"
                                                >
                                                    <div className="w-12 h-12 rounded-full overflow-hidden bg-white/5">
                                                        <img
                                                            src={getAuthorAvatarUrl(author, { id: author.user_id })}
                                                            alt=""
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-white font-bold truncate group-hover:text-primary transition-colors">
                                                            {getAuthorDisplayName(author) || 'Unknown Chef'}
                                                        </p>
                                                        <p className="text-white/40 text-sm">Chef</p>
                                                    </div>
                                                    <ArrowRight size={18} className="text-white group-hover:text-primary opacity-0 group-hover:opacity-100 transition-all" />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Search all option - always show when query present */}
                                <button
                                    onClick={() => handleSearch(query)}
                                    className="w-full flex items-center gap-4 p-4 rounded-xl bg-primary/10 hover:bg-primary/20 text-left group transition-colors"
                                >
                                    <Search size={20} className="text-primary" />
                                    <span className="text-white font-medium">
                                        Alle resultaten voor <span className="text-primary font-bold">"{query}"</span>
                                    </span>
                                    <ArrowRight size={18} className="ml-auto text-primary" />
                                </button>

                                {/* No results message */}
                                {!hasResults && !isLoading && (
                                    <div className="text-center py-8">
                                        <p className="text-white/40">Geen resultaten gevonden voor "{query}"</p>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </div>

                    {/* Close Button */}
                    <div className="absolute top-6 right-6 md:right-12">
                        <button
                            onClick={onClose}
                            className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    {/* Footer Hint */}
                    <div className="fixed bottom-6 left-0 right-0 text-center text-white/20 text-sm">
                        <span className="px-2 py-1 rounded bg-white/5 border border-white/10 text-white/40">ESC</span>
                        <span className="ml-2">om te sluiten</span>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
