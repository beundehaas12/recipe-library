import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import DashboardLayout from './DashboardLayout';
import RecipeQueueList from './RecipeQueueList';
import QuickReviewPanel from './QuickReviewPanel';
import CreateCollectionModal from './CreateCollectionModal';
import { useBatchProcessing } from '../../hooks/useBatchProcessing';

export default function DashboardPage() {
    const navigate = useNavigate();
    const { user, signOut, isAdmin, isAuthor, loading } = useAuth();
    const { queue, uploadFiles, processUrl, updateItem: updateQueueItem, deleteItem: deleteQueueItem } = useBatchProcessing();
    const [selectedId, setSelectedId] = useState(null);
    const [dbRecipes, setDbRecipes] = useState([]);
    const [collections, setCollections] = useState([]);
    const [activeFilter, setActiveFilter] = useState('all');
    const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);

    // Route guard: redirect non-author users to home
    useEffect(() => {
        if (!loading && !isAuthor) {
            navigate('/');
        }
    }, [loading, isAuthor, navigate]);

    // Don't render if not author
    if (loading || !isAuthor) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
        );
    }

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
                    // Keep ingredient objects with all properties
                    ingredients: r.recipe_ingredients?.sort((a, b) => a.order_index - b.order_index).map(ing => ({
                        amount: ing.quantity,
                        unit: ing.unit,
                        name: ing.name,
                        group_name: ing.group_name,
                        notes: ing.notes
                    })) || [],
                    // Keep instruction objects with all properties
                    instructions: r.recipe_steps?.sort((a, b) => a.step_number - b.step_number).map(step => ({
                        step_number: step.step_number,
                        description: step.description,
                        extra: step.extra
                    })) || []
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
            try {
                // Determine if we should use the service (for logging + complex updates) or direct (simple)
                // Using service safely for partial updates as verified
                const { updateRecipe } = await import('../../lib/recipeService');
                await updateRecipe(id, updates);
            } catch (error) {
                console.error("Failed to update recipe:", error);
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

            try {
                const { deleteRecipe } = await import('../../lib/recipeService');
                await deleteRecipe(id);
            } catch (error) {
                console.error("Failed to delete recipe:", error);
            }
        }

        if (selectedId === id) setSelectedId(null);
    };

    const handleApprove = async (tempId) => {
        const item = queue.find(q => q.id === tempId);
        if (!item) return;

        try {
            // Import dynamically to ensure latest version
            const { saveRecipe } = await import('../../lib/recipeService');

            // Construct recipe data from queue item (which might be edited)
            const aiResult = item.ai_data || {};
            const aiRecipe = aiResult.recipe || {};

            const recipeData = {
                title: item.title || 'Untitled',
                description: item.description || '',
                servings: item.servings,
                prep_time: item.prep_time,
                cook_time: item.cook_time,
                cuisine: item.cuisine,
                intro: item.intro,
                ingredients: item.ingredients,
                instructions: item.instructions,
                ai_tags: aiRecipe.ai_tags || ['📷 foto', 'batch-upload']
            };

            const sourceInfo = {
                type: 'image',
                original_image_url: item.original_image_url,
                raw_extracted_data: aiResult.raw_extracted_data
            };

            const extractionHistory = {
                ...aiResult.usage,
                ai_model: aiResult.ai_model || 'Mistral OCR 3 + Grok 4',
                processing_time_ms: aiResult.processing_time_ms
            };

            // Use shared service to save (ensures identical logic to main app)
            const recipe = await saveRecipe(user.id, recipeData, sourceInfo, extractionHistory);

            // Link Collection if context exists
            if (item.context && item.context.collectionId) {
                await supabase.from('recipe_collections').insert({
                    recipe_id: recipe.id,
                    collection_id: item.context.collectionId
                });
                // Manually add to local object for UI update
                recipe.recipe_collections = [{ collection_id: item.context.collectionId }];

                // Log collection add
                const { logActivity } = await import('../../lib/activityService');
                const collectionName = collections.find(c => c.id === item.context.collectionId)?.name || 'Collectie';
                await logActivity(user.id, 'add_to_collection', `Recept in '${collectionName}' geplaatst`, { recipeId: recipe.id, collectionId: item.context.collectionId });
            }

            // Cleanup and Update UI
            setDbRecipes(prev => [recipe, ...prev]);
            deleteQueueItem(tempId);
            setSelectedId(recipe.id);

            // Update image URL if needed (saveRecipe might not set the main image_url if only original is passed)
            // But saveRecipe -> normalize -> insert uses image_url: null.
            // We want image_url to be the original_image_url for now.
            if (item.original_image_url) {
                await supabase.from('recipes')
                    .update({ image_url: item.original_image_url })
                    .eq('id', recipe.id);
                recipe.image_url = item.original_image_url;
            }

        } catch (error) {
            console.error("Approve failed:", error);
            alert("Failed to approve recipe: " + error.message);
        }
    };

    const handleUpload = (files) => {
        const context = {};
        const isCollection = collections.some(c => c.id === activeFilter);

        if (isCollection) {
            context.collectionId = activeFilter;
        }

        uploadFiles(files, user.id, context);

        // Only switch to drafts if on a view where the new item won't appear
        if (activeFilter === 'favorites' || activeFilter === 'recent') {
            setActiveFilter('drafts');
        }
    };

    // Collection Toggle Logic
    const handleCollectionToggle = async (recipeId, collectionId) => {
        const recipe = dbRecipes.find(r => r.id === recipeId);
        if (!recipe) return; // Only DB recipes supported for now

        const exists = recipe.recipe_collections?.some(rc => rc.collection_id === collectionId);
        const { logActivity } = await import('../../lib/activityService');
        const collectionName = collections.find(c => c.id === collectionId)?.name || 'Collectie';

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
                // Log removal? Maybe too noisy. User said "created, removed collections etc". 
                // Adding/removing from collection is a key action.
                logActivity(user.id, 'add_to_collection', `Verwijderd uit '${collectionName}'`, { recipeId, collectionId });
            } else {
                await supabase.from('recipe_collections')
                    .insert({ recipe_id: recipeId, collection_id: collectionId });
                logActivity(user.id, 'add_to_collection', `Toegevoegd aan '${collectionName}'`, { recipeId, collectionId });
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

            const { logActivity } = await import('../../lib/activityService');
            await logActivity(user.id, 'create_collection', `Nieuwe collectie: ${name}`, { collectionId: data.id });
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
            isAdmin={isAdmin}
            onUpload={handleUpload}
            onUrlSubmit={(url) => processUrl(url, user.id)}
        >
            {/* Finder Column 2: List */}
            <RecipeQueueList
                recipes={filteredRecipes}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onUpload={handleUpload}
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
