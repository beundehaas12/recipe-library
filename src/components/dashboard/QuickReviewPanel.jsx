import React, { useState } from 'react';
import { Upload, X, Check, Trash2, Globe, Clock, Users, ChefHat, UtensilsCrossed, Timer, FileText, Camera, ExternalLink, FolderPlus, Loader2, CheckCircle2, Cpu, Hash, Code, Database, BrainCircuit, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function QuickReviewPanel({ selectedRecipe, onUpdate, onDelete, onUpload, collections, onCollectionToggle, onApprove }) {
    const [dragActive, setDragActive] = useState(false);
    const [activeTab, setActiveTab] = useState('recipe');
    const [showRawGrok, setShowRawGrok] = useState(false);
    const [expandedFields, setExpandedFields] = useState({});

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

    // If processing, show Thinking UI
    if (selectedRecipe && selectedRecipe.status === 'processing') {
        return (
            <div className="flex-1 bg-zinc-950 flex flex-col items-center justify-center p-8 min-h-0">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className="max-w-md w-full bg-zinc-900 border border-white/10 rounded-2xl p-8 text-center relative overflow-hidden shadow-2xl"
                >
                    {/* Animated Glow Background */}
                    <div className="absolute inset-0 bg-primary/5 animate-pulse pointer-events-none" />

                    <div className="relative z-10 flex flex-col items-center gap-6">
                        <div className="relative">
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                                className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary flex items-center justify-center"
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-2xl">⚡️</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-xl font-bold text-white">Analyseren...</h3>
                            <p className="text-muted-foreground text-sm">
                                De AI leest je foto en haalt de ingrediënten en stappen eruit.
                            </p>
                        </div>

                        {/* Fake Progress Steps */}
                        <div className="w-full space-y-3 pt-4 border-t border-white/5 text-left">
                            <motion.div
                                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}
                                className="flex items-center gap-3 text-sm text-primary"
                            >
                                <CheckCircle2 size={16} /> Image uploaden gereed
                            </motion.div>
                            <motion.div
                                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.5 }}
                                className="flex items-center gap-3 text-sm text-zinc-300"
                            >
                                <Loader2 size={16} className="animate-spin text-primary" /> Tekst herkennen...
                            </motion.div>
                            <motion.div
                                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 3 }}
                                className="flex items-center gap-3 text-sm text-zinc-500"
                            >
                                <div className="w-4 h-4 rounded-full border border-white/10" /> Structureren van data
                            </motion.div>
                        </div>
                    </div>
                </motion.div>
            </div>
        );
    }

    const extractionHistory = selectedRecipe.extraction_history || {};
    const rawData = selectedRecipe.raw_extracted_data || {};

    return (
        <div className="flex-1 bg-zinc-950 flex flex-col min-w-0 overflow-y-auto">
            {/* Top Action Bar */}
            <div className="h-14 border-b border-white/10 flex items-center justify-between px-6 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="bg-white/10 px-2 py-0.5 rounded text-xs font-mono text-white">ID: {selectedRecipe.id.slice(0, 8)}</span>
                    <span>•</span>
                    <span className={`uppercase font-bold text-xs ${selectedRecipe.status === 'completed' ? 'text-green-500' : 'text-amber-500'}`}>
                        {selectedRecipe.status}
                    </span>
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

            {/* Tabs */}
            <div className="flex border-b border-white/10 px-6 gap-6 bg-zinc-950/50 backdrop-blur-sm sticky top-14 z-10">
                <button
                    onClick={() => setActiveTab('recipe')}
                    className={`py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'recipe' ? 'border-primary text-white' : 'border-transparent text-muted-foreground hover:text-white'}`}
                >
                    <FileText size={16} /> Recipe
                </button>
                <button
                    onClick={() => setActiveTab('log')}
                    className={`py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'log' ? 'border-primary text-white' : 'border-transparent text-muted-foreground hover:text-white'}`}
                >
                    <Code size={16} /> AI Log
                </button>
            </div>

            <div className="p-8 max-w-4xl mx-auto w-full">
                {activeTab === 'recipe' ? (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
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
                ) : (
                    // LOG VIEW
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6">
                            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                <Cpu className="text-primary" size={20} />
                                Extraction Metadata
                            </h3>



                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-zinc-950 border border-white/10 rounded-xl p-4">
                                    <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold uppercase mb-2">
                                        <Cpu size={14} /> AI Model
                                    </div>
                                    <div className="text-sm font-mono text-white break-words">
                                        {/* Logic to determine correct model display name */}
                                        {(() => {
                                            const model = rawData.models_used || extractionHistory.ai_model || 'Unknown';
                                            // Fallback correction for legacy/incorrect default
                                            if (model === 'gemini-3-flash-preview' && (extractionHistory.ocr_pages || extractionHistory.usage?.ocr_pages)) {
                                                return 'Mistral OCR 3 + Grok 4';
                                            }
                                            return model;
                                        })()}
                                    </div>
                                </div>
                                <div className="bg-zinc-950 border border-white/10 rounded-xl p-4">
                                    <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold uppercase mb-2">
                                        <Hash size={14} /> Tokens Used
                                    </div>
                                    {/* Breakdown of tokens */}
                                    {(() => {
                                        const usage = extractionHistory.usage || extractionHistory;
                                        // Support legacy props and new explicit props
                                        const grokInput = usage.grok_input_tokens || usage.prompt_tokens || 0;
                                        const grokOutput = usage.grok_output_tokens || usage.completion_tokens || 0;
                                        const grokTotal = grokInput + grokOutput;

                                        const total = usage.total_tokens || grokTotal;
                                        const ocrPages = usage.ocr_pages;

                                        return (
                                            <div className="flex flex-col">
                                                <div className="text-xl font-mono text-white mb-2">
                                                    {total} <span className="text-xs text-muted-foreground font-sans uppercase">LLM Tokens</span>
                                                </div>
                                                <div className="space-y-1 border-t border-white/5 pt-2">
                                                    {ocrPages !== undefined && (
                                                        <div className="flex justify-between text-xs">
                                                            <span className="text-muted-foreground">Mistral (Pages):</span>
                                                            <span className="text-white font-mono">{ocrPages}</span>
                                                        </div>
                                                    )}
                                                    {grokTotal > 0 && (
                                                        <div className="flex justify-between text-xs">
                                                            <span className="text-muted-foreground">Grok (Tokens):</span>
                                                            <span className="text-white font-mono">{grokTotal}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                                <div className="bg-zinc-950 border border-white/10 rounded-xl p-4">
                                    <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold uppercase mb-2">
                                        <Clock size={14} /> Processing Time
                                    </div>
                                    <div className="text-xl font-mono text-white">
                                        {extractionHistory.processing_time_ms ? `${extractionHistory.processing_time_ms}ms` : 'N/A'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Missing Information / Issues (Mocked logic or real if available) */}
                        {(!selectedRecipe.title || !selectedRecipe.ingredients?.length) && (
                            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6">
                                <h3 className="text-sm font-bold text-amber-500 mb-2 uppercase tracking-wider">Potential Issues</h3>
                                <ul className="list-disc list-inside text-amber-200/80 text-sm space-y-1">
                                    {!selectedRecipe.title && <li>Title could not be confidently extracted</li>}
                                    {!selectedRecipe.ingredients?.length && <li>No ingredients identified</li>}
                                </ul>
                            </div>
                        )}

                        {/* 1.5 AI Reasoning Trace */}
                        {(selectedRecipe.extra_data?.ai_reasoning_trace || rawData.grok_response?.includes('Redenering')) && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                        <BrainCircuit size={14} className="text-purple-400" /> AI Analysis
                                    </label>
                                    <span className="text-xs text-purple-400">Step 1.5: Reasoning Chain</span>
                                </div>
                                <div className="bg-purple-950/20 border border-purple-500/20 rounded-xl overflow-hidden">
                                    <div className="p-4 max-h-60 overflow-y-auto">
                                        <pre className="text-xs font-mono text-purple-200/80 leading-relaxed whitespace-pre-wrap break-words">
                                            {selectedRecipe.extra_data?.ai_reasoning_trace || 'Reasoning trace available in JSON.'}
                                        </pre>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="space-y-4">
                            {/* 2. Mistral OCR Output (Moved below KPIs) */}
                            {(rawData.ocr_extraction || rawData.raw_text) && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                            <FileText size={14} /> Mistral OCR Output
                                        </label>
                                        <span className="text-xs text-zinc-500">Step 1: Raw Extraction</span>
                                    </div>
                                    <div className="bg-zinc-950/50 rounded-xl border border-white/10 overflow-hidden">
                                        <div className="p-4 overflow-x-auto max-h-96 overflow-y-auto bg-zinc-950">
                                            <pre className="text-xs font-mono text-zinc-300 leading-relaxed whitespace-pre-wrap break-words">
                                                {rawData.ocr_extraction || rawData.raw_text}
                                            </pre>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                        <Code size={14} /> Grok Response
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setShowRawGrok(!showRawGrok)}
                                            className="text-[10px] bg-white/5 hover:bg-white/10 text-zinc-400 px-2 py-1 rounded border border-white/10 transition-colors"
                                        >
                                            {showRawGrok ? 'Show Formatted' : 'Show JSON'}
                                        </button>
                                        <span className="text-xs text-muted-foreground">Step 2: Structured JSON</span>
                                    </div>
                                </div>
                                <div className="bg-zinc-950 border border-white/10 rounded-2xl overflow-hidden">
                                    <div className="p-2 border-b border-white/5 bg-white/5 flex gap-2">
                                        <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
                                        <div className="w-3 h-3 rounded-full bg-amber-500/20 border border-amber-500/50" />
                                        <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50" />
                                    </div>

                                    {showRawGrok ? (
                                        <div className="p-4 overflow-x-auto">
                                            <pre className="text-xs font-mono text-zinc-400 leading-relaxed whitespace-pre-wrap break-all">
                                                {/* Filter out large OCR text from display if possible */}
                                                {(() => {
                                                    const displayData = { ...rawData };
                                                    delete displayData.ocr_extraction; // Hide huge text
                                                    delete displayData.raw_text;
                                                    // Use selectedRecipe if rawData is empty or just generic
                                                    const dataToShow = Object.keys(displayData).length > 2 ? displayData : selectedRecipe;
                                                    return JSON.stringify(dataToShow, null, 2);
                                                })()}
                                            </pre>
                                        </div>
                                    ) : (
                                        <div className="p-6 space-y-4">
                                            {/* Human Readable Preview */}
                                            <div>
                                                <h4 className="text-lg font-serif text-white mb-1">{selectedRecipe.title || 'Untitled Recipe'}</h4>
                                                <p className="text-sm text-zinc-400 italic line-clamp-2">{selectedRecipe.description || 'No description available.'}</p>
                                            </div>

                                            <div className="grid grid-cols-3 gap-2 py-3 border-y border-white/5">
                                                <div className="text-center">
                                                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Prep</div>
                                                    <div className="text-sm font-mono text-zinc-300">{selectedRecipe.prep_time || '-'}</div>
                                                </div>
                                                <div className="text-center border-l border-white/5">
                                                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Cook</div>
                                                    <div className="text-sm font-mono text-zinc-300">{selectedRecipe.cook_time || '-'}</div>
                                                </div>
                                                <div className="text-center border-l border-white/5">
                                                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Servings</div>
                                                    <div className="text-sm font-mono text-zinc-300">{selectedRecipe.servings || '-'}</div>
                                                </div>
                                            </div>

                                            <div className="flex gap-4 text-xs text-zinc-500">
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                    {Array.isArray(selectedRecipe.ingredients) ? selectedRecipe.ingredients.length : 0} Ingredients
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                                    {Array.isArray(selectedRecipe.instructions) ? selectedRecipe.instructions.length : 0} Steps
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 3. Database Population Log */}
                            <div className="space-y-4 pt-4 border-t border-white/10">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                        <Database size={14} /> Database Fields
                                    </label>
                                    <span className="text-xs text-muted-foreground">Step 3: Populated Record</span>
                                </div>
                                <div className="bg-zinc-900 border border-white/10 rounded-xl overflow-hidden">
                                    <div className="grid grid-cols-1 divide-y divide-white/5">
                                        {[
                                            { key: 'title', label: 'Title' },
                                            { key: 'subtitle', label: 'Subtitle' },
                                            { key: 'introduction', label: 'Intro' },
                                            { key: 'description', label: 'Description' },
                                            { key: 'prep_time', label: 'Prep Time' },
                                            { key: 'cook_time', label: 'Cook Time' },
                                            { key: 'passive_time', label: 'Passive Time' },
                                            { key: 'total_time', label: 'Total Time', getter: (r) => r.total_time || r.extra_data?.total_time },
                                            { key: 'servings', label: 'Servings' },
                                            { key: 'cuisine', label: 'Cuisine' },
                                            { key: 'difficulty', label: 'Difficulty' },
                                            { key: 'author', label: 'Author' },
                                            { key: 'cookbook_name', label: 'Cookbook' },
                                            { key: 'isbn', label: 'ISBN' },
                                            { key: 'source_url', label: 'Source URL' },
                                            { key: 'source_language', label: 'Language' },
                                            { key: 'ai_tags', label: 'Tags', formatter: v => Array.isArray(v) ? v.join(', ') : (v || '-') },
                                            { key: 'ingredients', label: 'Ingredients', expandable: true, formatter: v => Array.isArray(v) ? `${v.length} items` : '0 items' },
                                            { key: 'instructions', label: 'Instructions', expandable: true, formatter: v => Array.isArray(v) ? `${v.length} steps` : '0 steps' },
                                        ].map((field) => {
                                            const value = field.getter ? field.getter(selectedRecipe) : selectedRecipe[field.key];
                                            const hasValue = Array.isArray(value) ? value.length > 0 : !!value;
                                            const displayValue = field.formatter ? field.formatter(value) : (value || '-');
                                            const isExpanded = expandedFields[field.key];

                                            // Get reasoning from extra_data.reasoning
                                            const reasoning = selectedRecipe.extra_data?.reasoning?.[field.key];

                                            return (
                                                <div key={field.key}>
                                                    <div
                                                        className={`grid grid-cols-[120px_1fr_1fr] items-center gap-4 p-3 text-sm hover:bg-white/5 transition-colors ${field.expandable ? 'cursor-pointer' : ''}`}
                                                        onClick={() => field.expandable && setExpandedFields(prev => ({ ...prev, [field.key]: !prev[field.key] }))}
                                                    >
                                                        <span className="text-zinc-500 font-medium truncate flex items-center gap-1" title={field.label}>
                                                            {field.expandable && (
                                                                <ChevronDown size={14} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                                            )}
                                                            {field.label}
                                                        </span>
                                                        <span className={`font-mono truncate ${hasValue ? 'text-green-400' : 'text-zinc-600'}`}>
                                                            {typeof displayValue === 'string' ? displayValue : JSON.stringify(displayValue)}
                                                        </span>
                                                        <span className="text-xs text-zinc-500 italic truncate" title={reasoning || ''}>
                                                            {reasoning ? `"${reasoning}"` : ''}
                                                        </span>
                                                    </div>
                                                    {/* Expanded content for ingredients/instructions */}
                                                    {field.expandable && isExpanded && Array.isArray(value) && value.length > 0 && (
                                                        <div className="bg-black/30 border-t border-white/5 p-3 text-xs space-y-1">
                                                            {field.key === 'ingredients' && (() => {
                                                                // Group ingredients by group_name
                                                                const groups = {};
                                                                value.forEach(ing => {
                                                                    const groupName = ing.group_name || 'Ingrediënten';
                                                                    if (!groups[groupName]) groups[groupName] = [];
                                                                    groups[groupName].push(ing);
                                                                });
                                                                return Object.entries(groups).map(([groupName, ings]) => (
                                                                    <div key={groupName} className="mb-2">
                                                                        {Object.keys(groups).length > 1 && (
                                                                            <div className="text-purple-400 font-bold mb-1 uppercase text-[10px] tracking-wider">{groupName}</div>
                                                                        )}
                                                                        {ings.map((ing, i) => (
                                                                            <div key={i} className="text-zinc-400 font-mono pl-2">
                                                                                {ing.amount && <span className="text-green-400">{ing.amount}</span>}
                                                                                {ing.unit && <span className="text-blue-400 ml-1">{ing.unit}</span>}
                                                                                <span className="text-white ml-1">{ing.name || ing.item}</span>
                                                                                {ing.preparation && <span className="text-yellow-400 ml-1">({ing.preparation})</span>}
                                                                                {ing.notes && <span className="text-zinc-500 ml-1">- {ing.notes}</span>}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                ));
                                                            })()}
                                                            {field.key === 'instructions' && value.map((step, i) => (
                                                                <div key={i} className="text-zinc-400 font-mono flex gap-2">
                                                                    <span className="text-primary font-bold">{step.step_number || i + 1}.</span>
                                                                    <span className="text-white/80">{step.description}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
