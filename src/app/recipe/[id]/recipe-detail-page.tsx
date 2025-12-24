'use client';

import { motion } from 'framer-motion';
import { ChefHat, Clock, Users } from 'lucide-react';
import type { Recipe } from '@/types/database';
import { translations as t } from '@/lib/translations';
import { getAuthorDisplayName, getAuthorAvatarUrl } from '@/lib/authorProfileService';

interface RecipeDetailPageProps {
    recipe: Recipe;
}

export default function RecipeDetailPage({ recipe }: RecipeDetailPageProps) {
    return (
        <div className="min-h-screen bg-background">
            {/* Hero Image Section */}
            <div className="relative w-full h-[60vh] md:h-[70vh] overflow-hidden">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="absolute inset-0"
                >
                    {recipe.image_url ? (
                        <img
                            src={recipe.image_url}
                            alt={recipe.title}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                            <ChefHat size={80} className="text-white/10" />
                        </div>
                    )}

                    {/* Gradient Overlays */}
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />
                </motion.div>

                {/* Title Section */}
                <div className="absolute bottom-0 left-0 right-0 z-20 pb-8 px-6 lg:px-20">
                    <div className="max-w-[1200px] mx-auto">
                        {recipe.cuisine && (
                            <motion.span
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="inline-block px-3 py-1 rounded-md bg-white/10 backdrop-blur-md border border-white/10 text-white/90 text-xs font-bold uppercase tracking-widest mb-4"
                            >
                                {recipe.cuisine}
                            </motion.span>
                        )}

                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="text-4xl md:text-6xl lg:text-7xl font-black text-white leading-[0.9] drop-shadow-2xl max-w-4xl mb-4"
                        >
                            {recipe.title}
                        </motion.h1>

                        {/* Author Info */}
                        {(recipe.author_profile || recipe.author) && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="flex items-center gap-3 mt-4"
                            >
                                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/20 bg-white/10">
                                    <img
                                        src={getAuthorAvatarUrl(recipe.author_profile, { id: recipe.user_id })}
                                        alt=""
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <span className="text-white/80 font-medium">
                                    {getAuthorDisplayName(recipe.author_profile) || recipe.author || 'Unknown Chef'}
                                </span>
                            </motion.div>
                        )}
                    </div>
                </div>
            </div>

            {/* Content Section */}
            <div className="max-w-[1200px] mx-auto px-6 lg:px-20 py-12">
                {/* Meta Info */}
                <div className="flex flex-wrap gap-6 mb-12">
                    {recipe.prep_time && (
                        <div className="flex items-center gap-3 text-white/70">
                            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                                <Clock size={20} className="text-primary" />
                            </div>
                            <div>
                                <p className="text-xs text-white/40 uppercase tracking-wider font-bold">{t.prepTime}</p>
                                <p className="text-white font-bold">{recipe.prep_time}</p>
                            </div>
                        </div>
                    )}

                    {recipe.servings && (
                        <div className="flex items-center gap-3 text-white/70">
                            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                                <Users size={20} className="text-primary" />
                            </div>
                            <div>
                                <p className="text-xs text-white/40 uppercase tracking-wider font-bold">{t.servings}</p>
                                <p className="text-white font-bold">{recipe.servings} {t.pp}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Description */}
                {recipe.description && (
                    <p className="text-lg text-white/70 leading-relaxed mb-12 max-w-3xl">
                        {recipe.description}
                    </p>
                )}

                <div className="grid lg:grid-cols-[1fr_2fr] gap-12">
                    {/* Ingredients */}
                    {recipe.ingredients && recipe.ingredients.length > 0 && (
                        <div>
                            <h2 className="text-2xl font-black text-white mb-6">{t.ingredients}</h2>
                            <ul className="space-y-3">
                                {recipe.ingredients.map((ing, idx) => (
                                    <li
                                        key={idx}
                                        className="flex items-start gap-3 text-white/80"
                                    >
                                        <span className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                                        <span>
                                            {typeof ing === 'string' ? ing : `${ing.amount || ''} ${ing.unit || ''} ${ing.item}`.trim()}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Instructions */}
                    {recipe.instructions && recipe.instructions.length > 0 && (
                        <div>
                            <h2 className="text-2xl font-black text-white mb-6">{t.instructions}</h2>
                            <ol className="space-y-6">
                                {recipe.instructions.map((step, idx) => (
                                    <li key={idx} className="flex gap-4">
                                        <span className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center flex-shrink-0 text-sm">
                                            {idx + 1}
                                        </span>
                                        <p className="text-white/80 leading-relaxed pt-1">{step}</p>
                                    </li>
                                ))}
                            </ol>
                        </div>
                    )}
                </div>

                {/* Tags */}
                {recipe.tags && recipe.tags.length > 0 && (
                    <div className="mt-12 pt-8 border-t border-white/10">
                        <h3 className="text-sm font-bold text-white/40 uppercase tracking-wider mb-4">{t.aiTags}</h3>
                        <div className="flex flex-wrap gap-2">
                            {recipe.tags.map((tag, idx) => (
                                <span
                                    key={idx}
                                    className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/60 text-sm"
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
