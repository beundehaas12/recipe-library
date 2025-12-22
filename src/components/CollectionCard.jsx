import React, { useMemo } from 'react';
import { Folder } from 'lucide-react';

export default function CollectionCard({ collection, onClick, recipeCount = 0 }) {
    // Generate a consistent color based on the collection name/id if no color provided
    // This serves as a fallback or the "gradient color" requested
    const accentColor = useMemo(() => {
        if (collection.color) return collection.color;
        const colors = ['from-blue-600 to-blue-900', 'from-purple-600 to-purple-900', 'from-emerald-600 to-emerald-900', 'from-amber-600 to-amber-900', 'from-rose-600 to-rose-900'];
        // Simple hash to pick a stable random color
        const hash = collection.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return colors[hash % colors.length];
    }, [collection.id, collection.color]);

    const CoverContent = () => (
        <div className={`w-full h-full relative overflow-hidden flex flex-col justify-between p-6 ${collection.image_url ? '' : `bg-gradient-to-br ${accentColor}`}`}>
            {/* If image exists, map it to cover */}
            {collection.image_url && (
                <>
                    <img
                        src={collection.image_url}
                        alt={collection.name}
                        className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/20" /> {/* Dimmer */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
                </>
            )}

            {/* Branding / Title Text - "Book Packaging Mockup" style */}
            <div className="relative z-10 mt-4">
                <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 mb-4 shadow-lg">
                    <Folder size={18} className="text-white" />
                </div>
                <p className="text-[10px] font-bold tracking-[0.2em] text-white/60 uppercase mb-1">COLLECTION</p>
                <h3 className="text-2xl font-black text-white leading-none uppercase font-display drop-shadow-lg break-words">
                    {collection.name}
                </h3>
            </div>

            <div className="relative z-10">
                <p className="text-xs font-medium text-white/50 tracking-wider border-t border-white/20 pt-4">
                    {recipeCount} {recipeCount === 1 ? 'RECIPE' : 'RECIPES'}
                </p>
            </div>
        </div>
    );

    return (
        <div
            onClick={onClick}
            className="group relative aspect-[2/3] perspective-[1000px] cursor-pointer"
        >
            {/* The 3D Book Container */}
            <div className="relative w-full h-full transition-transform duration-500 ease-out [transform-style:preserve-3d] group-hover:[transform:rotateY(-25deg)_rotateX(5deg)_translateZ(20px)]">

                {/* 1. FRONT COVER */}
                <div className="absolute inset-0 [transform:translateZ(25px)] rounded-r-sm shadow-2xl bg-zinc-900 border-l border-white/10 overflow-hidden">
                    <CoverContent />
                    {/* Lighting sheen */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none" />
                </div>

                {/* 2. SPINE (Left Side) */}
                <div className={`absolute left-0 top-0 bottom-0 w-[50px] [transform:rotateY(-90deg)_translateZ(25px)] origin-left bg-gradient-to-r ${accentColor} brightness-75 flex items-center justify-center overflow-hidden border-r border-white/10`}>
                    {/* Spine Text (Rotated) */}
                    <span className="text-white/40 font-bold text-xs tracking-[0.3em] uppercase whitespace-nowrap [writing-mode:vertical-rl] rotate-180">
                        {collection.name}
                    </span>
                </div>

                {/* 3. BACK COVER (Creating the box thickness visually from behind) */}
                <div className="absolute inset-0 [transform:translateZ(-25px)] bg-zinc-900/90 rounded-r-sm"></div>

                {/* 4. PAGES (Right Side) */}
                {/* We need fewer pages visible because it's a box/book. Let's make it look like paper stack */}
                <div className="absolute right-0 top-1 bottom-1 w-[48px] [transform:rotateY(90deg)_translateZ(calc(100%_-_25px))] origin-right bg-white flex flex-col justify-center gap-0.5 px-0.5 border-l border-zinc-200">
                    {/* Simulated page lines */}
                    {Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} className="w-full h-px bg-zinc-300" />
                    ))}
                </div>

                {/* 5. TOP (Top of pages/cover) */}
                <div className="absolute top-0 right-0 left-0 h-[50px] [transform:rotateX(90deg)_translateZ(25px)] origin-top bg-zinc-100"></div>

                {/* 6. BOTTOM */}
                <div className="absolute bottom-0 right-0 left-0 h-[50px] [transform:rotateX(-90deg)_translateZ(calc(100%_-_25px))] origin-bottom bg-zinc-100 shadow-inner"></div>

            </div>

            {/* FLOATING SHADOW / REFLECTION */}
            {/* Uses a blurred pseudo-element behind/underneath */}
            <div className={`absolute -bottom-8 left-4 right-4 h-8 blur-xl opacity-40 rounded-[100%] transition-all duration-500 group-hover:scale-110 group-hover:opacity-60 bg-gradient-to-r ${accentColor} -z-10`} />

        </div>
    );
}
