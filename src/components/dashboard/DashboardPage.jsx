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
        const mappedQueue = queue.map(q => ({
            ...q,
            recipe_collections: q.context?.collectionId
                ? [{ collection_id: q.context.collectionId }]
                : []
        }));
        return [...mappedQueue, ...dbRecipes];
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

    // Auto-select first recipe
    useEffect(() => {
        if (filteredRecipes.length > 0) {
            const isValid = selectedId && filteredRecipes.some(r => r.id === selectedId);
            if (!isValid) {
                setSelectedId(filteredRecipes[0].id);
            }
        }
    }, [filteredRecipes, selectedId]);

    const selectedRecipe = allRecipes.find(r => r.id === selectedId);

    // Unified Update Handler
    const handleUpdate = async (id, updates) => {
        const isQueueItem = id.toString().startsWith('temp-');

        if (isQueueItem) {
            updateQueueItem(id, updates);
        } else {
            setDbRecipes(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
            const { error } = await supabase.from('recipes').update(updates).eq('id', id);
            if (error) console.error("Failed to update recipe:", error);
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

    const handleApprove = async (tempId) => {
        const item = queue.find(q => q.id === tempId);
        if (!item) return;

        // Insert into DB
        const { data: recipe, error } = await supabase.from('recipes').insert([
            {
                user_id: user.id,
                title: item.title || 'Untitled',
                description: item.description || '',
                source_type: 'image',
                status: 'completed',
                source_url: item.source_url || '',
                cook_time: item.cook_time || '',
                prep_time: item.prep_time || '',
                intro: item.intro || ''
            }
        ]).select().single();

        if (error) {
            console.error("Save error", error);
            return;
        }

        // Link Collection if context exists
        if (item.context && item.context.collectionId) {
            await supabase.from('recipe_collections').insert({
                recipe_id: recipe.id,
                collection_id: item.context.collectionId
            });
            recipe.recipe_collections = [{ collection_id: item.context.collectionId }];
        }

        // Cleanup and Update UI
        setDbRecipes(prev => [recipe, ...prev]);
        deleteQueueItem(tempId);
        setSelectedId(recipe.id);
    };

    const handleUpload = (files) => {
        const context = {};
        const isCollection = collections.some(c => c.id === activeFilter);
        if (isCollection) {
            context.collectionId = activeFilter;
        }

        uploadFiles(files, user.id, context);
        setActiveFilter('drafts'); // Auto-switch to drafts to see progress
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
                onApprove={handleApprove}
            />

            <CreateCollectionModal
                isOpen={isCollectionModalOpen}
                onClose={() => setIsCollectionModalOpen(false)}
                onCreate={handleCreateCollection}
            />
        </DashboardLayout>
    );
}
