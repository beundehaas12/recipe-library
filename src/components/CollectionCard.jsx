import React from 'react';
import { Folder, ChefHat } from 'lucide-react';
import { Link } from 'react-router-dom';

import { getAuthorDisplayName, getAuthorAvatarUrl } from '../lib/authorProfileService';

export default function CollectionCard({ collection, recipeCount = 0 }) {
    const images = collection.preview_images || [];
    const displayImages = images.slice(0, 4);

    // Render the grid of images based on count
    // Card is aspect-[2/3] (Vertical rectangle)
    const renderGrid = () => {
        if (displayImages.length === 0) {
            // Empty state pattern
            return (
                <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                    <ChefHat className="text-white/10" size={48} />
                </div>
            );
        }

        // 1 Image: Full fill
        if (displayImages.length === 1) {
            return (
                <img
                    src={displayImages[0]}
                    alt="Recipe"
                    className="w-full h-full object-cover"
                />
            );
        }

        // 2 Images: Split horizontal
        if (displayImages.length === 2) {
            return (
                <div className="grid grid-rows-2 h-full gap-0.5">
                    {displayImages.map((img, i) => (
                        <img key={i} src={img} alt="" className="w-full h-full object-cover" />
                    ))}
                </div>
            );
        }

        // 3 Images: 1 Big top, 2 small bottom
        if (displayImages.length === 3) {
            return (
                <div className="grid grid-cols-2 grid-rows-2 h-full gap-0.5">
                    <img src={displayImages[0]} alt="" className="w-full h-full object-cover col-span-2" />
                    <img src={displayImages[1]} alt="" className="w-full h-full object-cover" />
                    <img src={displayImages[2]} alt="" className="w-full h-full object-cover" />
                </div>
            );
        }

        // 4+ Images: 2x2 Grid
        return (
            <div className="grid grid-cols-2 grid-rows-2 h-full gap-0.5">
                {displayImages.map((img, i) => (
                    <img key={i} src={img} alt="" className="w-full h-full object-cover" />
                ))}
            </div>
        );
    };

    return (
        <Link
            to={`/collection/${collection.id}`}
            className="block group relative aspect-[2/3] rounded-[2px] md:rounded lg:rounded-lg overflow-hidden shadow-lg md:shadow-xl lg:shadow-2xl active:scale-[0.98] transition-transform duration-200 isolate"
        >
            {/* Image Grid Container */}
            <div className="absolute inset-0 bg-zinc-900 overflow-hidden">
                {/* Hover Scale Effect matching RecipeThumbnail */}
                <div className="w-full h-full transition-transform duration-700 group-hover:scale-105" style={{ willChange: 'transform' }}>
                    {renderGrid()}
                </div>

                {/* Cinematic Overlay - Pure black bottom for perfect blending */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
            </div>

            {/* Content Overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-5 flex flex-col justify-end h-full z-20">
                {/* Badge/Icon moved to top-left to mimic 'floating' feel inside card if desired, 
                     but RecipeThumbnail puts everything at bottom. 
                     Let's keep the Collection Identifier distinct but subtle. */}
                <div className="flex justify-start mb-auto">
                    <span className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/10 shadow-lg">
                        <Folder size={14} className="text-white" />
                    </span>
                </div>

                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-white/70">
                            Collection
                        </span>
                    </div>

                    {/* Title with Primary Color Hover */}
                    <h3 className="text-white font-bold text-lg md:text-xl leading-tight line-clamp-2 drop-shadow-lg group-hover:text-primary transition-colors">
                        {collection.name}
                    </h3>

                    {/* Author Info */}
                    {collection.author_profile && (
                        <div className="flex items-center gap-2 mt-2">
                            <div className="w-5 h-5 rounded-full overflow-hidden border border-white/20 bg-white/10 flex-shrink-0">
                                <img
                                    src={getAuthorAvatarUrl(collection.author_profile, { id: collection.user_id })}
                                    alt=""
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <span className="text-xs text-white/70 font-medium truncate drop-shadow-md">
                                {getAuthorDisplayName(collection.author_profile) || 'Unknown Chef'}
                            </span>
                        </div>
                    )}

                    <div className="flex items-center gap-3 mt-2 text-xs text-white/70 font-semibold">
                        <span className="flex items-center gap-1.5">
                            <ChefHat size={12} className="text-white/40" />
                            {recipeCount} {recipeCount === 1 ? 'recept' : 'recepten'}
                        </span>
                    </div>
                </div>
            </div>
        </Link>
    );
}
