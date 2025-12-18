import { createClient } from '@supabase/supabase-js'
import heic2any from 'heic2any'

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
// IMAGE PROCESSING FOR RECIPE OCR
// =============================================================================
// Key optimizations for iPhone photos:
// 1. Use heic2any for PROPER HEIC decoding (browser can't natively decode HEIC in JS)
// 2. Resize large images to max 4000px (Grok has 33MP limit, iPhone can be 48MP)
// 3. Use high quality image smoothing for resize
// 4. Output as JPEG with maximum quality
// =============================================================================

const MAX_IMAGE_DIMENSION = 4000; // Max width or height (keeps under Grok's 33MP limit)

/**
 * Convert HEIC to a browser-readable Blob using heic2any library.
 * Browser's Image() can't decode HEIC natively in JavaScript.
 */
async function convertHeicToBlob(file) {
    console.log('Decoding HEIC with heic2any library...');
    try {
        const blob = await heic2any({
            blob: file,
            toType: 'image/jpeg',
            quality: 1.0  // Maximum quality
        });
        // heic2any can return array of blobs for multi-image HEIC
        const result = Array.isArray(blob) ? blob[0] : blob;
        console.log(`HEIC decoded: ${(result.size / 1024).toFixed(1)}KB`);
        return result;
    } catch (error) {
        console.warn('HEIC conversion failed, trying fallback:', error);
        // Fallback: return original file (might work if browser supports HEIC)
        return file;
    }
}

/**
 * Resize image if too large (for Grok's 33MP limit).
 * Uses high quality image smoothing.
 */
async function resizeIfNeeded(blob, maxDimension = MAX_IMAGE_DIMENSION) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(blob);

        img.onload = () => {
            URL.revokeObjectURL(url);

            const { width, height } = img;
            const megapixels = (width * height / 1000000).toFixed(1);
            console.log(`Original image: ${width}x${height} (${megapixels}MP)`);

            // Check if resize needed
            if (width <= maxDimension && height <= maxDimension) {
                console.log('No resize needed');
                // Still convert to JPEG for consistency
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                canvas.toBlob(
                    (jpegBlob) => resolve(jpegBlob || blob),
                    'image/jpeg',
                    1.0
                );
                return;
            }

            // Calculate new dimensions (maintain aspect ratio)
            let newWidth, newHeight;
            if (width > height) {
                newWidth = maxDimension;
                newHeight = Math.round((height / width) * maxDimension);
            } else {
                newHeight = maxDimension;
                newWidth = Math.round((width / height) * maxDimension);
            }

            const newMegapixels = (newWidth * newHeight / 1000000).toFixed(1);
            console.log(`Resizing: ${width}x${height} → ${newWidth}x${newHeight} (${newMegapixels}MP)`);

            // Create canvas and draw with high quality settings
            const canvas = document.createElement('canvas');
            canvas.width = newWidth;
            canvas.height = newHeight;

            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, newWidth, newHeight);

            // Export as JPEG with maximum quality
            canvas.toBlob(
                (resizedBlob) => {
                    if (resizedBlob) {
                        console.log(`Resized: ${(resizedBlob.size / 1024).toFixed(1)}KB`);
                        resolve(resizedBlob);
                    } else {
                        reject(new Error('Failed to resize image'));
                    }
                },
                'image/jpeg',
                1.0  // Maximum quality
            );
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            console.error('Failed to load image for processing');
            reject(new Error('Failed to load image - may be corrupt or unsupported format'));
        };

        img.src = url;
    });
}

/**
 * Process image for optimal OCR:
 * 1. Decode HEIC if needed (using heic2any)
 * 2. Resize if too large
 * 3. Return as JPEG blob
 */
async function processImageForOcr(file) {
    console.log(`Processing: ${file.name} (${file.type}, ${(file.size / 1024).toFixed(1)}KB)`);

    const extension = file.name.split('.').pop().toLowerCase();
    const isHeic = extension === 'heic' || extension === 'heif' ||
        file.type === 'image/heic' || file.type === 'image/heif';

    let blob = file;

    // Step 1: Convert HEIC using proper library
    if (isHeic) {
        blob = await convertHeicToBlob(file);
    }

    // Step 2: Resize if too large & ensure JPEG output
    blob = await resizeIfNeeded(blob, MAX_IMAGE_DIMENSION);

    console.log(`Final image ready: ${(blob.size / 1024).toFixed(1)}KB JPEG`);
    return blob;
}

/**
 * Upload image to temporary storage and get a signed URL.
 * Image is processed for optimal OCR (HEIC decoded, resized if needed).
 * 
 * @param {File} file - Image file to upload
 * @param {string} userId - User ID for folder organization
 * @returns {Promise<{path: string, signedUrl: string}>}
 * @throws {Error} If upload or signed URL generation fails
 */
export async function uploadTempImage(file, userId) {
    // Process image for optimal OCR quality
    const jpegBlob = await processImageForOcr(file);

    // Create unique filename in user's temp folder
    const baseName = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
    const filename = `temp/${userId}/${Date.now()}_${baseName.replace(/[^a-zA-Z0-9.-]/g, '_')}.jpg`;

    console.log(`Uploading to Supabase Storage: ${filename}`);

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

    console.log(`Signed URL generated (2min expiry): ${signedData.signedUrl.substring(0, 80)}...`);

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

