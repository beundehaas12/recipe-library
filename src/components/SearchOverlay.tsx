'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, ArrowRight, Clock, ChefHat, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Recipe } from '@/types/database';

const RECENT_SEARCHES_KEY = 'forkify_recent_searches';
const MAX_RECENT_SEARCHES = 5;

interface SearchOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    initialQuery?: string;
}

export default function SearchOverlay({
    isOpen,
    onClose,
    initialQuery = '',
}: SearchOverlayProps) {
    const [query, setQuery] = useState(initialQuery);
    const [results, setResults] = useState<Recipe[]>([]);
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
            setResults([]);
        }
    }, [isOpen, initialQuery]);

    // Debounced search
    useEffect(() => {
        if (!query.trim()) {
            setResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            setIsLoading(true);
            try {
                const { data, error } = await supabase
                    .from('recipes')
                    .select('id, title, image_url, cuisine, author')
                    .or(`title.ilike.%${query}%,description.ilike.%${query}%,cuisine.ilike.%${query}%`)
                    .limit(8);

                if (!error && data) {
                    setResults(data as Recipe[]);
                }
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

    const handleSearch = (text: string) => {
        if (!text.trim()) return;
        saveRecentSearch(text);
        const params = new URLSearchParams();
        params.set('q', text);
        router.push(`/?${params.toString()}`);
        // Wait for page to fully load before closing overlay
        setTimeout(() => onClose(), 600);
    };

    const handleRecipeClick = (recipe: Recipe) => {
        saveRecentSearch(recipe.title);
        router.push(`/recipe/${recipe.id}`);
        setTimeout(() => onClose(), 600);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSearch(query);
        }
    };

    const clearRecentSearches = () => {
        setRecentSearches([]);
        localStorage.removeItem(RECENT_SEARCHES_KEY);
    };

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
                                placeholder="Zoek recepten..."
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 pl-16 text-xl md:text-2xl font-bold text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-all"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={handleKeyDown}
                            />
                            {isLoading ? (
                                <Loader2 size={28} className="absolute left-5 top-1/2 -translate-y-1/2 text-primary animate-spin" />
                            ) : (
                                <Search size={28} className="absolute left-5 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-primary transition-colors" />
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
                                <ChefHat size={48} className="mx-auto text-white/10 mb-4" />
                                <p className="text-white/30 text-lg">Zoek naar recepten, ingrediënten of keukens...</p>
                            </motion.div>
                        )}

                        {/* Query entered - show results */}
                        {query.trim() && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="space-y-1"
                            >
                                {results.length > 0 ? (
                                    <>
                                        {results.map((recipe) => (
                                            <button
                                                key={recipe.id}
                                                onClick={() => handleRecipeClick(recipe)}
                                                className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 text-left group transition-colors"
                                            >
                                                {recipe.image_url ? (
                                                    <img
                                                        src={recipe.image_url}
                                                        alt={recipe.title}
                                                        className="w-14 h-14 rounded-lg object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-14 h-14 rounded-lg bg-white/5 flex items-center justify-center">
                                                        <ChefHat size={24} className="text-white/20" />
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
                                                <ArrowRight size={18} className="text-white/20 group-hover:text-primary opacity-0 group-hover:opacity-100 transition-all" />
                                            </button>
                                        ))}
                                        {/* Search all option */}
                                        <button
                                            onClick={() => handleSearch(query)}
                                            className="w-full flex items-center gap-4 p-4 rounded-xl bg-primary/10 hover:bg-primary/20 text-left group transition-colors mt-4"
                                        >
                                            <Search size={20} className="text-primary" />
                                            <span className="text-white font-medium">
                                                Alle resultaten voor <span className="text-primary font-bold">"{query}"</span>
                                            </span>
                                            <ArrowRight size={18} className="ml-auto text-primary" />
                                        </button>
                                    </>
                                ) : !isLoading ? (
                                    <button
                                        onClick={() => handleSearch(query)}
                                        className="w-full flex items-center gap-4 p-5 rounded-xl bg-white/5 hover:bg-primary/20 text-left group transition-colors"
                                    >
                                        <Search size={22} className="text-primary" />
                                        <span className="text-lg text-white font-medium">
                                            Zoek naar <span className="text-primary font-bold">"{query}"</span>
                                        </span>
                                        <ArrowRight size={20} className="ml-auto text-primary" />
                                    </button>
                                ) : null}
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
