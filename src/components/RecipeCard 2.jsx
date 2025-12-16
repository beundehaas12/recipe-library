import { useState, useEffect } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Clock, Users, ArrowLeft, ChefHat, Flame, Utensils, Edit, Camera, Minus, Plus, Trash2, Sparkles, Globe, Share2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { translations as t } from '../lib/translations';

// Language code to Dutch name mapping
const languageNames = {
    nl: t.languageNL,
    en: t.languageEN,
    de: t.languageDE,
    fr: t.languageFR,
    es: t.languageES,
    it: t.languageIT,
};

export default function RecipeCard({ recipe, onImageUpdate, onDelete, onUpdate }) {
    const [currentServings, setCurrentServings] = useState(recipe?.servings || 4);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({});
    const { scrollY } = useScroll();

    // Parallax effect for header image
    const y = useTransform(scrollY, [0, 500], [0, 200]);
    const opacity = useTransform(scrollY, [0, 400], [1, 0]);
    const headerTitleOpacity = useTransform(scrollY, [300, 400], [0, 1]);

    useEffect(() => {
        if (recipe?.servings) {
            const baseServings = typeof recipe.servings === 'number' ? recipe.servings : parseInt(recipe.servings) || 4;
            setCurrentServings(baseServings);
        }
    }, [recipe]);

    useEffect(() => {
        if (isEditing && recipe) {
            setEditForm({
                title: recipe.title || '',
                description: recipe.description || '',
                prep_time: recipe.prep_time || '',
                cook_time: recipe.cook_time || '',
                servings: recipe.servings || 4,
                cuisine: recipe.cuisine || '',
                difficulty: recipe.difficulty || '',
                author: recipe.author || '',
                cookbook_name: recipe.cookbook_name || '',
                isbn: recipe.isbn || '',
                source_url: recipe.source_url || '',
                ingredients: recipe.ingredients || [],
                instructions: recipe.instructions || []
            });
        }
    }, [isEditing, recipe]);

    if (!recipe) return null;

    const handleSave = () => {
        onUpdate(editForm);
        setIsEditing(false);
    };

    const handleCancel = () => {
        setIsEditing(false);
    };

    const baseServings = typeof recipe.servings === 'number' ? recipe.servings : parseInt(recipe.servings) || 4;
    const scaleFactor = currentServings / baseServings;

    const parseAndScaleString = (str) => {
        const regex = /^(\d+(?:\.\d+)?|\d+\/\d+|\d+\s+\d+\/\d+)\s*([a-zA-Z]+)?\s+(.*)/;
        const match = str.match(regex);
        if (match) {
            let amountStr = match[1];
            let unit = match[2] || '';
            let item = match[3];
            let amount = 0;
            if (amountStr.includes(' ')) {
                const parts = amountStr.split(' ');
                amount = parseFloat(parts[0]) + eval(parts[1]);
            } else if (amountStr.includes('/')) {
                amount = eval(amountStr);
            } else {
                amount = parseFloat(amountStr);
            }
            const scaledAmount = Math.round(amount * scaleFactor * 100) / 100;
            return (<span><span className="font-bold text-primary">{scaledAmount}</span>{unit && <span className="text-muted-foreground mx-1">{unit}</span>}<span>{item}</span></span>);
        }
        return str;
    };

    const formatIngredient = (ing) => {
        if (typeof ing === 'object' && ing !== null && 'item' in ing) {
            let amount = ing.amount;
            if (typeof amount === 'number') amount = Math.round(amount * scaleFactor * 100) / 100;
            return (<span><span className="font-bold text-primary">{amount}</span>{ing.unit && <span className="text-muted-foreground mx-1">{ing.unit}</span>}<span>{ing.item}</span></span>);
        }
        return parseAndScaleString(String(ing));
    };

    const sourceLangName = languageNames[recipe.source_language] || recipe.source_language || t.languageUnknown;

    return (
        <div className="bg-background min-h-screen pb-20">
            {/* Immersive Header */}
            <div className="relative w-full h-[60vh] md:h-[70vh] overflow-hidden">
                <motion.div style={{ y, opacity }} className="absolute inset-0">
                    {recipe.image_url ? (
                        <img src={recipe.image_url} alt={recipe.title} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full bg-secondary flex items-center justify-center">
                            <ChefHat size={100} className="text-muted-foreground/20" strokeWidth={1} />
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-black/30" />
                </motion.div>

                {/* Floating Nav Actions */}
                <div className="fixed top-0 left-0 right-0 z-50 p-6 flex justify-between items-start pointer-events-none">
                    <Link to="/" className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white border border-white/10 hover:bg-black/60 transition-colors pointer-events-auto">
                        <ArrowLeft size={20} />
                    </Link>

                    <motion.div style={{ opacity: headerTitleOpacity }} className="absolute inset-x-0 top-6 text-center pointer-events-none">
                        <span className="text-sm font-bold text-white uppercase tracking-widest drop-shadow-md bg-black/50 px-4 py-2 rounded-full backdrop-blur-md border border-white/5">
                            {recipe.title}
                        </span>
                    </motion.div>

                    <div className="flex gap-3 pointer-events-auto">
                        {isEditing ? (
                            <div className="flex gap-2">
                                <button onClick={handleSave} className="px-4 py-2 bg-primary text-white text-sm font-bold rounded-full shadow-lg hover:brightness-110">Opslaan</button>
                                <button onClick={handleCancel} className="px-4 py-2 bg-white/10 text-white text-sm font-bold rounded-full backdrop-blur-md hover:bg-white/20">Annuleren</button>
                            </div>
                        ) : (
                            <>
                                <button onClick={() => setIsEditing(true)} className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white border border-white/10 hover:bg-black/60 transition-colors">
                                    <Edit size={18} />
                                </button>
                                <label className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white border border-white/10 hover:bg-black/60 transition-colors cursor-pointer">
                                    <Camera size={18} />
                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file && onImageUpdate) onImageUpdate(file); }} />
                                </label>
                                <button onClick={onDelete} className="w-10 h-10 rounded-full bg-red-500/20 backdrop-blur-md flex items-center justify-center text-red-500 border border-red-500/30 hover:bg-red-500/40 transition-colors">
                                    <Trash2 size={18} />
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Header Content */}
                <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12 z-10 flex flex-col justify-end">
                    {isEditing ? (
                        <div className="bg-black/60 backdrop-blur-xl rounded-2xl p-6 border border-white/10 space-y-4 max-w-2xl">
                            <input
                                className="w-full text-3xl font-bold bg-transparent border-b border-white/20 focus:border-primary focus:outline-none p-2 text-white placeholder:text-white/30"
                                value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                                placeholder="Recept Titel"
                            />
                            <div className="flex gap-4">
                                <input className="bg-transparent border-b border-white/20 p-2 text-white/80 w-full" value={editForm.cuisine} onChange={e => setEditForm({ ...editForm, cuisine: e.target.value })} placeholder="Keuken" />
                                <input className="bg-transparent border-b border-white/20 p-2 text-white/80 w-full" value={editForm.difficulty} onChange={e => setEditForm({ ...editForm, difficulty: e.target.value })} placeholder="Moeilijkheid" />
                            </div>
                        </div>
                    ) : (
                        <div className="max-w-4xl space-y-4">
                            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="flex flex-wrap items-center gap-3">
                                {recipe.cuisine && <span className="px-3 py-1 bg-white/10 backdrop-blur-md text-white/90 text-[10px] font-bold uppercase tracking-widest rounded-md border border-white/10">{recipe.cuisine}</span>}
                                {recipe.difficulty && <span className="px-3 py-1 bg-white/5 backdrop-blur-md text-white/70 text-[10px] font-bold uppercase tracking-widest rounded-md border border-white/5">{recipe.difficulty}</span>}
                                {/* Source Language Badge */}
                                <span className="flex items-center gap-1 px-3 py-1 bg-black/40 backdrop-blur-md text-white/60 text-[10px] font-bold uppercase tracking-widest rounded-md border border-white/5">
                                    <Globe size={10} />
                                    {sourceLangName}
                                </span>
                            </motion.div>

                            <motion.h1
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.3 }}
                                className="text-4xl md:text-6xl lg:text-7xl font-black text-white leading-tight drop-shadow-xl font-display"
                            >
                                {recipe.title}
                            </motion.h1>

                            {/* Author/Source Metadata */}
                            {(recipe.author || recipe.cookbook_name) && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="flex items-center gap-2 text-white/60 text-sm md:text-base font-medium">
                                    <span>van</span>
                                    <span className="text-white">{recipe.author || recipe.cookbook_name}</span>
                                    {recipe.source_url && (
                                        <a href={recipe.source_url} target="_blank" rel="noopener noreferrer" className="ml-2 p-1.5 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
                                            <Share2 size={12} />
                                        </a>
                                    )}
                                </motion.div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="max-w-7xl mx-auto px-6 md:px-12 -mt-10 relative z-20">
                <div className="grid lg:grid-cols-[350px_1fr] gap-12 lg:gap-24">

                    {/* Left Column: Stats & Ingredients */}
                    <div className="space-y-8">
                        {/* Stats Card */}
                        <div className="bg-card/50 backdrop-blur-sm border border-white/5 rounded-2xl p-6 grid grid-cols-2 gap-4">
                            <div className="col-span-2 flex items-center justify-between pb-4 border-b border-white/5">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Users size={16} />
                                    <span className="text-xs font-bold uppercase tracking-wider">{t.servings}</span>
                                </div>
                                {isEditing ? (
                                    <input className="w-12 text-center bg-transparent border-b border-white/20 text-white font-bold" value={editForm.servings} onChange={e => setEditForm({ ...editForm, servings: e.target.value })} />
                                ) : (
                                    <div className="flex items-center gap-3 bg-white/5 rounded-full px-2 py-1">
                                        <button onClick={() => setCurrentServings(Math.max(1, currentServings - 1))} className="w-6 h-6 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors"><Minus size={12} /></button>
                                        <span className="w-4 text-center text-sm font-bold">{currentServings}</span>
                                        <button onClick={() => setCurrentServings(currentServings + 1)} className="w-6 h-6 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors"><Plus size={12} /></button>
                                    </div>
                                )}
                            </div>

                            <div className="p-3 bg-white/5 rounded-xl flex flex-col items-center justify-center text-center">
                                <Clock size={20} className="text-primary mb-2" />
                                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{t.prepTime}</span>
                                {isEditing ? (
                                    <input className="w-full text-center bg-transparent text-sm mt-1" value={editForm.prep_time} onChange={e => setEditForm({ ...editForm, prep_time: e.target.value })} />
                                ) : (
                                    <span className="font-bold text-white text-sm">{recipe.prep_time || '-'}</span>
                                )}
                            </div>

                            <div className="p-3 bg-white/5 rounded-xl flex flex-col items-center justify-center text-center">
                                <Flame size={20} className="text-orange-500 mb-2" />
                                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{t.cookTime}</span>
                                {isEditing ? (
                                    <input className="w-full text-center bg-transparent text-sm mt-1" value={editForm.cook_time} onChange={e => setEditForm({ ...editForm, cook_time: e.target.value })} />
                                ) : (
                                    <span className="font-bold text-white text-sm">{recipe.cook_time || '-'}</span>
                                )}
                            </div>
                        </div>

                        {/* Ingredients List */}
                        <div>
                            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                                <Utensils size={20} className="text-primary" />
                                {t.ingredients}
                            </h3>
                            <ul className="space-y-4">
                                {Array.isArray(recipe.ingredients) && recipe.ingredients.map((ingredient, idx) => (
                                    <li key={idx} className="flex items-start gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors border-b border-white/5 last:border-0">
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0 shadow-[0_0_10px_var(--primary)]" />
                                        <span className="text-gray-300 leading-relaxed font-medium">{formatIngredient(ingredient)}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* AI Tags */}
                        {recipe.ai_tags && recipe.ai_tags.length > 0 && !isEditing && (
                            <div className="pt-8 border-t border-white/5">
                                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <Sparkles size={12} className="text-primary" />
                                    {t.aiTags}
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {recipe.ai_tags.map((tag, idx) => (
                                        <span key={idx} className="px-3 py-1.5 bg-white/5 text-gray-300 text-xs font-medium rounded-full border border-white/5 hover:border-primary/30 hover:bg-primary/10 hover:text-primary transition-all cursor-default">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column: Description & Instructions */}
                    <div className="space-y-12 pt-4">
                        {recipe.description && (
                            <div className="text-lg md:text-xl text-gray-400 leading-relaxed font-serif italic border-l-2 border-primary/30 pl-6">
                                {isEditing ? (
                                    <textarea className="w-full h-32 bg-transparent border p-2" value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} />
                                ) : (
                                    recipe.description
                                )}
                            </div>
                        )}

                        <div className="space-y-8">
                            <h3 className="text-2xl font-bold text-white mb-8 border-b border-white/10 pb-4 inline-block pr-12">
                                {t.instructions}
                            </h3>
                            <div className="space-y-10 relative">
                                {/* Vertical Line connecting steps */}
                                <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-gradient-to-b from-primary via-primary/20 to-transparent opacity-30" />

                                {Array.isArray(recipe.instructions) && recipe.instructions.map((step, idx) => (
                                    <div key={idx} className="group relative pl-12">
                                        {/* Step Number Bubble */}
                                        <div className="absolute left-0 top-0 w-10 h-10 rounded-full bg-card border border-white/10 flex items-center justify-center text-sm font-bold text-primary shadow-lg shadow-black/50 group-hover:scale-110 group-hover:border-primary/50 transition-all z-10">
                                            {idx + 1}
                                        </div>

                                        <div className="pt-1">
                                            <p className="text-lg text-gray-200 leading-8 group-hover:text-white transition-colors">{step}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
