'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface CookingStepsProps {
    steps: string[];
}

export default function CookingSteps({ steps }: CookingStepsProps) {
    // Track which steps are marked as "done"
    const [completedSteps, setCompletedSteps] = useState<number[]>([]);

    const toggleStep = (index: number) => {
        setCompletedSteps(prev =>
            prev.includes(index)
                ? prev.filter(i => i !== index)
                : [...prev, index]
        );
    };

    if (!steps || steps.length === 0) return null;

    return (
        <div className="space-y-8">
            <h2 className="text-2xl font-bold text-white mb-8 tracking-tight">Bereiding</h2>

            <div className="space-y-12">
                {steps.map((step, idx) => {
                    const isCompleted = completedSteps.includes(idx);

                    return (
                        <motion.div
                            key={idx}
                            initial={false}
                            animate={{ opacity: isCompleted ? 0.4 : 1 }}
                            onClick={() => toggleStep(idx)}
                            className="group relative pl-0 cursor-pointer transition-all duration-300"
                        >
                            <div className="flex gap-6">
                                {/* Step Number */}
                                <div className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors duration-300 flex-shrink-0 mt-1",
                                    isCompleted
                                        ? "bg-white/10 text-white/40"
                                        : "bg-white text-black"
                                )}>
                                    {isCompleted ? <Check size={14} /> : idx + 1}
                                </div>

                                {/* Step Content */}
                                <div className="flex-1">
                                    <p className={cn(
                                        "text-lg md:text-xl leading-relaxed transition-colors duration-300 font-medium",
                                        isCompleted ? "text-white/40 line-through decoration-white/10" : "text-white/90"
                                    )}>
                                        {step}
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
