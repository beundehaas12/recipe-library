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
// 1. Convert image to JPEG (handles HEIC from iPhone)
// 2. Upload to temp folder in Supabase Storage
// 3. Generate short-lived signed URL (2 minutes)
// 4. Send signed URL to Edge Function (not base64 = lower tokens)
// 5. Delete image immediately after successful processing
// =============================================================================

/**
 * Convert any image to JPEG format using Canvas.
 * This handles HEIC from iPhone and also corrects orientation issues.
 * 
 * @param {File} file - Image file to convert
 * @param {number} quality - JPEG quality (0-1), default 0.9
 * @returns {Promise<Blob>} JPEG blob
 */
async function convertToJpeg(file, quality = 0.9) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(url);

            // Create canvas with image dimensions
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;

            const ctx = canvas.getContext('2d');

            // Draw image (Canvas handles orientation automatically in modern browsers)
            ctx.drawImage(img, 0, 0);

            // Convert to JPEG blob
            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('Failed to convert image to JPEG'));
                    }
                },
                'image/jpeg',
                quality
            );
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to load image for conversion'));
        };

        img.src = url;
    });
}

/**
 * Upload image to temporary storage and get a signed URL.
 * The image is converted to JPEG first (handles HEIC from iPhone).
 * 
 * @param {File} file - Image file to upload
 * @param {string} userId - User ID for folder organization
 * @returns {Promise<{path: string, signedUrl: string}>}
 * @throws {Error} If upload or signed URL generation fails
 */
export async function uploadTempImage(file, userId) {
    console.log('Converting image to JPEG...');

    // Convert to JPEG (handles HEIC, orientation, etc.)
    const jpegBlob = await convertToJpeg(file, 0.9);

    // Create unique filename in user's temp folder (always .jpg now)
    const baseName = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
    const filename = `temp/${userId}/${Date.now()}_${baseName.replace(/[^a-zA-Z0-9.-]/g, '_')}.jpg`;

    console.log(`Uploading ${(jpegBlob.size / 1024).toFixed(1)}KB JPEG...`);

    const { data, error } = await supabase.storage
        .from('recipe-images')
        .upload(filename, jpegBlob, {
            contentType: 'image/jpeg',
            upsert: false,
            cacheControl: '60'
        });

    if (error) {
        console.error('Upload error:', error);
        throw new Error(`Failed to upload image: ${error.message}`);
    }

    // Generate signed URL with 2-minute expiry
    const { data: signedData, error: signedError } = await supabase.storage
        .from('recipe-images')
        .createSignedUrl(filename, 120);

    if (signedError) {
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

