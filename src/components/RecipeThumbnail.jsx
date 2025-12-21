import { motion } from 'framer-motion';
import { ChefHat, Clock, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function RecipeThumbnail({ recipe, t }) {
    return (
        <Link
            to={`/recipe/${recipe.id}`}
            className="block group relative w-full active:scale-[0.98] transition-transform duration-200"
        >
            <motion.div
                className="relative aspect-[2/3] rounded-[2px] md:rounded lg:rounded-lg overflow-hidden shadow-lg md:shadow-xl lg:shadow-2xl isolate"
                style={{
                    WebkitMaskImage: '-webkit-radial-gradient(white, black)',
                    transform: 'translateZ(0)',
                    WebkitTransform: 'translateZ(0)'
                }}
                layoutId={`card-${recipe.id}`}
            >
                {/* Background/Placeholder Layer - Strictly conditional to avoid sub-pixel bleed behind images */}
                {!recipe.image_url && (
                    <div className="absolute inset-0 bg-zinc-900/80 flex items-center justify-center z-10">
                        <ChefHat size={40} strokeWidth={1} className="text-muted-foreground/50" />
                    </div>
                )}

                {/* Image Component */}
                {recipe.image_url && (
                    <motion.div
                        className="absolute inset-0 z-10 bg-black"
                        style={{ transform: 'translateZ(0)', WebkitTransform: 'translateZ(0)' }}
                        layoutId={`image-${recipe.id}`}
                    >
                        <img
                            src={recipe.image_url}
                            alt={recipe.title}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            style={{ willChange: 'transform' }}
                        />
                        {/* Cinematic Overlay - Pure black bottom for perfect blending */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                    </motion.div>
                )}

                {/* Content Area */}
                <div className="absolute bottom-0 left-0 right-0 p-5 flex flex-col justify-end h-full z-20">
                    <motion.h3
                        layoutId={`title-${recipe.id}`}
                        className="text-white font-bold text-lg md:text-xl leading-tight line-clamp-2 drop-shadow-lg group-hover:text-primary transition-colors"
                    >
                        {recipe.title}
                    </motion.h3>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center gap-3 mt-2 text-xs text-white/70 font-semibold"
                    >
                        {recipe.prep_time && (
                            <span className="flex items-center gap-1.5">
                                <Clock size={12} className="text-white/40" /> {recipe.prep_time}
                            </span>
                        )}
                        {recipe.servings && (
                            <span className="flex items-center gap-1.5">
                                <Users size={12} className="text-white/40" /> {recipe.servings}
                            </span>
                        )}
                    </motion.div>
                </div>
            </motion.div>
        </Link>
    );
}
