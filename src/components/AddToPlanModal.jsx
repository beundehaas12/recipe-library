import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Check, X } from 'lucide-react';
import { addToMealPlan, addRecipeIngredientsToShoppingList } from '../lib/plannerService';
import { useAuth } from '../context/AuthContext';

const MEALS = [
    { id: 'breakfast', label: 'Ontbijt' },
    { id: 'lunch', label: 'Lunch' },
    { id: 'dinner', label: 'Diner' }
];

export default function AddToPlanModal({ recipe, onClose, onShowShoppingConfirm }) {
    const { user } = useAuth();
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedType, setSelectedType] = useState('dinner');
    const [loading, setLoading] = useState(false);
    const [addIngredients, setAddIngredients] = useState(true);

    const handleSubmit = async () => {
        setLoading(true);
        try {
            await addToMealPlan(user.id, recipe.id, selectedDate, selectedType);

            if (addIngredients) {
                await addRecipeIngredientsToShoppingList(user.id, recipe);
                if (onShowShoppingConfirm) onShowShoppingConfirm();
            }

            onClose();
        } catch (error) {
            console.error(error);
            alert("Fout bij plannen: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-6"
            >
                <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Calendar className="text-primary" size={20} />
                        Plan Maaltijd
                    </h3>
                    <button onClick={onClose} className="text-white/50 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-4">
                    {/* Date Picker */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-white/60 uppercase tracking-wider">Datum</label>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary transition-colors"
                        />
                    </div>

                    {/* Meal Type */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-white/60 uppercase tracking-wider">Moment</label>
                        <div className="grid grid-cols-3 gap-2">
                            {MEALS.map(meal => (
                                <button
                                    key={meal.id}
                                    onClick={() => setSelectedType(meal.id)}
                                    className={`p-3 rounded-xl border font-bold text-sm transition-all ${selectedType === meal.id
                                            ? 'bg-primary/20 border-primary text-primary'
                                            : 'bg-white/5 border-transparent text-white/60 hover:bg-white/10'
                                        }`}
                                >
                                    {meal.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Shopping List Toggle */}
                    <div
                        className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-colors"
                        onClick={() => setAddIngredients(!addIngredients)}
                    >
                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${addIngredients ? 'bg-primary border-primary' : 'border-white/30'}`}>
                            {addIngredients && <Check size={12} className="text-black" />}
                        </div>
                        <span className="text-sm text-gray-300">Ingrediënten toevoegen aan boodschappenlijst</span>
                    </div>
                </div>

                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="w-full bg-primary hover:bg-primary/90 text-black font-bold py-3 rounded-xl transition-all active:scale-95 disabled:opacity-50"
                >
                    {loading ? 'Bezig...' : 'Toevoegen aan Agenda'}
                </button>
            </motion.div>
        </div>
    );
}
