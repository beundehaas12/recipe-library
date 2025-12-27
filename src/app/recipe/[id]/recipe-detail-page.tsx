'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Play, Clock, Flame, Utensils, Share2, Heart, Plus, X, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import Link from 'next/link';
import type { Recipe } from '@/types/database';
import { getAuthorDisplayName, getAuthorAvatarUrl } from '@/lib/authorProfileService';
import { DUMMY_RECIPE } from './dummy-data';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface RecipeDetailPageProps {
    recipe: Recipe;
}

// Helper to merge real data with dummy fallbacks
function mergeWithFallback<T>(realValue: T | undefined | null, fallback: T): T {
    if (realValue === undefined || realValue === null) return fallback;
    if (typeof realValue === 'string' && realValue.trim() === '') return fallback;
    if (Array.isArray(realValue) && realValue.length === 0) return fallback;
    return realValue;
}

export default function RecipeDetailPage({ recipe: dbRecipe }: RecipeDetailPageProps) {
    // Build a merged recipe object with fallbacks for missing data
    const recipe = {
        // Core fields from DB
        title: mergeWithFallback(dbRecipe.title, DUMMY_RECIPE.title),
        subtitle: mergeWithFallback(dbRecipe.description, DUMMY_RECIPE.subtitle),
        story: DUMMY_RECIPE.story, // Not in DB - always use dummy
        image_url: mergeWithFallback(dbRecipe.image_url, DUMMY_RECIPE.image_url),
        tags: mergeWithFallback(dbRecipe.tags ?? dbRecipe.ai_tags, DUMMY_RECIPE.tags),

        // Author from joined profile
        author: {
            user_id: dbRecipe.user_id || null,
            name: dbRecipe.author_profile
                ? getAuthorDisplayName(dbRecipe.author_profile)
                : DUMMY_RECIPE.author.name,
            avatar: dbRecipe.author_profile?.avatar_url
                ? getAuthorAvatarUrl(dbRecipe.author_profile)
                : DUMMY_RECIPE.author.avatar,
            verified: true // Assume verified for display
        },

        // Stats - mix of DB and dummy
        stats: {
            prep_time: mergeWithFallback(dbRecipe.prep_time, DUMMY_RECIPE.stats.prep_time),
            cook_time: mergeWithFallback(dbRecipe.cook_time, DUMMY_RECIPE.stats.cook_time),
            total_time: dbRecipe.prep_time && dbRecipe.cook_time
                ? calculateTotalTime(dbRecipe.prep_time, dbRecipe.cook_time)
                : DUMMY_RECIPE.stats.total_time,
            calories: DUMMY_RECIPE.stats.calories, // Not in DB
            servings: mergeWithFallback(dbRecipe.servings, DUMMY_RECIPE.stats.servings),
            difficulty: DUMMY_RECIPE.stats.difficulty // Not in DB
        },

        // Nutrition - not in DB, always dummy
        nutrition: DUMMY_RECIPE.nutrition,

        // Ingredients from DB or dummy
        ingredients: (dbRecipe.ingredients && dbRecipe.ingredients.length > 0)
            ? dbRecipe.ingredients.map(ing => ({
                item: ing.item || 'Unknown',
                amount: ing.amount || '',
                unit: ing.unit || '',
                notes: '' // Notes not in DB
            }))
            : DUMMY_RECIPE.ingredients,

        // Steps from instructions array or dummy
        steps: (dbRecipe.instructions && dbRecipe.instructions.length > 0)
            ? dbRecipe.instructions.map((text, idx) => ({
                title: `Step ${idx + 1}`,
                duration: '', // Duration per step not in DB
                text: text
            }))
            : DUMMY_RECIPE.steps,

        // Gallery - not in DB, always dummy
        gallery: DUMMY_RECIPE.gallery
    };

    const [isCookMode, setIsCookMode] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);

    const toggleCookMode = () => setIsCookMode(!isCookMode);
    const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, recipe.steps.length - 1));
    const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 0));

    return (
        <div className="min-h-screen bg-black text-white selection:bg-white/20">
            {/* HERO SECTION - Cinematic / Apple TV+ Style */}
            <div className="relative w-full h-[85vh] overflow-hidden">
                {/* Background Image with Cinematic Fade */}
                <div className="absolute inset-0">
                    <motion.img
                        initial={{ scale: 1.1, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        src={recipe.image_url}
                        alt={recipe.title}
                        className="w-full h-full object-cover"
                    />
                    {/* Gradient Overlay - Cinematic Bottom Fade */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                </div>

                {/* Content Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-8 md:p-16 lg:p-24 flex flex-col items-start gap-6 max-w-7xl mx-auto">

                    {/* Tags / Badges */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="flex flex-wrap gap-3"
                    >
                        {recipe.tags.map(tag => (
                            <span key={tag} className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold uppercase tracking-wider text-white/90 border border-white/10">
                                {tag}
                            </span>
                        ))}
                    </motion.div>

                    {/* Title */}
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight text-white drop-shadow-2xl max-w-4xl"
                    >
                        {recipe.title}
                    </motion.h1>

                    {/* Subtitle/Story Excerpt */}
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7 }}
                        className="text-lg md:text-xl text-white/80 max-w-2xl leading-relaxed font-light"
                    >
                        {recipe.subtitle}
                    </motion.p>

                    {/* Meta Data Row */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8 }}
                        className="flex flex-wrap items-center gap-8 text-sm md:text-base font-medium text-white/90 mt-2"
                    >
                        <div className="flex items-center gap-2">
                            <Clock size={18} className="text-white/70" />
                            <span>{recipe.stats.total_time}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Utensils size={18} className="text-white/70" />
                            <span>{recipe.stats.servings} Servings</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="px-2 py-0.5 rounded bg-green-500/20 text-green-400 text-xs border border-green-500/30 font-bold uppercase">
                                {recipe.stats.difficulty}
                            </div>
                        </div>
                        <div className="flex items-center gap-2 relative pl-8 before:content-[''] before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-1 before:h-1 before:rounded-full before:bg-white/40">
                            <Flame size={18} className="text-white/70" />
                            <span>{recipe.stats.calories}</span>
                        </div>
                    </motion.div>

                    {/* Actions Bar */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.9 }}
                        className="flex flex-wrap items-center gap-4 mt-6"
                    >
                        <Button
                            onClick={toggleCookMode}
                            className="h-12 px-8 rounded-full bg-white text-black hover:bg-white/90 font-bold text-base flex items-center gap-2 transition-transform hover:scale-105"
                        >
                            <Play size={20} fill="currentColor" />
                            Start Cooking
                        </Button>
                        <Button variant="outline" className="h-12 w-12 rounded-full border-white/20 bg-white/10 hover:bg-white/20 text-white p-0 backdrop-blur-sm transition-transform hover:scale-105">
                            <Plus size={22} />
                        </Button>
                        <Button variant="outline" className="h-12 w-12 rounded-full border-white/20 bg-white/10 hover:bg-white/20 text-white p-0 backdrop-blur-sm transition-transform hover:scale-105">
                            <Heart size={20} />
                        </Button>
                        <Button variant="outline" className="h-12 w-12 rounded-full border-white/20 bg-white/10 hover:bg-white/20 text-white p-0 backdrop-blur-sm transition-transform hover:scale-105">
                            <Share2 size={20} />
                        </Button>
                    </motion.div>
                </div>
            </div>

            {/* MAIN CONTENT GRID */}
            <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24 py-24">
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-16 lg:gap-24">

                    {/* LEFT RAIL: Ingredients & Nutrition */}
                    <div className="max-w-xl">
                        {/* Author - moved here for layout balance */}
                        <Link
                            href={recipe.author.user_id ? `/author/${recipe.author.user_id}` : '#'}
                            className="flex items-center gap-4 mb-12 pb-8 border-b border-white/10 group hover:border-white/20 transition-colors cursor-pointer"
                        >
                            <img src={recipe.author.avatar} alt="Author" className="w-14 h-14 rounded-full object-cover border-2 border-white/10 group-hover:border-white/30 transition-colors" />
                            <div>
                                <p className="text-sm text-white/50 font-medium uppercase tracking-wider mb-1">Recipe By</p>
                                <p className="text-lg font-semibold text-white flex items-center gap-2 group-hover:text-primary transition-colors">
                                    {recipe.author.name}
                                    {recipe.author.verified && <span className="text-blue-400" title="Verified">✓</span>}
                                </p>
                            </div>
                        </Link>

                        <div className="sticky top-24">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-2xl font-bold">Ingredients</h3>
                                <Button
                                    onClick={() => alert("Ingredients added to shopping list!")}
                                    variant="ghost"
                                    size="sm"
                                    className="text-white/50 hover:text-white hover:bg-white/10"
                                >
                                    <Plus size={16} className="mr-2" /> Add to List
                                </Button>
                            </div>

                            <ul className="space-y-4 mb-12">
                                {recipe.ingredients.map((ing, idx) => (
                                    <li key={idx} className="flex items-baseline justify-between py-3 border-b border-white/5 group hover:bg-white/5 px-2 rounded-lg transition-colors">
                                        <span className="font-medium text-white/90 relative z-10 pr-4 bg-black">{ing.item}</span>
                                        {/* Dotted Leader */}
                                        <div className="flex-1 border-b border-dotted border-white/20 relative -top-1 mx-2" />
                                        <div className="text-right pl-4 bg-black relative z-10 min-w-[80px]">
                                            <span className="block text-white/60">{ing.amount} {ing.unit}</span>
                                            {ing.notes && <span className="block text-xs text-white/40 italic">{ing.notes}</span>}
                                        </div>
                                    </li>
                                ))}
                            </ul>

                            <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-white/50 mb-4">Nutrition per serving</h3>
                                <div className="grid grid-cols-4 gap-4">
                                    {recipe.nutrition.map((nut, idx) => (
                                        <div key={idx} className="text-center">
                                            <span className="block text-xl font-bold text-white mb-1">{nut.value}</span>
                                            <span className="text-xs text-white/40 font-medium uppercase">{nut.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT RAIL: Story/Description & Steps */}
                    <div>
                        <div className="prose prose-invert prose-lg max-w-none mb-16 text-white/70 leading-relaxed font-light">
                            <p>{recipe.story}</p>
                        </div>

                        <h3 className="text-2xl font-bold mb-8">Preparation</h3>
                        <div className="space-y-10">
                            {recipe.steps.map((step, idx) => (
                                <div key={idx} className="group relative pl-8 border-l border-white/10 pb-2">
                                    <div className="absolute -left-[17px] top-0 w-8 h-8 rounded-full bg-zinc-900 border border-white/20 flex items-center justify-center text-sm font-bold text-white/50 group-hover:border-white/50 group-hover:text-white transition-colors">
                                        {idx + 1}
                                    </div>
                                    <div className="mb-2 flex items-center gap-3">
                                        <h4 className="text-xl font-bold text-white group-hover:text-primary transition-colors">{step.title}</h4>
                                        {step.duration && <span className="text-xs font-mono text-white/40 px-2 py-1 rounded bg-white/5">{step.duration}</span>}
                                    </div>
                                    <p className="text-white/70 leading-relaxed">{step.text}</p>
                                </div>
                            ))}
                        </div>

                        {/* Photo Gallery Peek */}
                        <div className="mt-20">
                            <h3 className="text-2xl font-bold mb-6">Gallery</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 h-64">
                                {recipe.gallery.map((img, i) => (
                                    <div key={i} className="relative rounded-xl overflow-hidden group cursor-pointer">
                                        <img src={img} alt="Gallery" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                        <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {/* COOK MODE OVERLAY */}
            <AnimatePresence>
                {isCookMode && (
                    <motion.div
                        initial={{ opacity: 0, y: '100%' }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: '100%' }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed inset-0 z-[9999] bg-black text-white flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 md:p-8 border-b border-white/10 bg-black/50 backdrop-blur-xl">
                            <div className="flex items-center gap-4">
                                <Button onClick={toggleCookMode} variant="ghost" className="rounded-full hover:bg-white/10 text-white/70 hover:text-white">
                                    <X size={24} />
                                    <span className="ml-2 hidden md:inline">Exit Cook Mode</span>
                                </Button>
                            </div>
                            <div className="text-center hidden md:block">
                                <h2 className="font-bold text-lg text-white/90">{recipe.title}</h2>
                                <p className="text-xs text-white/50 uppercase tracking-widest">Step {currentStep + 1} of {recipe.steps.length}</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="font-mono text-xl font-bold tabular-nums text-white/80">
                                    {recipe.steps[currentStep].duration || '--'}
                                </span>
                            </div>
                        </div>

                        {/* Main Step Content */}
                        <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 lg:p-24 relative overflow-hidden">
                            {/* Progress Bar Background */}
                            <div className="absolute top-0 left-0 h-1 bg-primary transition-all duration-300 ease-in-out" style={{ width: `${((currentStep + 1) / recipe.steps.length) * 100}%` }} />

                            <motion.div
                                key={currentStep}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="max-w-4xl w-full text-center space-y-8"
                            >
                                <h3 className="text-4xl md:text-6xl font-bold leading-tight">
                                    {recipe.steps[currentStep].title}
                                </h3>
                                <p className="text-xl md:text-3xl font-light text-white/80 leading-relaxed">
                                    {recipe.steps[currentStep].text}
                                </p>
                            </motion.div>
                        </div>

                        {/* Footer / Controls */}
                        <div className="p-6 md:p-12 border-t border-white/10 bg-black/50 backdrop-blur-xl flex items-center justify-between">
                            <Button
                                onClick={prevStep}
                                disabled={currentStep === 0}
                                variant="outline"
                                className="h-16 px-8 rounded-2xl border-white/10 text-xl font-medium hover:bg-white/10 hover:text-white disabled:opacity-30"
                            >
                                <ChevronLeft size={24} className="mr-2" /> Previous
                            </Button>

                            <div className="flex gap-2 md:hidden">
                                {recipe.steps.map((_, i) => (
                                    <div key={i} className={`w-2 h-2 rounded-full ${i === currentStep ? 'bg-primary' : 'bg-white/20'}`} />
                                ))}
                            </div>

                            {currentStep < recipe.steps.length - 1 ? (
                                <Button
                                    onClick={nextStep}
                                    className="h-16 px-12 rounded-2xl bg-white text-black hover:bg-white/90 text-xl font-bold shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all hover:shadow-[0_0_40px_rgba(255,255,255,0.4)]"
                                >
                                    Next Step <ChevronRight size={24} className="ml-2" />
                                </Button>
                            ) : (
                                <Button
                                    onClick={toggleCookMode}
                                    className="h-16 px-12 rounded-2xl bg-green-500 text-white hover:bg-green-400 text-xl font-bold shadow-[0_0_20px_rgba(34,197,94,0.3)]"
                                >
                                    <Check size={24} className="mr-2" /> Finish Cooking
                                </Button>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// Helper function to calculate total time from prep and cook time strings
function calculateTotalTime(prepTime: string, cookTime: string): string {
    // Simple implementation - just concatenate for now
    // A more robust version would parse "15 min" + "45 min" = "1 h"
    const parseMinutes = (str: string): number => {
        const match = str.match(/(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
    };

    const totalMinutes = parseMinutes(prepTime) + parseMinutes(cookTime);
    if (totalMinutes >= 60) {
        const hours = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;
        return mins > 0 ? `${hours} h ${mins} min` : `${hours} h`;
    }
    return `${totalMinutes} min`;
}
