import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Missing Supabase credentials. Application may not function correctly.')
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
    auth: {
        persistSession: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        autoRefreshToken: true,
        detectSessionInUrl: true
    }
})

// =============================================================================
// STORAGE HELPERS FOR RECIPE IMAGE PROCESSING
// =============================================================================
// Workflow:
// 1. Upload image to temp folder in Supabase Storage
// 2. Generate short-lived signed URL (2 minutes)
// 3. Send signed URL to Edge Function (not base64 = lower tokens)
// 4. Delete image immediately after successful processing
//
// WHY SIGNED URLs?
// - Lower data transfer than base64
// - xAI can fetch directly from URL
// - Short expiry (2 min) for security
// - Immediate deletion = no storage costs
// =============================================================================

/**
 * Upload image to temporary storage and get a signed URL.
 * The image is stored in a temp folder and should be deleted after processing.
 * 
 * @param {File} file - Image file to upload
 * @param {string} userId - User ID for folder organization
 * @returns {Promise<{path: string, signedUrl: string}>}
 * @throws {Error} If upload or signed URL generation fails
 */
export async function uploadTempImage(file, userId) {
    // Create unique filename in user's temp folder
    const filename = `temp/${userId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

    const { data, error } = await supabase.storage
        .from('recipe-images')
        .upload(filename, file, {
            upsert: false,  // Don't overwrite
            cacheControl: '60'  // Short cache
        });

    if (error) {
        console.error('Upload error:', error);
        throw new Error(`Failed to upload image: ${error.message}`);
    }

    // Generate signed URL with 2-minute expiry
    // This is enough time for the Edge Function to process
    const { data: signedData, error: signedError } = await supabase.storage
        .from('recipe-images')
        .createSignedUrl(filename, 120);  // 120 seconds = 2 minutes

    if (signedError) {
        // Clean up uploaded file if signed URL fails
        await supabase.storage.from('recipe-images').remove([filename]);
        throw new Error(`Failed to create signed URL: ${signedError.message}`);
    }

    return {
        path: filename,
        signedUrl: signedData.signedUrl
    };
}

/**
 * Delete a temporary image from storage.
 * Should be called after successful recipe processing.
 * 
 * @param {string} path - Storage path of the image to delete
 * @returns {Promise<void>}
 */
export async function deleteTempImage(path) {
    const { error } = await supabase.storage
        .from('recipe-images')
        .remove([path]);

    if (error) {
        // Log but don't throw - deletion failure shouldn't break the flow
        console.warn('Failed to delete temp image:', error);
    }
}

