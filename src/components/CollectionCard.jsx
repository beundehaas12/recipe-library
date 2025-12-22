import React from 'react';
import { Folder, ChefHat } from 'lucide-react';

export default function CollectionCard({ collection, onClick, recipeCount = 0 }) {
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

        // 2 Images: Split horizontal (Top/Bottom) for vertical card looks better? 
        // Or Side-by-Side (Tall strips). User ref shows squares.
        // Let's do horizontal split (Top/Bottom) to keep them close to 4:3 or square orientation
        if (displayImages.length === 2) {
            return (
                <div className="grid grid-rows-2 h-full gap-0.5">
                    {displayImages.map((img, i) => (
                        <img key={i} src={img} alt="" className="w-full h-full object-cover" />
                    ))}
                </div>
            );
        }

        // 3 Images: 1 Big Top (2/3 height? or 1/2), 2 Small Bottom
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
        <div
            onClick={onClick}
            className="group relative aspect-[2/3] cursor-pointer overflow-hidden rounded-xl active:scale-[0.98] transition-transform duration-200"
        >
            {/* Image Grid Container */}
            <div className="absolute inset-0 bg-zinc-900 border border-white/5">
                {renderGrid()}
            </div>

            {/* Gradient Overlay for Text Readability - Stronger at bottom */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10 transition-opacity duration-300 group-hover:via-black/50" />

            {/* Content Overlay */}
            <div className="absolute inset-0 p-5 flex flex-col justify-between">
                <div className="flex justify-start">
                    <span className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/10 shadow-lg">
                        <Folder size={14} className="text-white" />
                    </span>
                </div>

                <div className="transform transition-transform duration-300 group-hover:-translate-y-1">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-white/70">
                            Collection
                        </span>
                    </div>

                    <h3 className="text-2xl font-black text-white leading-none mb-2 drop-shadow-lg line-clamp-2 uppercase font-display">
                        {collection.name}
                    </h3>

                    <p className="text-xs font-medium text-white/60 flex items-center gap-2">
                        {recipeCount} {recipeCount === 1 ? 'recept' : 'recepten'}
                    </p>
                </div>
            </div>
        </div>
    );
}
