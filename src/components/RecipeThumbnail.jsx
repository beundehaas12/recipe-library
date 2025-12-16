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
        <Link to={`/recipe/${recipe.id}`} className="block group relative w-48 md:w-64 flex-none snap-start">
            <motion.div
                ref={ref}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                style={{
                    transformStyle: "preserve-3d",
                    transform,
                }}
                className="relative aspect-[2/3] rounded-xl bg-card border border-white/5 transition-all duration-300 ease-out"
            >
                {/* Image Layer */}
                <div
                    style={{ transform: "translateZ(20px)" }}
                    className="absolute inset-0 rounded-xl overflow-hidden shadow-2xl"
                >
                    {recipe.image_url ? (
                        <img
                            src={recipe.image_url}
                            alt={recipe.title}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground">
                            <ChefHat size={40} strokeWidth={1} />
                        </div>
                    )}

                    {/* Cinematic Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
                </div>

                {/* Floating Content Layer */}
                <div
                    style={{ transform: "translateZ(50px)" }}
                    className="absolute bottom-0 left-0 right-0 p-4 flex flex-col justify-end h-full"
                >


                    <h3 className="text-white font-semibold text-lg leading-tight line-clamp-2 drop-shadow-lg group-hover:text-primary transition-colors">
                        {recipe.title}
                    </h3>

                    <div className="flex items-center gap-3 mt-2 text-xs text-white/70 font-medium">
                        {recipe.prep_time && (
                            <span className="flex items-center gap-1">
                                <Clock size={12} /> {recipe.prep_time}
                            </span>
                        )}
                        {recipe.servings && (
                            <span className="flex items-center gap-1">
                                <Users size={12} /> {recipe.servings}
                            </span>
                        )}
                    </div>
                </div>

                {/* Glass Highlight */}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-white/10 to-transparent pointer-events-none border border-white/10 shadow-[inset_0_0_20px_rgba(255,255,255,0.05)]" />
            </motion.div>
        </Link>
    );
}
