import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { Search, CookingPot, Camera, Link as LinkIcon, ChevronRight, ChevronLeft } from 'lucide-react';
import { translations as t } from '../lib/translations';
import RecipeThumbnail from './RecipeThumbnail';

export default function RecipeList({ recipes, isEmptyState, isNoResults, searchQuery }) {
    const scrollContainerRef = useRef(null);

    const scroll = (direction) => {
        if (scrollContainerRef.current) {
            const { current } = scrollContainerRef;
            const scrollAmount = direction === 'left' ? -current.offsetWidth : current.offsetWidth;
            current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    };

    // No recipes yet state
    if (isEmptyState) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-8">
                <div className="w-32 h-32 bg-secondary/30 rounded-full flex items-center justify-center mb-8 border border-white/5 shadow-2xl animate-pulse">
                    <CookingPot size={64} className="text-muted-foreground/50" strokeWidth={1} />
                </div>
                <h3 className="text-3xl font-bold text-white mb-4 tracking-tight">{t.noRecipes}</h3>
                <p className="text-muted-foreground max-w-md mb-10 text-lg leading-relaxed">{t.noRecipesDesc}</p>

                <div className="flex flex-wrap gap-4 justify-center">
                    <div className="flex items-center gap-3 px-6 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-white transition-all cursor-pointer backdrop-blur-md">
                        <Camera size={20} className="text-primary" />
                        <span className="font-medium">{t.takePhoto}</span>
                    </div>
                    <div className="flex items-center gap-3 px-6 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-white transition-all cursor-pointer backdrop-blur-md">
                        <LinkIcon size={20} className="text-primary" />
                        <span className="font-medium">{t.fromUrl}</span>
                    </div>
                </div>
            </div>
        );
    }

    // No search results state
    if (isNoResults) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[40vh] text-center p-8">
                <Search size={48} className="text-muted-foreground mb-4 opacity-50" strokeWidth={1} />
                <h3 className="text-xl font-bold text-white mb-2">{t.noResults}</h3>
                <p className="text-muted-foreground">
                    {t.noResultsDesc} <span className="text-primary">"{searchQuery}"</span>
                </p>
            </div>
        );
    }

    // Horizontal "Shelf" View
    return (
        <div className="relative group/shelf py-12">
            {/* Header - Aligned with Hero (px-6 md:px-16) */}
            <div className="px-6 md:px-16 mb-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-3">
                        {t.myCookbook}
                        <span className="text-sm font-bold text-muted-foreground/60 bg-white/5 px-2 py-1 rounded-md border border-white/5">
                            {recipes.length}
                        </span>
                    </h2>

                    {/* Desktop Scroll Controls */}
                    <div className="hidden md:flex gap-2">
                        <button
                            onClick={() => scroll('left')}
                            className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 text-white backdrop-blur-md border border-white/10 transition-all flex items-center justify-center active:scale-90"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <button
                            onClick={() => scroll('right')}
                            className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 text-white backdrop-blur-md border border-white/10 transition-all flex items-center justify-center active:scale-90"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Scroll Container - Aligned with Header via padding */}
            <div
                ref={scrollContainerRef}
                className="flex overflow-x-auto gap-6 pb-8 snap-x snap-mandatory scrollbar-hide scroll-smooth px-6 md:px-16 scroll-px-6 md:scroll-px-16"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {recipes.map((recipe, index) => (
                    <motion.div
                        key={recipe.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05, duration: 0.4 }}
                        className="snap-start"
                    >
                        <RecipeThumbnail recipe={recipe} t={t} />
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
