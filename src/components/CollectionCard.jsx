import React from 'react';
import { Folder, ChevronRight } from 'lucide-react';

export default function CollectionCard({ collection, onClick, recipeCount = 0 }) {
    return (
        <div
            onClick={onClick}
            className="group relative aspect-square rounded-2xl bg-zinc-900/50 border border-white/5 hover:border-white/10 overflow-hidden cursor-pointer transition-all hover:bg-zinc-800/50 hover:shadow-xl hover:-translate-y-1"
        >
            {/* Folder Tab Visual */}
            <div className="absolute top-0 left-0 w-24 h-8 bg-white/5 rounded-br-2xl border-b border-r border-white/5" />

            <div className="absolute inset-0 flex flex-col justify-between p-6">
                <div className="mt-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform duration-300">
                        <Folder size={24} fill="currentColor" fillOpacity={0.2} />
                    </div>
                </div>

                <div>
                    <h3 className="text-lg font-bold text-white mb-1 line-clamp-2 leading-tight group-hover:text-purple-400 transition-colors">
                        {collection.name}
                    </h3>
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        {recipeCount} recept{recipeCount !== 1 ? 'en' : ''}
                        <ChevronRight size={14} className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-purple-400" />
                    </p>
                </div>
            </div>

            {/* Hover Gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
    );
}
