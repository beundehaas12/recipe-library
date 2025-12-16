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
        <div className="relative group/shelf py-8">
            <div className="flex items-center justify-between px-6 md:px-16 mb-4">
                <h2 className="text-xl md:text-2xl font-bold text-white tracking-wide flex items-center gap-2">
                    {t.myCookbook}
                    <span className="text-sm font-normal text-muted-foreground ml-2 hidden md:inline-block">({recipes.length})</span>
                </h2>

                {/* Desktop Scroll Controls */}
                <div className="hidden md:flex gap-2 opacity-0 group-hover/shelf:opacity-100 transition-opacity duration-300">
                    <button
                        onClick={() => scroll('left')}
                        className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-colors"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <button
                        onClick={() => scroll('right')}
                        className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-colors"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            <div
                ref={scrollContainerRef}
                className="flex overflow-x-auto gap-4 md:gap-6 px-6 md:px-16 pb-12 snap-x snap-mandatory scrollbar-hide"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {recipes.map((recipe, index) => (
                    <motion.div
                        key={recipe.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05, duration: 0.4 }}
                    >
                        <RecipeThumbnail recipe={recipe} t={t} />
                    </motion.div>
                ))}

                {/* Spacer for end of list */}
                <div className="w-6 md:w-16 shrink-0" />
            </div>
        </div>
    );
}

