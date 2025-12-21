import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import DashboardLayout from './DashboardLayout';
import RecipeQueueList from './RecipeQueueList';
import QuickReviewPanel from './QuickReviewPanel';
import CreateCollectionModal from './CreateCollectionModal';
import { useBatchProcessing } from '../../hooks/useBatchProcessing';

export default function DashboardPage() {
    const { user, signOut } = useAuth();
    const { queue, uploadFiles, updateItem: updateQueueItem, deleteItem: deleteQueueItem } = useBatchProcessing();
    const [selectedId, setSelectedId] = useState(null);
    const [dbRecipes, setDbRecipes] = useState([]);
    const [collections, setCollections] = useState([]);
    const [activeFilter, setActiveFilter] = useState('all');
    const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);

    // Fetch collections
    useEffect(() => {
        if (!user) return;
        supabase.from('collections').select('*').order('name').then(({ data }) => {
            if (data) setCollections(data);
        });
    }, [user]);

    // Fetch existing recipes with related data
    useEffect(() => {
        if (!user) return;

        async function fetchRecipes() {
            const { data, error } = await supabase
                .from('recipes')
                .select(`
                    *,
                    recipe_ingredients (id, name, quantity, unit, group_name, notes, order_index),
                    recipe_steps (id, step_number, description, extra),
                    recipe_collections (collection_id)
                `)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching recipes:', error);
                return;
            }

            if (data) {
                // Map DB recipes to ensure they have the expected structure
                setDbRecipes(data.map(r => ({
                    ...r,
                    status: 'completed',
                    // Map normalized ingredients to a simple array format for display
                    ingredients: r.recipe_ingredients?.sort((a, b) => a.order_index - b.order_index).map(ing =>
                        `${ing.quantity || ''} ${ing.unit || ''} ${ing.name}${ing.notes ? ` (${ing.notes})` : ''}`.trim()
                    ) || [],
                    // Map normalized steps to a simple array format for display
                    instructions: r.recipe_steps?.sort((a, b) => a.step_number - b.step_number).map(step =>
                        step.description
                    ) || []
                })));
            }
        }

        fetchRecipes();
    }, [user]);

    // Combine Queue + DB Recipes
    const allRecipes = useMemo(() => {
        return [...queue, ...dbRecipes];
    }, [queue, dbRecipes]);

    // Filter Logic
    const filteredRecipes = useMemo(() => {
        switch (activeFilter) {
            case 'drafts':
                return allRecipes.filter(r => ['processing', 'review_needed', 'error'].includes(r.status));
            case 'recent':
                // Show last 5 from combined
                return allRecipes.slice(0, 5);
            case 'all':
                return allRecipes;
            default:
                // Filter by Collection ID
                if (activeFilter) {
                    return allRecipes.filter(r =>
                        r.recipe_collections?.some(rc => rc.collection_id === activeFilter)
                    );
                }
                return allRecipes;
        }
    }, [activeFilter, allRecipes]);

    const selectedRecipe = allRecipes.find(r => r.id === selectedId);

    const handleUpload = (files) => {
        uploadFiles(files, user.id);
        setActiveFilter('drafts'); // Auto-switch to drafts to see progress
    };

    // Unified Update Handler
    const handleUpdate = async (id, updates) => {
        // Check if it's a queue item (starts with 'temp-') or DB item (UUID)
        const isQueueItem = id.toString().startsWith('temp-');

        if (isQueueItem) {
            updateQueueItem(id, updates);
        } else {
            // Optimistic update
            setDbRecipes(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));

            // Persist to DB
            const { error } = await supabase
                .from('recipes')
                .update(updates)
                .eq('id', id);

            if (error) {
                console.error("Failed to update recipe:", error);
                // Revert logic could go here
            }
        }
    };

    // Unified Delete Handler
    const handleDelete = async (id) => {
        const isQueueItem = id.toString().startsWith('temp-');

        if (isQueueItem) {
            deleteQueueItem(id);
        } else {
            // Optimistic delete
            setDbRecipes(prev => prev.filter(r => r.id !== id));

            const { error } = await supabase
                .from('recipes')
                .delete()
                .eq('id', id);

            if (error) {
                console.error("Failed to delete recipe:", error);
            }
        }

        if (selectedId === id) setSelectedId(null);
    };

    // Collection Toggle Logic
    const handleCollectionToggle = async (recipeId, collectionId) => {
        const recipe = dbRecipes.find(r => r.id === recipeId);
        if (!recipe) return; // Only DB recipes supported for now

        const exists = recipe.recipe_collections?.some(rc => rc.collection_id === collectionId);

        // Optimistic Update
        setDbRecipes(prev => prev.map(r => {
            if (r.id === recipeId) {
                const newCollections = exists
                    ? r.recipe_collections.filter(rc => rc.collection_id !== collectionId)
                    : [...(r.recipe_collections || []), { collection_id: collectionId }];
                return { ...r, recipe_collections: newCollections };
            }
            return r;
        }));

        // DB Update
        try {
            if (exists) {
                await supabase.from('recipe_collections')
                    .delete()
                    .match({ recipe_id: recipeId, collection_id: collectionId });
            } else {
                await supabase.from('recipe_collections')
                    .insert({ recipe_id: recipeId, collection_id: collectionId });
            }
        } catch (error) {
            console.error("Error toggling collection:", error);
            // Revert could happen here
        }
    };

    const handleCreateCollection = async (name) => {
        const { data, error } = await supabase
            .from('collections')
            .insert([{ user_id: user.id, name }])
            .select()
            .single();

        if (data) {
            setCollections(prev => [...prev, data]);
            setIsCollectionModalOpen(false);
        }
        if (error) console.error('Error creating collection:', error);
    };

    return (
        <DashboardLayout
            user={user}
            signOut={signOut}
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            collections={collections}
            onCreateCollection={() => setIsCollectionModalOpen(true)}
        >
            {/* Finder Column 2: List */}
            <RecipeQueueList
                recipes={filteredRecipes}
                selectedId={selectedId}
                onSelect={setSelectedId}
            />

            {/* Finder Column 3: Preview/Action */}
            <QuickReviewPanel
                selectedRecipe={selectedRecipe}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                onUpload={handleUpload}
                collections={collections}
                onCollectionToggle={handleCollectionToggle}
            />

            <CreateCollectionModal
                isOpen={isCollectionModalOpen}
                onClose={() => setIsCollectionModalOpen(false)}
                onCreate={handleCreateCollection}
            />
        </DashboardLayout>
    );
}
