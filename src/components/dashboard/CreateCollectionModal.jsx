import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FolderPlus, X, Hash, Image, Palette } from 'lucide-react';

export default function CreateCollectionModal({ isOpen, onClose, onCreate }) {
    const [name, setName] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [color, setColor] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim()) return;

        setLoading(true);
        try {
            // Pass object structure
            await onCreate({
                name,
                image_url: imageUrl || null,
                color: color || null
            });

            // Reset form
            setName('');
            setImageUrl('');
            setColor('');
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-6"
                    >
                        <div className="flex justify-between items-center border-b border-white/10 pb-4">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <FolderPlus className="text-primary" size={20} />
                                New Collection
                            </h3>
                            <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                        <Hash size={12} /> Collection Name
                                    </label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        autoFocus
                                        className="w-full bg-zinc-800 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary/50 transition-all placeholder:text-white/20"
                                        placeholder="e.g. Italian Favorites"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                        <Image size={12} /> Image URL (Optional)
                                    </label>
                                    <input
                                        type="url"
                                        value={imageUrl}
                                        onChange={(e) => setImageUrl(e.target.value)}
                                        className="w-full bg-zinc-800 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary/50 transition-all placeholder:text-white/20"
                                        placeholder="https://..."
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                        <Palette size={12} /> Color Theme (Optional)
                                    </label>
                                    <select
                                        value={color}
                                        onChange={(e) => setColor(e.target.value)}
                                        className="w-full bg-zinc-800 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary/50 transition-all placeholder:text-white/20"
                                    >
                                        <option value="">Auto (Random)</option>
                                        <option value="from-blue-600 to-blue-900">Blue</option>
                                        <option value="from-purple-600 to-purple-900">Purple</option>
                                        <option value="from-emerald-600 to-emerald-900">Emerald</option>
                                        <option value="from-amber-600 to-amber-900">Amber</option>
                                        <option value="from-rose-600 to-rose-900">Rose</option>
                                    </select>
                                </div>
                            </div>

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={!name.trim() || loading}
                                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-black"
                                >
                                    {loading ? 'Creating...' : 'Create Collection'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
