import React from 'react';
import { Clock, CheckCircle2, AlertCircle, FileText, Image as ImageIcon } from 'lucide-react';

export default function RecipeQueueList({ recipes, selectedId, onSelect }) {
    // Group recipes by status or date
    const getStatusIcon = (status) => {
        switch (status) {
            case 'completed': return <CheckCircle2 size={16} className="text-green-500" />;
            case 'processing': return <Clock size={16} className="text-amber-500 animate-pulse" />;
            case 'error': return <AlertCircle size={16} className="text-red-500" />;
            default: return <FileText size={16} className="text-muted-foreground" />;
        }
    };

    return (
        <div className="flex-1 bg-zinc-900 border-r border-white/10 flex flex-col min-w-[300px] max-w-md">
            {/* List Header */}
            <div className="h-10 border-b border-white/10 flex items-center px-4 bg-zinc-950/50">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Name</span>
                <span className="ml-auto text-xs font-bold text-muted-foreground uppercase tracking-widest">Date</span>
            </div>

            {/* List Content */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {recipes.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground text-sm">
                        No recipes found
                    </div>
                ) : (
                    recipes.map((recipe) => (
                        <button
                            key={recipe.id}
                            onClick={() => onSelect(recipe.id)}
                            className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-all ${selectedId === recipe.id
                                    ? 'bg-primary text-black'
                                    : 'hover:bg-white/5 text-zinc-300 hover:text-white'
                                }`}
                        >
                            <div className={`w-10 h-10 rounded-md flex items-center justify-center shrink-0 overflow-hidden border ${selectedId === recipe.id ? 'border-black/20 bg-black/10' : 'border-white/10 bg-zinc-800'}`}>
                                {recipe.image_url ? (
                                    <img src={recipe.image_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <ImageIcon size={18} className="opacity-50" />
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <h4 className={`text-sm font-bold truncate ${selectedId === recipe.id ? 'text-black' : 'text-zinc-200'}`}>
                                    {recipe.title || 'Untitled Recipe'}
                                </h4>
                                <div className="flex items-center gap-2 mt-0.5">
                                    {getStatusIcon(recipe.status)}
                                    <span className={`text-xs truncate ${selectedId === recipe.id ? 'text-black/70' : 'text-muted-foreground'}`}>
                                        {recipe.status === 'processing' ? 'Processing...' : (recipe.prep_time || 'No time set')}
                                    </span>
                                </div>
                            </div>

                            <span className={`text-[10px] whitespace-nowrap ${selectedId === recipe.id ? 'text-black/60' : 'text-muted-foreground'}`}>
                                {new Date(recipe.created_at).toLocaleDateString()}
                            </span>
                        </button>
                    ))
                )}
            </div>
        </div>
    );
}
