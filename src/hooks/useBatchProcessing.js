import { useState, useCallback } from 'react';
import { uploadSourceImage } from '../lib/supabase';
import { analyzeRecipeImage } from '../lib/xai';
import { saveRecipe } from '../lib/recipeService';

export function useBatchProcessing() {
    const [queue, setQueue] = useState([]);
    const [isUploading, setIsUploading] = useState(false);

    // Mock upload function for now - in real implementation this would use the existing upload logic
    const uploadFiles = useCallback(async (files, userId, context = {}) => {
        setIsUploading(true);
        const newItems = Array.from(files).map((file, index) => ({
            id: `temp-${Date.now()}-${index}`,
            file,
            title: file.name.split('.')[0],
            status: 'processing',
            created_at: new Date().toISOString(),
            image_url: URL.createObjectURL(file), // Preliminary preview
            context // Store context (e.g. { collectionId })
        }));

        setQueue(prev => [...newItems, ...prev]);

        // Process each file with Real AI
        for (const item of newItems) {
            try {
                console.log('[BatchProcess] Starting upload for:', item.file.name, 'userId:', userId);

                // 1. Upload to storage (Permanent Source)
                const uploadResult = await uploadSourceImage(item.file, userId);
                console.log('[BatchProcess] Upload complete:', uploadResult);
                const { publicUrl, signedUrl } = uploadResult;

                // Update item with image immediately so user sees it
                setQueue(prev => prev.map(q =>
                    q.id === item.id ? { ...q, image_url: publicUrl, source_url: publicUrl } : q
                ));

                // 2. Real AI processing
                console.log('[BatchProcess] Starting AI analysis with signedUrl:', signedUrl?.substring(0, 80) + '...');
                const aiResult = await analyzeRecipeImage(signedUrl);
                console.log('[BatchProcess] AI result:', aiResult);

                const recipeRaw = aiResult?.recipe;
                if (!recipeRaw) {
                    throw new Error('AI returned no recipe data');
                }

                // 3. AUTO-APPROVE: Save directly to database
                console.log('[BatchProcess] Auto-Approving recipe:', recipeRaw.title);

                // Merge context into extra_data if needed, or handle collections
                // For now, saveRecipe handles the main insert. Collection linking happens logic usually in Dashboard, 
                // but we can try to do it here if we had access to the join table logic. 
                // However, saveRecipe returns the SAVED recipe.

                const savedRecipe = await saveRecipe(userId, recipeRaw, {
                    url: publicUrl,
                    type: 'image',
                    original_image_url: publicUrl,
                    raw_extracted_data: aiResult.raw_extracted_data
                }, aiResult.usage);

                console.log('[BatchProcess] Recipe saved with ID:', savedRecipe.id);

                // 4. Update queue to DONE
                setQueue(prev => prev.map(q =>
                    q.id === item.id
                        ? {
                            ...q,
                            status: 'done', // Marked as done/approved
                            ...savedRecipe, // Spread ALL DB fields (prep_time, servings, etc.)
                            original_image_url: publicUrl,
                            ai_data: aiResult
                        }
                        : q
                ));
                console.log('[BatchProcess] ✅ Complete for:', item.file.name);
            } catch (error) {
                console.error("[BatchProcess] ❌ Error:", error);
                setQueue(prev => prev.map(q =>
                    q.id === item.id
                        ? { ...q, status: 'error', error: error.message }
                        : q
                ));
            }
        }
        setIsUploading(false);
    }, []);

    const updateItem = useCallback((id, updates) => {
        setQueue(prev => prev.map(item =>
            item.id === id ? { ...item, ...updates } : item
        ));
    }, []);

    const deleteItem = useCallback((id) => {
        setQueue(prev => prev.filter(item => item.id !== id));
    }, []);

    return {
        queue,
        isUploading,
        uploadFiles,
        updateItem,
        deleteItem
    };
}
