import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getShoppingList, toggleShoppingItem, deleteShoppingItem } from '../lib/plannerService';
import { ShoppingBasket, Check, Trash2, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';

export default function ShoppingListPage() {
    const { user } = useAuth();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) loadItems();
    }, [user]);

    async function loadItems() {
        try {
            const data = await getShoppingList(user.id);
            setItems(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    async function handleToggle(id, currentStatus) {
        // Optimistic update
        setItems(items.map(i => i.id === id ? { ...i, is_checked: !currentStatus } : i));
        try {
            await toggleShoppingItem(id, !currentStatus);
        } catch (e) {
            console.error(e);
            loadItems(); // Revert on error
        }
    }

    async function handleDelete(id) {
        setItems(items.filter(i => i.id !== id));
        try {
            await deleteShoppingItem(id);
        } catch (e) {
            console.error(e);
            loadItems();
        }
    }

    const groupedItems = items.reduce((acc, item) => {
        const key = item.is_checked ? 'checked' : 'unchecked';
        acc[key].push(item);
        return acc;
    }, { checked: [], unchecked: [] });

    return (
        <div className="min-h-screen pt-24 pb-32 px-4 lg:px-20 max-w-4xl mx-auto">
            <h1 className="text-4xl font-black text-white mb-8 flex items-center gap-3">
                <ShoppingBasket className="text-primary" size={40} />
                Boodschappen
            </h1>

            {loading ? (
                <div className="text-white/50">Laden...</div>
            ) : items.length === 0 ? (
                <div className="text-white/50 bg-white/5 p-8 rounded-2xl text-center border border-white/10">
                    Nog geen boodschappen. Plan maaltijden of voeg ingrediënten toe vanuit een recept.
                </div>
            ) : (
                <div className="space-y-8">
                    {/* Unchecked Items */}
                    <div className="space-y-2">
                        <AnimatePresence>
                            {groupedItems.unchecked.map(item => (
                                <ShoppingItem
                                    key={item.id}
                                    item={item}
                                    onToggle={() => handleToggle(item.id, item.is_checked)}
                                    onDelete={() => handleDelete(item.id)}
                                />
                            ))}
                        </AnimatePresence>
                    </div>

                    {/* Checked Items */}
                    {groupedItems.checked.length > 0 && (
                        <div>
                            <h3 className="text-white/40 text-sm font-bold uppercase tracking-widest mb-4">Gekocht</h3>
                            <div className="space-y-2 opacity-50">
                                {groupedItems.checked.map(item => (
                                    <ShoppingItem
                                        key={item.id}
                                        item={item}
                                        onToggle={() => handleToggle(item.id, item.is_checked)}
                                        onDelete={() => handleDelete(item.id)}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function ShoppingItem({ item, onToggle, onDelete }) {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`
                group flex items-center gap-4 bg-zinc-900/50 border border-white/5 p-4 rounded-xl transition-all
                ${item.is_checked ? 'bg-zinc-900/30' : 'hover:bg-zinc-900/80 hover:border-white/10'}
            `}
        >
            <button
                onClick={onToggle}
                className={`
                    w-6 h-6 rounded-full border flex items-center justify-center transition-colors
                    ${item.is_checked ? 'bg-primary border-primary' : 'border-white/30 hover:border-primary'}
                `}
            >
                {item.is_checked && <Check size={14} className="text-black" />}
            </button>

            <div className="flex-1">
                <span className={`text-lg font-medium ${item.is_checked ? 'text-white/30 line-through' : 'text-gray-200'}`}>
                    {item.amount && <span className="font-bold text-primary mr-1">{item.amount} {item.unit}</span>}
                    {item.item}
                </span>
                {item.recipe && (
                    <Link to={`/recipe/${item.source_recipe_id}`} className="flex items-center gap-1 text-xs text-white/30 hover:text-white/60 transition-colors mt-1">
                        <ArrowRight size={10} />
                        {item.recipe.title}
                    </Link>
                )}
            </div>

            <button onClick={onDelete} className="text-white/20 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                <Trash2 size={18} />
            </button>
        </motion.div>
    );
}
