import React from 'react';
import { motion } from 'framer-motion';
import { Clock, ChefHat, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function RecipeList({ recipes, t }) {
    if (recipes.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                <p>{t?.noRecipes || "No recipes found. Capture one to get started!"}</p>
            </div>
        );
    }

    return (
        <div className="w-full relative">
            <h2 className="text-lg font-bold text-foreground mb-4 px-4 sticky left-0">{t?.myCookbook || "My Cookbook"}</h2>
            <div className="flex overflow-x-auto pb-8 gap-4 px-4 snap-x snap-mandatory scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {recipes.map((recipe, index) => (
                    <Link to={`/recipe/${recipe.id}`} key={recipe.id} className="snap-center shrink-0">
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="group relative w-72 h-[420px] bg-card rounded-2xl overflow-hidden shadow-lg border border-white/5 transition-all duration-300 hover:scale-[1.03] hover:shadow-primary/20 hover:border-primary/50"
                        >
                            <div className="h-full w-full relative">
                                {recipe.image_url ? (
                                    <img
                                        src={recipe.image_url}
                                        alt={recipe.title}
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground">
                                        <ChefHat size={40} />
                                    </div>
                                )}
                                {/* Gradient Overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

                                {/* Content Overlay */}
                                <div className="absolute bottom-0 left-0 right-0 p-5">
                                    <h3 className="text-xl font-bold text-white mb-2 leading-tight line-clamp-2 drop-shadow-md">{recipe.title}</h3>

                                    <div className="flex items-center gap-3 text-xs text-gray-300 font-medium opacity-0 transform translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                                        {recipe.prep_time && (
                                            <div className="flex items-center gap-1 bg-white/10 backdrop-blur-md px-2 py-1 rounded-md">
                                                <Clock size={12} />
                                                <span>{recipe.prep_time}</span>
                                            </div>
                                        )}
                                        {recipe.servings && (
                                            <div className="flex items-center gap-1 bg-white/10 backdrop-blur-md px-2 py-1 rounded-md">
                                                <Users size={12} />
                                                <span>{recipe.servings} pp</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </Link>
                ))}
                {/* Pad end of list */}
                <div className="w-4 shrink-0" />
            </div>
        </div>
    );
}
