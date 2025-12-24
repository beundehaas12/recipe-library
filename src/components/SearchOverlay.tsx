'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Loader2, ArrowRight, TrendingUp, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { translations as t } from '@/lib/translations';

// Mock Data
const MOCK_SUGGESTIONS = [
    { type: 'trend', text: 'Pasta' },
    { type: 'trend', text: 'Chicken Curry' },
    { type: 'trend', text: 'Vegan' },
    { type: 'trend', text: 'Dessert' },
    { type: 'trend', text: 'Quick Dinner' },
];

const MOCK_RECENT = [
    { text: 'Spaghetti Carbonara' },
    { text: 'Butter Chicken' },
];

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
    const [isSearching, setIsSearching] = useState(false);
    const router = useRouter();

    // Sync query with initialQuery when opened
    useEffect(() => {
        if (isOpen) {
            setQuery(initialQuery);
        }
    }, [isOpen, initialQuery]);

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

        setIsSearching(true);
        // Simulate a small delay for "loading" feel or just immediate
        setQuery(text);

        // Update URL
        const params = new URLSearchParams();
        params.set('q', text);
        router.push(`/?${params.toString()}`);

        // Close overlay after a brief moment to allow user to see UI reaction
        setTimeout(() => {
            setIsSearching(false);
            onClose();
        }, 100);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSearch(query);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex flex-col pt-safe px-4 lg:px-20"
                >
                    {/* Search Input Section */}
                    <motion.div
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.1, type: 'spring', damping: 20 }}
                        className="max-w-[800px] mx-auto w-full mt-8 md:mt-20"
                    >
                        <div className="relative group">
                            <input
                                autoFocus
                                type="text"
                                placeholder="Wat wil je koken vandaag?"
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-6 pl-16 text-xl md:text-3xl font-bold text-white placeholder:text-white/20 focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-all font-display"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={handleKeyDown}
                            />
                            <Search
                                size={32}
                                className="absolute left-5 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-primary transition-colors"
                            />
                            {query && (
                                <button
                                    onClick={() => setQuery('')}
                                    className="absolute right-6 top-1/2 -translate-y-1/2 p-2 hover:bg-white/10 rounded-full text-white/40 hover:text-white transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            )}
                        </div>
                    </motion.div>

                    {/* Suggestions Section */}
                    <div className="max-w-[800px] mx-auto w-full mt-12 flex-1 overflow-y-auto pb-20 scrollbar-hide">
                        {/* If Query is Empty -> Show Recent + Trending */}
                        {!query.trim() && (
                            <div className="grid md:grid-cols-2 gap-12">
                                {/* Recent Searches */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                >
                                    <h3 className="text-sm font-bold text-white/40 uppercase tracking-widest mb-6 flex items-center gap-2">
                                        <Clock size={16} /> Recente zoekopdrachten
                                    </h3>
                                    <div className="flex flex-col gap-2">
                                        {MOCK_RECENT.map((item, i) => (
                                            <button
                                                key={i}
                                                onClick={() => handleSearch(item.text)}
                                                className="flex items-center gap-4 p-4 rounded-xl hover:bg-white/5 text-left group transition-colors border border-transparent hover:border-white/5"
                                            >
                                                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/40 group-hover:text-white group-hover:bg-white/10 transition-colors">
                                                    <Clock size={18} />
                                                </div>
                                                <span className="text-lg text-white/80 font-medium group-hover:text-white">{item.text}</span>
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>

                                {/* Trending */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 }}
                                >
                                    <h3 className="text-sm font-bold text-white/40 uppercase tracking-widest mb-6 flex items-center gap-2">
                                        <TrendingUp size={16} /> Populair
                                    </h3>
                                    <div className="flex flex-wrap gap-3">
                                        {MOCK_SUGGESTIONS.map((item, i) => (
                                            <button
                                                key={i}
                                                onClick={() => handleSearch(item.text)}
                                                className="px-5 py-3 rounded-full bg-white/5 border border-white/5 text-white/80 font-medium hover:bg-primary/20 hover:border-primary/50 hover:text-primary transition-all active:scale-95"
                                            >
                                                {item.text}
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            </div>
                        )}

                        {/* Live Suggestions (Mocked for now based on filtering list) */}
                        {query.trim() && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="bg-zinc-900/50 rounded-2xl border border-white/5 overflow-hidden"
                            >
                                {MOCK_SUGGESTIONS
                                    .filter(s => s.text.toLowerCase().includes(query.toLowerCase()))
                                    .map((s, i) => (
                                        <button
                                            key={i}
                                            onClick={() => handleSearch(s.text)}
                                            className="w-full flex items-center gap-4 p-5 hover:bg-white/5 text-left border-b border-white/5 last:border-0 group transition-colors"
                                        >
                                            <Search size={20} className="text-white/30 group-hover:text-primary transition-colors" />
                                            <span className="text-xl text-white font-medium">
                                                {s.text}
                                            </span>
                                            <ArrowRight size={20} className="ml-auto text-white/20 group-hover:text-white -translate-x-2 group-hover:translate-x-0 transition-all opacity-0 group-hover:opacity-100" />
                                        </button>
                                    ))}
                                {MOCK_SUGGESTIONS.filter(s => s.text.toLowerCase().includes(query.toLowerCase())).length === 0 && (
                                    <button
                                        onClick={() => handleSearch(query)}
                                        className="w-full flex items-center gap-4 p-5 hover:bg-primary/20 text-left group transition-colors"
                                    >
                                        <Search size={20} className="text-primary" />
                                        <span className="text-xl text-white font-medium">
                                            Zoek naar <span className="text-primary">"{query}"</span>
                                        </span>
                                        <ArrowRight size={20} className="ml-auto text-primary" />
                                    </button>
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
                    <div className="fixed bottom-8 left-0 right-0 text-center text-white/30 text-sm font-medium">
                        Druk op <span className="px-2 py-1 rounded bg-white/10 border border-white/10 mx-1 text-white/50">ESC</span> om te sluiten
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
