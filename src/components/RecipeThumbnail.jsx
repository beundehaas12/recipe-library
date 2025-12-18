import { useRef } from 'react';
import { motion, useMotionTemplate, useMotionValue, useSpring } from 'framer-motion';
import { ChefHat, Clock, Users, Play } from 'lucide-react';
import { Link } from 'react-router-dom';

const ROTATION_RANGE = 20;
const HALF_ROTATION_RANGE = ROTATION_RANGE / 2;

export default function RecipeThumbnail({ recipe, t }) {
    const ref = useRef(null);

    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const xSpring = useSpring(x);
    const ySpring = useSpring(y);

    const transform = useMotionTemplate`rotateX(${xSpring}deg) rotateY(${ySpring}deg)`;

    const handleMouseMove = (e) => {
        if (!ref.current) return;

        const rect = ref.current.getBoundingClientRect();

        const width = rect.width;
        const height = rect.height;

        const mouseX = (e.clientX - rect.left) * ROTATION_RANGE;
        const mouseY = (e.clientY - rect.top) * ROTATION_RANGE;

        const rX = (mouseY / height - HALF_ROTATION_RANGE) * -1;
        const rY = mouseX / width - HALF_ROTATION_RANGE;

        x.set(rX);
        y.set(rY);
    };

    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
    };

    return (
        <Link
            to={`/recipe/${recipe.id}`}
            className="block group relative w-48 md:w-64 flex-none active:scale-[0.98] transition-transform duration-200"
        >
            <motion.div
                ref={ref}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                style={{
                    transformStyle: "preserve-3d",
                    transform,
                }}
                className="relative aspect-[2/3] rounded-[var(--radius)] bg-card/40 border border-white/5 transition-all duration-300 ease-out shadow-xl group-hover:shadow-primary/10 group-hover:border-primary/20"
                layoutId={`card-${recipe.id}`}
            >
                {/* Image Layer - Lower Z-height for more stability */}
                <motion.div
                    style={{ transform: "translateZ(10px)" }}
                    className="absolute inset-0 rounded-[var(--radius)] overflow-hidden"
                    layoutId={`image-${recipe.id}`}
                >
                    {recipe.image_url ? (
                        <img
                            src={recipe.image_url}
                            alt={recipe.title}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground">
                            <ChefHat size={40} strokeWidth={1} />
                        </div>
                    )}

                    {/* Cinematic Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />
                </motion.div>

                {/* Floating Content Layer - Lower Z-height for more stability */}
                <div
                    style={{ transform: "translateZ(20px)" }}
                    className="absolute bottom-0 left-0 right-0 p-5 flex flex-col justify-end h-full z-20"
                >
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

                {/* Glass Highlight Layer */}
                <div
                    style={{ transform: "translateZ(15px)" }}
                    className="absolute inset-0 rounded-[var(--radius)] bg-gradient-to-tr from-white/10 to-transparent pointer-events-none border border-white/10 shadow-[inset_0_0_20px_rgba(255,255,255,0.05)]"
                />
            </motion.div>
        </Link>
    );
}
