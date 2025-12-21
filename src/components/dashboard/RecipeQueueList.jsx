import React, { useState } from 'react';
import { Clock, CheckCircle2, AlertCircle, FileText, Image as ImageIcon, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function RecipeQueueList({ recipes, selectedId, onSelect, onUpload }) {
    const [dragActive, setDragActive] = useState(false);

    // Group recipes by status or date
    const getStatusIcon = (status) => {
        switch (status) {
            case 'completed': return <CheckCircle2 size={16} className="text-green-500" />;
            case 'processing': return <Clock size={16} className="text-amber-500 animate-pulse" />;
            case 'error': return <AlertCircle size={16} className="text-red-500" />;
            default: return <FileText size={16} className="text-muted-foreground" />;
        }
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0] && onUpload) {
            onUpload(e.dataTransfer.files);
        }
    };

    return (
        <div
            className="flex-1 bg-zinc-900 border-r border-white/10 flex flex-col min-w-[300px] max-w-md h-full min-h-0 relative"
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
        >
            <AnimatePresence>
                {dragActive && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-50 bg-primary/20 backdrop-blur-sm flex items-center justify-center p-4"
                    >
                        <div className="bg-zinc-900/90 p-6 rounded-2xl border-2 border-primary border-dashed shadow-2xl text-center w-full max-w-[200px]">
                            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-2">
                                <Upload size={24} className="text-primary" />
                            </div>
                            <h3 className="text-sm font-bold text-white">Drop to Upload</h3>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* List Header */}
            <div className="h-10 border-b border-white/10 flex items-center px-4 bg-zinc-950/50">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Name</span>
                <span className="ml-auto text-xs font-bold text-muted-foreground uppercase tracking-widest">Date</span>
            </div>

            {/* List Content */}
            <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
                {recipes.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground text-sm">
                        No recipes found
                    </div>
                ) : (
                    recipes.map((recipe) => (
                        <button
                            key={recipe.id}
                            onClick={() => onSelect(recipe.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-all ${selectedId === recipe.id
                                ? 'bg-primary text-black shadow-sm'
                                : 'hover:bg-white/5 text-zinc-300 hover:text-white'
                                }`}
                        >
                            <div className={`w-9 h-9 rounded-sm flex items-center justify-center shrink-0 overflow-hidden border ${selectedId === recipe.id ? 'border-black/20 bg-black/10' : 'border-white/10 bg-zinc-800'}`}>
                                {recipe.image_url ? (
                                    <img src={recipe.image_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <ImageIcon size={16} className="opacity-50" />
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
