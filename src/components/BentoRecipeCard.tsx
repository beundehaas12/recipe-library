'use client';

import Image from 'next/image';
import { ChefHat } from 'lucide-react';
import type { Recipe } from '@/types/database';
import { getAuthorDisplayName, getAuthorAvatarUrl } from '@/lib/authorProfileService';

interface BentoRecipeCardProps {
    recipe: Recipe;
    size?: 'small' | 'large' | 'wide' | 'tall';
}

export default function BentoRecipeCard({ recipe, size = 'small' }: BentoRecipeCardProps) {
    if (!recipe) return null;

    const isLarge = size === 'large';
    const isWide = size === 'wide';
    const isTall = size === 'tall';

    return (
        <div
            style={{ transform: 'translateZ(0)', WebkitTransform: 'translateZ(0)' }}
            className={`
                relative rounded-2xl overflow-hidden group
                ${isLarge ? 'md:col-span-2 md:row-span-2 aspect-square' : ''}
                ${isWide ? 'md:col-span-2 aspect-[2/1]' : ''}
                ${isTall ? 'md:row-span-2 aspect-[1/2]' : ''}
                ${!isLarge && !isWide && !isTall ? 'aspect-[2/3]' : ''}
            `}
        >
            {/* Image Layer */}
            <div className="absolute inset-0 overflow-hidden">
                {recipe.image_url ? (
                    <Image
                        src={recipe.image_url}
                        alt={recipe.title}
                        fill
                        sizes="(max-width: 768px) 50vw, 33vw"
                        className="object-cover"
                    />
                ) : (
                    <div className="w-full h-full bg-zinc-50 flex items-center justify-center">
                        <ChefHat size={isLarge ? 32 : 16} className="text-zinc-200" strokeWidth={1} />
                    </div>
                )}
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
            </div>

            {/* Content Layer */}
            <div className="absolute inset-0 p-3 md:p-4 flex flex-col justify-end text-white">
                <div className="space-y-0.5">
                    <h3 className={`font-bold tracking-tight leading-tight ${isLarge ? 'text-lg md:text-xl' : 'text-sm md:text-base'} line-clamp-2`}>
                        {recipe.title}
                    </h3>

                    {/* Author */}
                    <div className="flex items-center gap-1.5 pt-0.5">
                        <div className="w-4 h-4 rounded-full overflow-hidden border border-white/20 relative">
                            <Image
                                src={getAuthorAvatarUrl(recipe.author_profile, { id: recipe.user_id })}
                                alt=""
                                fill
                                sizes="16px"
                                className="object-cover"
                            />
                        </div>
                        <span className="text-[8px] md:text-[10px] font-bold opacity-70 uppercase tracking-tight truncate">
                            {getAuthorDisplayName(recipe.author_profile) || 'Chef'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
