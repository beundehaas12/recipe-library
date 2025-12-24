'use client';

import { motion } from 'framer-motion';
import { Folder } from 'lucide-react';
import type { Recipe, Collection } from '@/types/database';
import { translations as t } from '@/lib/translations';
import RecipeThumbnail from '@/components/RecipeThumbnail';

interface CollectionDetailPageProps {
    collection: Collection;
    recipes: Recipe[];
}

export default function CollectionDetailPage({ collection, recipes }: CollectionDetailPageProps) {
    return (
        <div className="min-h-screen bg-background pt-20">
            {/* Collection Info */}
            <div className="max-w-[1600px] mx-auto px-4 lg:px-20 py-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Folder size={22} className="text-primary" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                            {t.collection}
                        </p>
                        <h1 className="text-2xl font-black text-white">
                            {collection.name}
                        </h1>
                    </div>
                    <span className="ml-auto text-sm font-bold text-muted-foreground bg-white/5 px-3 py-1 rounded-full border border-white/5">
                        {recipes.length} {recipes.length === 1 ? 'recept' : 'recepten'}
                    </span>
                </div>
            </div>

            {/* Recipe Grid */}
            <div className="max-w-[1600px] mx-auto px-4 lg:px-20 py-4">
                {recipes.length > 0 ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-0.5 md:gap-1 lg:gap-2"
                    >
                        {recipes.map((recipe) => (
                            <div key={recipe.id} className="w-full">
                                <RecipeThumbnail recipe={recipe} />
                            </div>
                        ))}
                    </motion.div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <Folder size={48} className="text-white mb-4" />
                        <p className="text-muted-foreground">{t.noRecipesInCollection}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
