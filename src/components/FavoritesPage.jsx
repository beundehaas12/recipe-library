import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getFavorites } from '../lib/plannerService';
import RecipeThumbnail from './RecipeThumbnail';
import { Heart, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function FavoritesPage() {
    const { user } = useAuth();
    const [recipes, setRecipes] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            getFavorites(user.id)
                .then(data => {
                    setRecipes(data || []);
                    setLoading(false);
                })
                .catch(err => {
                    console.error(err);
                    setLoading(false);
                });
        }
    }, [user]);

    return (
        <div className="min-h-screen pt-24 pb-32 px-4 lg:px-20">
            <div className="max-w-[1600px] mx-auto">
                <header className="mb-12">
                    <h1 className="text-4xl md:text-5xl font-black text-white flex items-center gap-4 mb-2 tracking-tight">
                        <Heart className="text-red-500 fill-red-500" size={40} />
                        Favorieten
                    </h1>
                    <p className="text-lg text-white/50 font-medium">Jouw persoonlijke collectie van toprecepten</p>
                </header>

                {loading ? (
                    <div className="flex items-center justify-center py-20 text-primary">
                        <Loader2 size={40} className="animate-spin" />
                    </div>
                ) : recipes.length === 0 ? (
                    <div className="bg-zinc-900/50 border border-white/5 rounded-3xl p-12 text-center max-w-lg mx-auto backdrop-blur-sm">
                        <Heart size={64} className="mx-auto text-white/10 mb-6" />
                        <h3 className="text-xl font-bold text-white mb-2">Nog geen favorieten</h3>
                        <p className="text-white/50">Markeer recepten als favoriet om ze hier terug te vinden.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                        {recipes.map((recipe, index) => (
                            <motion.div
                                key={recipe.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                            >
                                <RecipeThumbnail recipe={recipe} t={{}} />
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
