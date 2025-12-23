import { useState, useCallback } from 'react';
import { uploadSourceImage } from '../lib/supabase';
import { analyzeRecipeImage, extractRecipeFromText } from '../lib/xai';
import { processHtmlForRecipe } from '../lib/htmlParser';
import { saveRecipe } from '../lib/recipeService';

export function useBatchProcessing() {
    const [queue, setQueue] = useState([]);
    const [isUploading, setIsUploading] = useState(false);

    // Process image files
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

    // Process URL to extract recipe
    const processUrl = useCallback(async (url, userId, context = {}, onSuccess) => {
        if (!url) return;

        const itemId = `temp-url-${Date.now()}`;
        const displayName = url.replace(/^https?:\/\/(www\.)?/, '').substring(0, 30) + '...';

        // Add to queue immediately
        setQueue(prev => [{
            id: itemId,
            title: displayName,
            status: 'processing',
            source_url: url,
            created_at: new Date().toISOString(),
            context
        }, ...prev]);

        const fetchWithProxy = async (proxyUrl) => {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), 30000); // Extended to 30s
            const res = await fetch(proxyUrl, { signal: controller.signal });
            clearTimeout(id);
            if (!res.ok) throw new Error(`Proxy error: ${res.status}`);
            return res.text();
        };

        try {
            console.log('[BatchProcess] Processing URL:', url);

            // 1. Fetch page content via proxy
            let htmlContent = "";
            try {
                const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
                htmlContent = await fetchWithProxy(proxyUrl);
            } catch (e) {
                console.warn("[BatchProcess] Primary proxy failed, trying backup...", e);
                const backupProxy = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
                const res = await fetch(backupProxy);
                const data = await res.json();
                if (data.contents) {
                    htmlContent = data.contents;
                } else {
                    throw new Error("Could not fetch URL content");
                }
            }

            if (!htmlContent) throw new Error("Could not retrieve content from URL");

            // 2. Parse HTML for recipe
            const processed = processHtmlForRecipe(htmlContent);

            let recipe;
            let usage = null;

            if (processed.type === 'schema') {
                console.log('[BatchProcess] Using Schema.org data');
                recipe = processed.data;
                recipe.ai_tags = ['📊 schema', ...(recipe.ai_tags || [])];
                usage = { model: 'schema-org', processing_time_ms: 0 };
            } else {
                console.log('[BatchProcess] Falling back to AI');
                const result = await extractRecipeFromText(processed.data);
                recipe = result.recipe;
                usage = result.usage;
                recipe.ai_tags = ['🤖 gemini', '🔗 url', ...(recipe.ai_tags || [])];
            }

            if (!recipe || !recipe.title) {
                throw new Error('Kon geen recept vinden op deze pagina');
            }

            // 3. Save to database
            const savedRecipe = await saveRecipe(userId, recipe, {
                type: 'url',
                url: url,
                original_image_url: recipe.image || recipe.image_url
            }, usage);

            // 4. Update queue to DONE
            const queueItem = {
                id: itemId,
                status: 'done',
                ...savedRecipe,
                title: savedRecipe.title
            };

            setQueue(prev => prev.map(q =>
                q.id === itemId
                    ? queueItem
                    : q
            ));

            // 5. Invoke Success Callback
            if (onSuccess) {
                onSuccess(savedRecipe, itemId);
            }

            console.log('[BatchProcess] ✅ URL processing complete');

        } catch (error) {
            console.error("[BatchProcess] ❌ URL Error:", error);
            setQueue(prev => prev.map(q =>
                q.id === itemId
                    ? { ...q, status: 'error', error: error.message }
                    : q
            ));
        }
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
        processUrl,
        updateItem,
        deleteItem
    };
}

