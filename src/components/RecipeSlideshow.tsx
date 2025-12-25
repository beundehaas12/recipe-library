'use client';

import { useMemo } from 'react';
import type { Recipe } from '@/types/database';
import BentoRecipeCard from '@/components/BentoRecipeCard';

interface RecipeSlideshowProps {
    recipes?: Recipe[];
}

export default function RecipeSlideshow({ recipes = [] }: RecipeSlideshowProps) {
    // Skeleton recipes for animation when no recipes provided
    const skeletonRecipes: Recipe[] = useMemo(() => Array.from({ length: 12 }).map((_, i) => ({
        id: `skeleton-${i}`,
        user_id: '',
        title: "Laden...",
        created_at: '',
        image_url: undefined,
    })), []);

    const displayRecipes = recipes.length > 0 ? recipes : skeletonRecipes;

    // Deterministic columns for SSR (no Math.random to avoid hydration mismatch)
    const columnData = useMemo(() => {
        return [0, 1, 2].map((col) => {
            const durations = [180, 130, 260];
            const offsets = [0, -40, -90];
            // Deterministic shuffle: offset recipes by column index
            const shuffled = [...displayRecipes].slice(col).concat([...displayRecipes].slice(0, col));
            return {
                duration: durations[col],
                offset: offsets[col] % durations[col],
                recipes: shuffled
            };
        });
    }, [displayRecipes]);

    return (
        <div className="hidden md:flex w-1/2 h-full relative overflow-hidden items-center justify-center bg-white">
            <div className="w-full h-full pr-6 relative flex gap-3">
                {columnData.map((col, colIdx) => (
                    <div key={colIdx} className="flex-1 h-full overflow-hidden relative">
                        <div
                            style={{
                                animationDuration: `${col.duration}s`,
                                animationDelay: `${col.offset}s`
                            }}
                            className="animate-scroll-up flex flex-col gap-3"
                        >
                            {/* Double for seamless loop */}
                            {[...col.recipes, ...col.recipes].map((recipe, idx) => (
                                <div key={`${colIdx}-${recipe.id}-${idx}`} className="w-full">
                                    <BentoRecipeCard recipe={recipe} size="small" />
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Ambient Blur Glows */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/[0.02] blur-[100px] rounded-full -mr-64 -mt-64" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/[0.02] blur-[100px] rounded-full -ml-64 -mb-64" />
        </div>
    );
}
