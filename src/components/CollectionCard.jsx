import React, { useMemo } from 'react';
import { Folder } from 'lucide-react';

export default function CollectionCard({ collection, onClick, recipeCount = 0 }) {
    // Generate a consistent color based on the collection name/id if no color provided
    const accentColor = useMemo(() => {
        if (collection.color) return collection.color;
        const colors = ['from-blue-600 to-blue-900', 'from-purple-600 to-purple-900', 'from-emerald-600 to-emerald-900', 'from-amber-600 to-amber-900', 'from-rose-600 to-rose-900'];
        const hash = collection.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return colors[hash % colors.length];
    }, [collection.id, collection.color]);

    const CoverContent = () => (
        <div className={`w-full h-full relative overflow-hidden flex flex-col justify-between p-4 ${collection.image_url ? '' : `bg-gradient-to-br ${accentColor}`}`}>
            {/* If image exists, map it to cover */}
            {collection.image_url && (
                <>
                    <img
                        src={collection.image_url}
                        alt={collection.name}
                        className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/20" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
                </>
            )}

            {/* Branding / Title Text */}
            <div className="relative z-10 mt-2">
                <div className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 mb-3 shadow-lg">
                    <Folder size={14} className="text-white" />
                </div>
                <p className="text-[8px] font-bold tracking-[0.2em] text-white/60 uppercase mb-0.5">COLLECTION</p>
                <h3 className="text-xl font-black text-white leading-none uppercase font-display drop-shadow-lg break-words line-clamp-4">
                    {collection.name}
                </h3>
            </div>

            <div className="relative z-10">
                <p className="text-[10px] font-medium text-white/50 tracking-wider border-t border-white/20 pt-3">
                    {recipeCount} {recipeCount === 1 ? 'RECIPE' : 'RECIPES'}
                </p>
            </div>
        </div>
    );

    return (
        <div
            onClick={onClick}
            className="group relative aspect-[2/3] cursor-pointer bg-zinc-900/50 rounded-2xl border border-white/5 overflow-hidden"
        >
            {/* Background Ambient Effect for the Card */}
            <div className={`absolute inset-0 bg-gradient-to-br ${accentColor} opacity-10 group-hover:opacity-20 transition-opacity duration-500`} />

            {/* Center the book within the card */}
            <div className="absolute inset-0 flex items-center justify-center perspective-[800px] pt-8">

                {/* The 3D Book Object - Scaled Down */}
                <div className="relative w-[70%] h-[75%] transition-transform duration-500 ease-out [transform-style:preserve-3d] group-hover:[transform:rotateY(-25deg)_rotateX(5deg)_translateZ(30px)_translateY(-10px)]">

                    {/* 1. FRONT COVER */}
                    <div className="absolute inset-0 [transform:translateZ(15px)] rounded-r-[2px] shadow-2xl bg-zinc-900 border-l border-white/10 overflow-hidden">
                        <CoverContent />
                        {/* Lighting sheen */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none" />
                    </div>

                    {/* 2. SPINE (Left Side) */}
                    <div className={`absolute left-0 top-0 bottom-0 w-[30px] [transform:rotateY(-90deg)_translateZ(15px)] origin-left bg-gradient-to-r ${accentColor} brightness-75 flex items-center justify-center overflow-hidden border-r border-white/10`}>
                        {/* Spine Text */}
                        <span className="text-white/40 font-bold text-[8px] tracking-[0.2em] uppercase whitespace-nowrap [writing-mode:vertical-rl] rotate-180">
                            {collection.name.substring(0, 20)}
                        </span>
                    </div>

                    {/* 3. BACK COVER */}
                    <div className="absolute inset-0 [transform:translateZ(-15px)] bg-zinc-900/90 rounded-r-[2px]"></div>

                    {/* 4. PAGES (Right Side) */}
                    <div className="absolute right-0 top-[2px] bottom-[2px] w-[28px] [transform:rotateY(90deg)_translateZ(calc(100%_-_15px))] origin-right bg-white flex flex-col justify-center gap-px px-px border-l border-zinc-200">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="w-full h-px bg-zinc-300" />
                        ))}
                    </div>

                    {/* 5. TOP */}
                    <div className="absolute top-0 right-0 left-0 h-[30px] [transform:rotateX(90deg)_translateZ(15px)] origin-top bg-zinc-100"></div>

                    {/* 6. BOTTOM */}
                    <div className="absolute bottom-0 right-0 left-0 h-[30px] [transform:rotateX(-90deg)_translateZ(calc(100%_-_15px))] origin-bottom bg-zinc-100 shadow-inner"></div>
                </div>

                {/* FLOOR / SHADOW PLATFORM underneath the book */}
                <div className="absolute bottom-8 w-[60%] h-4 bg-black/60 blur-lg rounded-[100%] transition-all duration-500 group-hover:scale-125 group-hover:opacity-40 group-hover:translate-y-2 pointer-events-none translate-y-3" />
            </div>

            <div className="absolute inset-0 border border-white/5 rounded-2xl pointer-events-none" />
        </div>
    );
}
