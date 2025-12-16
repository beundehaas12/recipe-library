import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, Users, ArrowLeft, ChefHat, Flame, Utensils, Edit, Camera, Minus, Plus, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function RecipeCard({ recipe, onImageUpdate, onDelete, onUpdate, t }) {
    const [currentServings, setCurrentServings] = useState(recipe?.servings || 4);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({});

    useEffect(() => {
        if (recipe?.servings) {
            const baseServings = typeof recipe.servings === 'number' ? recipe.servings : parseInt(recipe.servings) || 4;
            setCurrentServings(baseServings);
        }
    }, [recipe]);

    // Initialize edit form when opening edit mode
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
    const strings = t || { prepTime: "Prep Time", cookTime: "Cook Time", servings: "Servings", ingredients: "Ingredients", instructions: "Instructions" };

    const handleSave = () => {
        onUpdate(editForm);
        setIsEditing(false);
    };

    const handleCancel = () => {
        setIsEditing(false);
    };

    const baseServings = typeof recipe.servings === 'number' ? recipe.servings : parseInt(recipe.servings) || 4;
    const scaleFactor = currentServings / baseServings;

    // Helper to attempt parsing string ingredients (legacy support)
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

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto bg-card min-h-screen md:min-h-0 md:rounded-3xl shadow-2xl overflow-hidden pb-12">

            {/* Header Image Area */}
            <div className="relative h-96 w-full group/image">
                <Link to="/" className="absolute top-4 left-4 z-10 p-2 bg-black/20 backdrop-blur-md rounded-full text-white hover:bg-black/40 transition-colors">
                    <ArrowLeft size={24} />
                </Link>

                {/* Action Buttons */}
                <div className="absolute top-4 right-4 z-10 flex gap-2">
                    {isEditing ? (
                        <>
                            <div className="flex gap-2">
                                <button onClick={handleSave} className="px-4 py-2 bg-green-500 text-white rounded-full font-bold shadow-lg hover:bg-green-600 transition-colors">Save</button>
                                <button onClick={handleCancel} className="px-4 py-2 bg-black/50 text-white rounded-full font-bold backdrop-blur-md hover:bg-black/70 transition-colors">Cancel</button>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Edit Toggle */}
                            <button onClick={() => setIsEditing(true)} className="p-2 bg-black/20 backdrop-blur-md rounded-full text-white hover:bg-black/40 transition-colors cursor-pointer group shadow-sm border border-white/10" title="Edit Recipe">
                                <Edit size={20} />
                            </button>

                            {/* Camera / Update Image */}
                            <label className="p-2 bg-black/20 backdrop-blur-md rounded-full text-white hover:bg-black/40 transition-colors cursor-pointer group shadow-sm border border-white/10" title="Change Photo">
                                <Camera size={20} />
                                <input type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file && onImageUpdate) onImageUpdate(file); }} />
                            </label>

                            {/* Delete Recipe */}
                            <button onClick={onDelete} className="p-2 bg-red-500/20 backdrop-blur-md rounded-full text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm border border-red-500/30" title="Delete Recipe">
                                <Trash2 size={20} />
                            </button>
                        </>
                    )}
                </div>

                {recipe.image_url ? <img src={recipe.image_url} alt={recipe.title} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-muted flex items-center justify-center"><ChefHat size={64} className="text-muted-foreground/50" /></div>}

                <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-background via-background/60 to-transparent" />

                {/* Title & Badges */}
                <div className="absolute bottom-6 left-6 right-6">
                    {isEditing ? (
                        <div className="bg-background/90 backdrop-blur rounded-xl p-4 space-y-3 shadow-lg border border-border/50">
                            <label className="text-xs font-bold text-primary uppercase">Title</label>
                            <input
                                className="w-full text-2xl font-bold bg-transparent border-b border-muted-foreground/20 focus:border-primary focus:outline-none p-1"
                                value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-primary uppercase">Cuisine</label>
                                    <input className="w-full bg-transparent border-b border-muted-foreground/20 focus:border-primary focus:outline-none p-1 text-sm" value={editForm.cuisine} onChange={e => setEditForm({ ...editForm, cuisine: e.target.value })} placeholder="e.g. Italian" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-primary uppercase">Difficulty</label>
                                    <input className="w-full bg-transparent border-b border-muted-foreground/20 focus:border-primary focus:outline-none p-1 text-sm" value={editForm.difficulty} onChange={e => setEditForm({ ...editForm, difficulty: e.target.value })} placeholder="e.g. Easy" />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            <motion.h1 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-3xl md:text-5xl font-extrabold text-foreground drop-shadow-sm mb-3 font-playfair">{recipe.title}</motion.h1>
                            <div className="flex flex-wrap gap-2 items-center">
                                {recipe.cuisine && <span className="px-3 py-1 bg-primary/20 backdrop-blur-md text-primary text-xs font-bold uppercase tracking-wider rounded-md border border-primary/20">{recipe.cuisine}</span>}
                                {recipe.difficulty && <span className="px-3 py-1 bg-secondary/80 backdrop-blur-md text-secondary-foreground text-xs font-bold uppercase tracking-wider rounded-md">{recipe.difficulty}</span>}

                                {/* Source Link Badge */}
                                {recipe.source_url && (
                                    <a href={recipe.source_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-3 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-bold uppercase tracking-wider rounded-md hover:bg-blue-500/30 transition-colors">
                                        Link <ArrowLeft className="rotate-135" size={10} />
                                    </a>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Metadata Section (Author / Book) */}
            {(recipe.author || recipe.cookbook_name || isEditing) && (
                <div className="px-6 py-4 bg-muted/20 border-b border-border text-sm text-foreground/80">
                    {isEditing ? (
                        <div className="grid md:grid-cols-2 gap-4 bg-background/50 p-4 rounded-xl border border-dashed border-primary/30">
                            <div><label className="text-xs text-muted-foreground block mb-1">Author</label><input className="w-full bg-background border rounded px-2 py-1" value={editForm.author} onChange={e => setEditForm({ ...editForm, author: e.target.value })} placeholder="Author Name" /></div>
                            <div><label className="text-xs text-muted-foreground block mb-1">Cookbook Name</label><input className="w-full bg-background border rounded px-2 py-1" value={editForm.cookbook_name} onChange={e => setEditForm({ ...editForm, cookbook_name: e.target.value })} placeholder="Cookbook Title" /></div>
                            <div><label className="text-xs text-muted-foreground block mb-1">ISBN</label><input className="w-full bg-background border rounded px-2 py-1" value={editForm.isbn} onChange={e => setEditForm({ ...editForm, isbn: e.target.value })} placeholder="ISBN-13" /></div>
                            <div><label className="text-xs text-muted-foreground block mb-1">Source URL</label><input className="w-full bg-background border rounded px-2 py-1" value={editForm.source_url} onChange={e => setEditForm({ ...editForm, source_url: e.target.value })} placeholder="https://..." /></div>
                        </div>
                    ) : (
                        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm md:text-base font-serif italic text-muted-foreground">
                            {recipe.author && <span>by <strong className="text-foreground not-italic">{recipe.author}</strong></span>}
                            {recipe.cookbook_name && <span>in <strong className="text-foreground not-italic">{recipe.cookbook_name}</strong></span>}
                            {recipe.isbn && <span className="text-xs font-sans not-italic bg-muted px-2 py-0.5 rounded text-muted-foreground/60">ISBN: {recipe.isbn}</span>}
                        </div>
                    )}
                </div>
            )}


            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-4 px-6 py-6 border-b border-border">
                {['prep_time', 'cook_time', 'servings'].map((field, idx) => {
                    const label = field === 'prep_time' ? strings.prepTime : field === 'cook_time' ? strings.cookTime : strings.servings;
                    const icon = idx === 0 ? <Clock /> : idx === 1 ? <Flame /> : <Users />;
                    const val = isEditing ? editForm[field] : recipe[field];

                    return (
                        <div key={field} className="flex flex-col items-center justify-center p-3 bg-muted/30 rounded-2xl border border-transparent hover:border-primary/10 transition-colors">
                            <div className={`mb-1 ${idx === 1 ? 'text-orange-500' : idx === 2 ? 'text-blue-500' : 'text-primary'}`}>{icon}</div>
                            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</span>
                            {isEditing ? (
                                <input className="w-16 text-center font-bold bg-background border rounded mt-1" value={val} onChange={e => setEditForm({ ...editForm, [field]: e.target.value })} />
                            ) : (
                                idx === 2 ? (
                                    <div className="flex items-center gap-3 mt-1">
                                        <button onClick={() => setCurrentServings(Math.max(1, currentServings - 1))} className="w-6 h-6 flex items-center justify-center rounded-full bg-background border hover:bg-muted"><Minus size={12} /></button>
                                        <span className="font-semibold w-6 text-center">{currentServings}</span>
                                        <button onClick={() => setCurrentServings(currentServings + 1)} className="w-6 h-6 flex items-center justify-center rounded-full bg-background border hover:bg-muted"><Plus size={12} /></button>
                                    </div>
                                ) : (
                                    <span className="font-semibold">{val || '-'}</span>
                                )
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Content */}
            <div className="px-6 py-8 space-y-8">
                {isEditing ? (
                    <textarea className="w-full h-24 p-2 bg-muted/30 border rounded-lg focus:ring-2 focus:ring-primary" value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} placeholder="Description..." />
                ) : (
                    recipe.description && <p className="text-muted-foreground leading-relaxed italic border-l-4 border-primary/20 pl-4">{recipe.description}</p>
                )}

                <div className="grid md:grid-cols-2 gap-8">
                    {/* Ingredients */}
                    <div>
                        <h3 className="text-xl font-bold flex items-center gap-2 mb-4 text-foreground"><Utensils size={20} className="text-primary" />{strings.ingredients}</h3>
                        {/* Note: Full Ingredient editing implies array manipulation. For V1 we just show list. Implementing full array editor is complex. Skipping inline array editing for brevity unless requested. */}
                        {isEditing && <p className="text-xs text-orange-500 mb-2 italic">(Ingredient editing coming soon - edit metadata above!)</p>}

                        <ul className="space-y-3">
                            {Array.isArray(recipe.ingredients) && recipe.ingredients.map((ingredient, idx) => (
                                <motion.li key={idx} className="flex items-start gap-3 p-3 rounded-xl hover:bg-muted/50">
                                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                                    <span className="text-sm md:text-base">{formatIngredient(ingredient)}</span>
                                </motion.li>
                            ))}
                        </ul>
                    </div>

                    {/* Instructions */}
                    <div>
                        <h3 className="text-xl font-bold flex items-center gap-2 mb-4 text-foreground"><ChefHat size={20} className="text-primary" />{strings.instructions}</h3>
                        {isEditing && <p className="text-xs text-orange-500 mb-2 italic">(Instruction editing coming soon)</p>}
                        <div className="space-y-6">
                            {Array.isArray(recipe.instructions) && recipe.instructions.map((step, idx) => (
                                <motion.div key={idx} className="relative pl-6 border-l border-border">
                                    <div className="absolute -left-3 top-0 flex items-center justify-center w-6 h-6 rounded-full bg-background border border-border text-xs font-bold text-primary shadow-sm">{idx + 1}</div>
                                    <p className="text-sm md:text-base leading-relaxed text-foreground/90">{step}</p>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
