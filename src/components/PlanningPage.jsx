import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getMealPlan, removeFromMealPlan } from '../lib/plannerService';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Loader2, X, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DUTCH_DAYS = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];
const MEALS = ['breakfast', 'lunch', 'dinner'];
const DUTCH_MEALS = { breakfast: 'Ontbijt', lunch: 'Lunch', dinner: 'Diner' };

export default function PlanningPage() {
    const { user } = useAuth();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);

    const startOfWeek = getStartOfWeek(currentDate);

    // Calculate week dates
    const weekDates = Array.from({ length: 7 }).map((_, i) => {
        const d = new Date(startOfWeek);
        d.setDate(d.getDate() + i);
        return d;
    });

    useEffect(() => {
        if (user) loadPlans();
    }, [user, currentDate]);

    async function loadPlans() {
        setLoading(true);
        const start = weekDates[0].toISOString().split('T')[0];
        const end = weekDates[6].toISOString().split('T')[0];
        try {
            const data = await getMealPlan(user.id, start, end);
            setPlans(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    async function handleRemove(planId) {
        setPlans(plans.filter(p => p.id !== planId));
        await removeFromMealPlan(planId);
    }

    const nextWeek = () => {
        const d = new Date(currentDate);
        d.setDate(d.getDate() + 7);
        setCurrentDate(d);
    };

    const prevWeek = () => {
        const d = new Date(currentDate);
        d.setDate(d.getDate() - 7);
        setCurrentDate(d);
    };

    const isToday = (date) => {
        const today = new Date();
        return date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear();
    };

    const getPlansForSlot = (date, type) => {
        const dateStr = date.toISOString().split('T')[0];
        return plans.filter(p => p.date === dateStr && p.meal_type === type);
    };

    return (
        <div className="min-h-screen pt-24 pb-32 px-4 lg:px-12 bg-background flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-8 max-w-[1800px] w-full mx-auto">
                <h1 className="text-3xl font-black text-white flex items-center gap-3">
                    <CalendarIcon className="text-primary" />
                    <span className="capitalize">
                        {startOfWeek.toLocaleString('default', { month: 'long' })} {startOfWeek.getFullYear()}
                    </span>
                </h1>

                <div className="flex items-center bg-zinc-900 rounded-full border border-white/10 p-1">
                    <button onClick={prevWeek} className="w-10 h-10 flex items-center justify-center text-white hover:bg-white/10 rounded-full transition-colors">
                        <ChevronLeft size={20} />
                    </button>
                    <button onClick={() => setCurrentDate(new Date())} className="px-4 text-sm font-bold text-white/70 hover:text-white transition-colors">
                        Vandaag
                    </button>
                    <button onClick={nextWeek} className="w-10 h-10 flex items-center justify-center text-white hover:bg-white/10 rounded-full transition-colors">
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            {/* Calendar Grid - Apple style */}
            <div className="flex-1 max-w-[1800px] w-full mx-auto bg-zinc-900/40 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden flex flex-col shadow-2xl">
                {/* Days Header */}
                <div className="grid grid-cols-7 border-b border-white/10 bg-black/20">
                    {weekDates.map((date, i) => (
                        <div key={i} className={`p-4 text-center border-r border-white/5 last:border-r-0 ${isToday(date) ? 'bg-primary/5' : ''}`}>
                            <div className={`text-xs uppercase font-bold tracking-widest mb-1 ${isToday(date) ? 'text-primary' : 'text-white/40'}`}>
                                {DUTCH_DAYS[i]}
                            </div>
                            <div className={`text-2xl font-black ${isToday(date) ? 'text-primary w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center mx-auto' : 'text-white'}`}>
                                {date.getDate()}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Meals Grid */}
                <div className="grid grid-rows-[auto_1fr_1fr_1fr] flex-1 divide-y divide-white/10">
                    {/* Rows for Meal Types */}
                    {MEALS.map((type) => (
                        <div key={type} className="contents group/row">
                            {/* Row Label (mobile/tablet hidden usually, but let's integrate into cells maybe? No, Apple Calendar has time axis) */}
                            {/* We just rely on the cell content header or separate labels if needed. 
                                Let's add a small label in the first cell or just structure it differently.
                                Actually a grid-cols-1 md:grid-cols-7 is better.
                            */}

                            <div className="grid grid-cols-1 md:grid-cols-7 divide-y md:divide-y-0 md:divide-x divide-white/10 bg-black/10">
                                {weekDates.map((date, i) => {
                                    const dayPlans = getPlansForSlot(date, type);
                                    const isPast = date < new Date().setHours(0, 0, 0, 0);

                                    return (
                                        <div key={i} className={`min-h-[150px] p-2 transition-colors hover:bg-white/5 relative group/cell flex flex-col gap-2 ${isToday(date) ? 'bg-primary/[0.02]' : ''}`}>
                                            {/* Mobile Label */}
                                            <div className="md:hidden text-white/30 text-xs font-bold uppercase mb-2">
                                                {DUTCH_DAYS[i]} • {DUTCH_MEALS[type]}
                                            </div>

                                            {/* Desktop Type Label (only on first col or implicit) */}
                                            {i === 0 && (
                                                <span className="hidden md:block absolute top-2 left-2 text-[10px] font-bold uppercase text-white/20 tracking-widest pointer-events-none">
                                                    {DUTCH_MEALS[type]}
                                                </span>
                                            )}

                                            {/* Content */}
                                            {dayPlans.map(plan => (
                                                <Link to={`/recipe/${plan.recipe_id}`} key={plan.id} className="block">
                                                    <motion.div
                                                        layoutId={`plan-${plan.id}`}
                                                        className="bg-zinc-800/80 border border-white/10 rounded-xl p-3 shadow-lg hover:border-primary/50 hover:bg-zinc-800 transition-all group/card relative overflow-hidden"
                                                    >
                                                        <div className="flex gap-3">
                                                            {plan.recipe?.image_url && (
                                                                <img src={plan.recipe.image_url} className="w-10 h-10 rounded-lg object-cover bg-black/20" alt="" />
                                                            )}
                                                            <div className="min-w-0 flex-1">
                                                                <div className="text-sm font-bold text-white truncate leading-tight">
                                                                    {plan.recipe?.title}
                                                                </div>
                                                                {plan.recipe?.cook_time && (
                                                                    <div className="flex items-center gap-1 text-[10px] text-white/50 mt-1">
                                                                        <Clock size={10} /> {plan.recipe.cook_time}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <button
                                                            onClick={(e) => { e.preventDefault(); handleRemove(plan.id); }}
                                                            className="absolute top-1 right-1 p-1 text-white/20 hover:text-red-400 hover:bg-red-500/10 rounded-md opacity-0 group-hover/card:opacity-100 transition-all"
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                    </motion.div>
                                                </Link>
                                            ))}

                                            {/* Add Button (appearing on hover) */}
                                            {!isPast && (
                                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/cell:opacity-100 transition-opacity pointer-events-none">
                                                    <div className="bg-primary/20 text-primary p-2 rounded-full backdrop-blur-md">
                                                        <Plus size={16} />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function getStartOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
}
