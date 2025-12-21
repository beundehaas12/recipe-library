import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from './DashboardLayout';
import RecipeQueueList from './RecipeQueueList';
import QuickReviewPanel from './QuickReviewPanel';
import { useBatchProcessing } from '../../hooks/useBatchProcessing';

export default function DashboardPage() {
    const { user, signOut } = useAuth();
    const { queue, uploadFiles, updateItem, deleteItem } = useBatchProcessing();
    const [selectedId, setSelectedId] = useState(null);

    const selectedRecipe = queue.find(r => r.id === selectedId);

    const handleUpload = (files) => {
        uploadFiles(files, user.id);
    };

    return (
        <DashboardLayout user={user} signOut={signOut}>
            {/* Finder Column 2: List */}
            <RecipeQueueList
                recipes={queue}
                selectedId={selectedId}
                onSelect={setSelectedId}
            />

            {/* Finder Column 3: Preview/Action */}
            <QuickReviewPanel
                selectedRecipe={selectedRecipe}
                onUpdate={updateItem}
                onDelete={(id) => {
                    deleteItem(id);
                    if (selectedId === id) setSelectedId(null);
                }}
                onUpload={handleUpload}
            />
        </DashboardLayout>
    );
}
