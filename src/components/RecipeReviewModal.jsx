import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, ArrowRight, AlertTriangle } from 'lucide-react';
import { diffRecipes } from '../lib/diff';

export function RecipeReviewModal({ original, enriched, onConfirm, onCancel }) {
    const changes = diffRecipes(original, enriched);
    const hasModifications = Object.keys(changes.modified).length > 0;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl"
            >
                {/* Header */}
                <div className="p-6 border-b border-white/10 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <span className="text-primary">✨</span> AI Verbeteringen Review
                        </h2>
                        <p className="text-white/60 text-sm mt-1">
                            Controleer de wijzigingen voordat je ze toepast.
                        </p>
                    </div>
                    {hasModifications && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded-full">
                            <AlertTriangle size={14} className="text-yellow-500" />
                            <span className="text-yellow-500 text-xs font-bold uppercase">Let op: wijzigingen</span>
                        </div>
                    )}
                </div>

                {/* Body - Scrollable */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">

                    {/* 1. Added Metadata */}
                    {Object.entries(changes.added).map(([key, { new: val }]) => (
                        <div key={key} className="bg-green-500/5 border border-green-500/10 rounded-xl p-4">
                            <div className="text-[10px] uppercase font-bold text-green-500 mb-1 flex items-center gap-2">
                                <Check size={12} /> Toegevoegd: {key}
                            </div>
                            <div className="text-white font-medium">
                                {Array.isArray(val) ? val.join(', ') : String(val)}
                            </div>
                        </div>
                    ))}

                    {/* 2. Modified Fields (Warning) */}
                    {Object.entries(changes.modified).map(([key, { old, new: val }]) => (
                        <div key={key} className="bg-yellow-500/5 border border-yellow-500/10 rounded-xl p-4">
                            <div className="text-[10px] uppercase font-bold text-yellow-500 mb-2 flex items-center gap-2">
                                <AlertTriangle size={12} /> Gewijzigd: {key}
                            </div>
                            <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
                                <div className="text-white/60 line-through text-sm">{String(old)}</div>
                                <ArrowRight size={14} className="text-white/20" />
                                <div className="text-white font-bold">{String(val)}</div>
                            </div>
                        </div>
                    ))}

                    {/* 3. Structural Improvements (Ingredients) */}
                    {changes.structured.ingredients && (
                        <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-4">
                            <div className="text-[10px] uppercase font-bold text-blue-400 mb-2">
                                Structuur Verbetering: Ingrediënten
                            </div>
                            <div className="text-sm text-white/70">
                                De ingrediënten zijn gesplitst in hoeveelheid, eenheid en naam voor betere leesbaarheid.
                                <span className="block mt-1 text-white font-mono text-xs opacity-50">
                                    {changes.structured.ingredients.new.length} items (was {changes.structured.ingredients.old.length})
                                </span>
                            </div>
                        </div>
                    )}

                    {Object.keys(changes.added).length === 0 && Object.keys(changes.modified).length === 0 && !changes.structured.ingredients && (
                        <div className="text-center py-8 text-white/40 italic">
                            Geen significante wijzigingen gevonden.
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/10 flex gap-3 justify-end bg-zinc-900/50 rounded-b-2xl">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-colors font-medium text-sm"
                    >
                        Annuleren
                    </button>
                    <button
                        onClick={() => onConfirm(enriched)}
                        className="px-6 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg transition-all active:scale-95 flex items-center gap-2"
                    >
                        <Check size={16} />
                        Wijzigingen Toepassen
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
