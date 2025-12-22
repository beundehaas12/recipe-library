import { useState, useCallback } from 'react';
import { supabase, uploadTempImage, uploadSourceImage } from '../lib/supabase';
import { analyzeRecipeImage } from '../lib/xai';

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

                const recipe = aiResult?.recipe;
                if (!recipe) {
                    throw new Error('AI returned no recipe data');
                }

                // 3. Update queue with AI results
                console.log('[BatchProcess] Updating queue with recipe:', recipe.title);
                setQueue(prev => prev.map(q =>
                    q.id === item.id
                        ? {
                            ...q,
                            status: 'review_needed',
                            title: recipe.title || q.title,
                            description: recipe.description || recipe.intro || '',
                            prep_time: recipe.prep_time,
                            cook_time: recipe.cook_time,
                            servings: recipe.servings,
                            cuisine: recipe.cuisine,
                            ingredients: recipe.ingredients || [],
                            instructions: recipe.instructions || recipe.steps || [],
                            original_image_url: publicUrl,
                            ai_data: aiResult // Store full result (recipe, usage, raw_data)
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
