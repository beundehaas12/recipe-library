import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import DashboardLayout from './DashboardLayout';
import RecipeQueueList from './RecipeQueueList';
import QuickReviewPanel from './QuickReviewPanel';
import { useBatchProcessing } from '../../hooks/useBatchProcessing';

export default function DashboardPage() {
    const { user, signOut } = useAuth();
    const { queue, uploadFiles, updateItem: updateQueueItem, deleteItem: deleteQueueItem } = useBatchProcessing();
    const [selectedId, setSelectedId] = useState(null);
    const [dbRecipes, setDbRecipes] = useState([]);
    const [activeFilter, setActiveFilter] = useState('all');

    // Fetch existing recipes
    useEffect(() => {
        if (!user) return;

        async function fetchRecipes() {
            const { data } = await supabase
                .from('recipes')
                .select('*')
                .order('created_at', { ascending: false });

            if (data) {
                // Map DB recipes to ensure they have a status for the list
                setDbRecipes(data.map(r => ({ ...r, status: 'completed' })));
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
            default:
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

    return (
        <DashboardLayout
            user={user}
            signOut={signOut}
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
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
            />
        </DashboardLayout>
    );
}
