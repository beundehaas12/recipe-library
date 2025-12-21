import React, { useState } from 'react';
import { Upload, X, Check, Trash2, Globe, Clock, Users, ChefHat, UtensilsCrossed, Timer, FileText, Camera, ExternalLink, FolderPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function QuickReviewPanel({ selectedRecipe, onUpdate, onDelete, onUpload, collections, onCollectionToggle, onApprove }) {
    const [dragActive, setDragActive] = useState(false);

    // Handle drag events
    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    // Handle drop
    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            onUpload(e.dataTransfer.files);
        }
    };

    // If no recipe selected, show upload dropzone
    if (!selectedRecipe) {
        return (
            <div
                className={`flex-1 bg-zinc-950 flex flex-col items-center justify-center p-8 transition-colors ${dragActive ? 'bg-primary/5' : ''}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
            >
                <div className={`relative w-full max-w-lg aspect-video rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-4 transition-all ${dragActive ? 'border-primary bg-primary/10 scale-105' : 'border-white/10 hover:border-primary/50 hover:bg-white/5'}`}>
                    <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center">
                        <Upload size={32} className={dragActive ? "text-primary" : "text-muted-foreground"} />
                    </div>
                    <div className="text-center">
                        <h3 className="text-xl font-bold text-white mb-2">Drop recipes here</h3>
                        <p className="text-muted-foreground">Or click anywhere to upload</p>
                    </div>
                    <input
                        type="file"
                        multiple
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={(e) => e.target.files && onUpload(e.target.files)}
                    />
                </div>
            </div>
        );
    }



    // If no recipe selected, show upload dropzone
    if (!selectedRecipe) {
        return (
            <div
                className={`flex-1 bg-zinc-950 flex flex-col items-center justify-center p-8 transition-colors ${dragActive ? 'bg-primary/5' : ''}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
            >
                <div className={`relative w-full max-w-lg aspect-video rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-4 transition-all ${dragActive ? 'border-primary bg-primary/10 scale-105' : 'border-white/10 hover:border-primary/50 hover:bg-white/5'}`}>
                    <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center">
                        <Upload size={32} className={dragActive ? "text-primary" : "text-muted-foreground"} />
                    </div>
                    <div className="text-center">
                        <h3 className="text-xl font-bold text-white mb-2">Drop recipes here</h3>
                        <p className="text-muted-foreground">Or click anywhere to upload</p>
                    </div>
                    <input
                        type="file"
                        multiple
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={(e) => e.target.files && onUpload(e.target.files)}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 bg-zinc-950 flex flex-col min-w-0 overflow-y-auto">
            {/* Top Action Bar */}
            <div className="h-14 border-b border-white/10 flex items-center justify-between px-6 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="bg-white/10 px-2 py-0.5 rounded text-xs font-mono text-white">ID: {selectedRecipe.id.slice(0, 8)}</span>
                    <span>•</span>
                    <span>{selectedRecipe.status === 'completed' ? 'Ready' : 'Draft'}</span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onDelete(selectedRecipe.id)}
                        className="p-2 hover:bg-red-500/10 hover:text-red-500 text-muted-foreground rounded-lg transition-colors"
                        title="Delete"
                    >
                        <Trash2 size={18} />
                    </button>
                    <div className="w-px h-6 bg-white/10 mx-2" />
                    <button className="btn-secondary px-4 py-1.5 text-xs font-bold uppercase tracking-wider">
                        Edit Full
                    </button>
                    {selectedRecipe.id.toString().startsWith('temp-') && (
                        <button
                            onClick={() => onApprove && onApprove(selectedRecipe.id)}
                            className="btn-primary px-4 py-1.5 text-xs font-bold uppercase tracking-wider flex items-center gap-2"
                        >
                            <Check size={14} />
                            Approve
                        </button>
                    )}
                </div>
            </div>

            <div className="p-8 max-w-4xl mx-auto w-full space-y-8">
                {/* Image Preview */}
                <div className="aspect-video w-full bg-zinc-900 rounded-xl overflow-hidden border border-white/10 shadow-2xl relative group">
                    {selectedRecipe.image_url ? (
                        <img src={selectedRecipe.image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground gap-2">
                            <ChefHat size={32} />
                            No image
                        </div>
                    )}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white px-4 py-2 rounded-lg font-medium transition-colors">
                            Change Image
                        </button>
                    </div>
                </div>

                {/* Quick Edit Form */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
                    <div className="space-y-4 md:col-span-2">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Recipe Title</label>
                        <input
                            type="text"
                            value={selectedRecipe.title || ''}
                            onChange={(e) => onUpdate(selectedRecipe.id, { title: e.target.value })}
                            className="w-full bg-zinc-900 border border-white/10 rounded-lg p-4 text-xl font-bold text-white focus:outline-none focus:border-primary/50 transition-all font-display"
                            placeholder="Untitled Recipe"
                        />
                    </div>

                    <div className="space-y-4 md:col-span-2">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                            <FileText size={14} /> Description
                        </label>
                        <textarea
                            value={selectedRecipe.description || selectedRecipe.intro || ''}
                            onChange={(e) => onUpdate(selectedRecipe.id, { description: e.target.value })}
                            className="w-full h-24 bg-zinc-900 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-primary/50 transition-all resize-none"
                            placeholder="A brief description of this recipe..."
                        />
                    </div>

                    <div className="space-y-4">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                            <Clock size={14} /> Prep Time
                        </label>
                        <input
                            type="text"
                            value={selectedRecipe.prep_time || ''}
                            onChange={(e) => onUpdate(selectedRecipe.id, { prep_time: e.target.value })}
                            className="w-full bg-zinc-900 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-primary/50 transition-all"
                            placeholder="e.g. 15 min"
                        />
                    </div>

                    <div className="space-y-4">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                            <Timer size={14} /> Cook Time
                        </label>
                        <input
                            type="text"
                            value={selectedRecipe.cook_time || ''}
                            onChange={(e) => onUpdate(selectedRecipe.id, { cook_time: e.target.value })}
                            className="w-full bg-zinc-900 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary/50 transition-all"
                            placeholder="e.g. 30 min"
                        />
                    </div>

                    <div className="space-y-4">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                            <Users size={14} /> Servings
                        </label>
                        <input
                            type="text"
                            value={selectedRecipe.servings || ''}
                            onChange={(e) => onUpdate(selectedRecipe.id, { servings: e.target.value })}
                            className="w-full bg-zinc-900 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary/50 transition-all"
                            placeholder="e.g. 4 people"
                        />
                    </div>

                    <div className="space-y-4">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                            <UtensilsCrossed size={14} /> Cuisine
                        </label>
                        <input
                            type="text"
                            value={selectedRecipe.cuisine || ''}
                            onChange={(e) => onUpdate(selectedRecipe.id, { cuisine: e.target.value })}
                            className="w-full bg-zinc-900 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary/50 transition-all"
                            placeholder="e.g. Italian, Mexican..."
                        />
                    </div>
                    {/* Collections Assignment */}
                    <div className="md:col-span-2 space-y-4 border-t border-white/10 pt-6">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                <FolderPlus size={14} /> Collections
                            </label>
                            {collections?.length === 0 && (
                                <span className="text-xs text-muted-foreground italic">No collections created</span>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {collections?.map(collection => {
                                const isActive = selectedRecipe.recipe_collections?.some(rc => rc.collection_id === collection.id);
                                return (
                                    <button
                                        key={collection.id}
                                        onClick={() => onCollectionToggle(selectedRecipe.id, collection.id)}
                                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border flex items-center gap-1.5 ${isActive
                                            ? 'bg-white text-black border-white'
                                            : 'bg-zinc-900 text-zinc-400 border-white/10 hover:border-white/30 hover:text-zinc-200'
                                            }`}
                                    >
                                        {isActive && <Check size={12} />}
                                        {collection.name}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    {/* Source Type Display */}
                    <div className="md:col-span-2 space-y-4 border-t border-white/10 pt-6">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Source</label>
                        <div className="bg-zinc-900 border border-white/10 rounded-xl p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    {selectedRecipe.original_image_url || selectedRecipe.source_type === 'image' ? (
                                        <>
                                            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                                                <Camera size={20} className="text-amber-500" />
                                            </div>
                                            <div>
                                                <div className="text-white font-medium">Photo Upload</div>
                                                <div className="text-white/40 text-xs">Captured from image</div>
                                            </div>
                                        </>
                                    ) : selectedRecipe.source_url ? (
                                        <>
                                            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                                <Globe size={20} className="text-blue-500" />
                                            </div>
                                            <div>
                                                <div className="text-white font-medium">Website URL</div>
                                                <div className="text-white/40 text-xs truncate max-w-[200px]">
                                                    {selectedRecipe.source_url.replace(/^https?:\/\//, '').split('/')[0]}
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                                                <FileText size={20} className="text-white/40" />
                                            </div>
                                            <div>
                                                <div className="text-white/60 font-medium">Manual Entry</div>
                                                <div className="text-white/40 text-xs">No source linked</div>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Action Button */}
                                {selectedRecipe.original_image_url ? (
                                    <a
                                        href={selectedRecipe.original_image_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 rounded-lg font-bold text-xs uppercase tracking-wider transition-all"
                                    >
                                        View Photo <ExternalLink size={14} />
                                    </a>
                                ) : selectedRecipe.source_url && (
                                    <a
                                        href={selectedRecipe.source_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 rounded-lg font-bold text-xs uppercase tracking-wider transition-all"
                                    >
                                        Open URL <ExternalLink size={14} />
                                    </a>
                                )}
                            </div>

                            {/* Editable source_url field */}
                            {selectedRecipe.source_url && (
                                <div className="mt-4 pt-4 border-t border-white/5">
                                    <input
                                        type="text"
                                        value={selectedRecipe.source_url || ''}
                                        onChange={(e) => onUpdate(selectedRecipe.id, { source_url: e.target.value })}
                                        className="w-full bg-zinc-800 border border-white/10 rounded-lg p-2 text-sm text-white/70 focus:outline-none focus:border-primary/50 transition-all"
                                        placeholder="https://..."
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Extended Details */}
                    <div className="md:col-span-2 space-y-4 border-t border-white/10 pt-6">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Ingredients</label>
                        <div className="bg-zinc-900 border border-white/10 rounded-xl p-4 text-sm text-zinc-300 space-y-2">
                            {Array.isArray(selectedRecipe.ingredients) ? (
                                selectedRecipe.ingredients.map((ing, i) => (
                                    <div key={i} className="flex items-start gap-2 border-b border-white/5 last:border-0 pb-2 last:pb-0">
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                                        <span>
                                            {typeof ing === 'string' ? ing : `${ing.amount || ''} ${ing.unit || ''} ${ing.item || ''}`}
                                        </span>
                                    </div>
                                ))
                            ) : (
                                <p className="italic text-white/20">No ingredients parsed</p>
                            )}
                        </div>
                    </div>

                    <div className="md:col-span-2 space-y-4">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Instructions</label>
                        <textarea
                            value={Array.isArray(selectedRecipe.instructions)
                                ? selectedRecipe.instructions.join('\n\n')
                                : selectedRecipe.instructions || ''}
                            onChange={(e) => onUpdate(selectedRecipe.id, { instructions: e.target.value })}
                            className="w-full h-64 bg-zinc-900 border border-white/10 rounded-lg p-4 text-white focus:outline-none focus:border-primary/50 transition-all resize-none leading-relaxed"
                            placeholder="Step 1..."
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
