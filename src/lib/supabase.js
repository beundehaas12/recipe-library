import { createClient } from '@supabase/supabase-js'
import heic2any from 'heic2any'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// IMPORTANT: Capture the hash BEFORE Supabase client processes it
// Supabase with detectSessionInUrl: true will clear the hash immediately
export const initialUrlHash = typeof window !== 'undefined' ? window.location.hash : '';
export const isInviteFlow = initialUrlHash.includes('type=invite') ||
    initialUrlHash.includes('type=recovery') ||
    initialUrlHash.includes('type=magiclink');

if (isInviteFlow) {
    console.log('[supabase.js] Captured invite hash before processing:', initialUrlHash);
}

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
 * Upload image to source storage permanently.
 * Used when a recipe is added via photo to keep the source for reference.
 * 
 * @param {File} file - Image file to upload
 * @param {string} userId - User ID for folder organization
 * @returns {Promise<{path: string, publicUrl: string, signedUrl: string}>}
 */
export async function uploadSourceImage(file, userId) {
    // Process image for optimal quality
    const jpegBlob = await processImageForOcr(file);

    // Create unique filename in user's sources folder (no temp prefix)
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    const filename = `sources/${userId}/${Date.now()}_${baseName.replace(/[^a-zA-Z0-9.-]/g, '_')}.jpg`;

    console.log(`Uploading source image: ${filename}`);

    const { error: uploadError } = await supabase.storage
        .from('recipe-images')
        .upload(filename, jpegBlob, {
            contentType: 'image/jpeg',
            upsert: false
        });

    if (uploadError) throw new Error(`Source upload failed: ${uploadError.message}`);

    // Get Public URL
    const { data: { publicUrl } } = supabase.storage
        .from('recipe-images')
        .getPublicUrl(filename);

    // Also generate a signed URL for immediate use if needed (2min expiry)
    const { data: signedData, error: signedError } = await supabase.storage
        .from('recipe-images')
        .createSignedUrl(filename, 120);

    return {
        path: filename,
        publicUrl,
        signedUrl: signedData?.signedUrl || publicUrl
    };
}

/**
 * Upload an external image URL to Supabase storage.
 * Fetches the image, processes it, and stores permanently.
 * 
 * @param {string} imageUrl - External image URL to download and store
 * @param {string} userId - User ID for folder organization
 * @returns {Promise<{path: string, publicUrl: string}>}
 */
export async function uploadExternalImage(imageUrl, userId) {
    console.log(`Fetching external image: ${imageUrl.substring(0, 80)}...`);

    // Fetch the image
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`);

    const blob = await response.blob();

    // Convert to File for processing
    const file = new File([blob], 'external_image.jpg', { type: blob.type || 'image/jpeg' });

    // Process and resize if needed
    const processedBlob = await resizeIfNeeded(blob, MAX_IMAGE_DIMENSION);

    // Create unique filename
    const filename = `sources/${userId}/${Date.now()}_external.jpg`;

    console.log(`Uploading external image: ${filename}`);

    const { error: uploadError } = await supabase.storage
        .from('recipe-images')
        .upload(filename, processedBlob, {
            contentType: 'image/jpeg',
            upsert: false
        });

    if (uploadError) throw new Error(`External image upload failed: ${uploadError.message}`);

    // Get Public URL
    const { data: { publicUrl } } = supabase.storage
        .from('recipe-images')
        .getPublicUrl(filename);

    console.log(`External image stored: ${publicUrl}`);

    return {
        path: filename,
        publicUrl
    };
}

/**
 * Delete an image from storage using its public URL.
 * Automatically extracts the storage path from the URL.
 * 
 * @param {string} url - Public URL of the image to delete
 * @returns {Promise<void>}
 */
export async function deleteImageByUrl(url) {
    if (!url) return;

    try {
        // Supabase public URL format: .../storage/v1/object/public/[bucket]/[path]
        const bucketMatch = url.match(/\/public\/([^\/]+)\/(.*)$/);
        if (!bucketMatch) {
            console.warn('Could not parse Supabase URL for deletion:', url);
            return;
        }

        const bucket = bucketMatch[1];
        const path = bucketMatch[2];

        console.log(`Deleting from ${bucket}: ${path}`);
        const { error } = await supabase.storage
            .from(bucket)
            .remove([path]);

        if (error) {
            console.warn(`Failed to delete image at ${path}:`, error);
        }
    } catch (e) {
        console.warn('Error in deleteImageByUrl:', e);
    }
}
