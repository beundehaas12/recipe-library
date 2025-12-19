/**
 * HTML Parser for Recipe Extraction
 * 
 * Extracts clean, structured recipe content from raw HTML.
 * Prioritizes Schema.org JSON-LD data, falls back to cleaned text.
 * 
 * @module htmlParser
 */

/**
 * Extract Schema.org Recipe JSON-LD from HTML if available.
 * Most modern recipe sites use this structured data format.
 * 
 * @param {string} html - Raw HTML content
 * @returns {Object|null} Parsed recipe schema or null
 */
export function extractSchemaRecipe(html) {
    try {
        // Find all JSON-LD script tags
        const jsonLdMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);

        if (!jsonLdMatches) return null;

        for (const match of jsonLdMatches) {
            try {
                // Extract JSON content from script tag
                const jsonContent = match.replace(/<script[^>]*>|<\/script>/gi, '').trim();
                const parsed = JSON.parse(jsonContent);

                // Handle @graph arrays (common in WordPress sites)
                if (parsed['@graph']) {
                    const recipe = parsed['@graph'].find(item =>
                        item['@type'] === 'Recipe' ||
                        (Array.isArray(item['@type']) && item['@type'].includes('Recipe'))
                    );
                    if (recipe) return recipe;
                }

                // Direct Recipe type
                if (parsed['@type'] === 'Recipe') {
                    return parsed;
                }

                // Array of items
                if (Array.isArray(parsed)) {
                    const recipe = parsed.find(item => item['@type'] === 'Recipe');
                    if (recipe) return recipe;
                }
            } catch (e) {
                // Invalid JSON, try next match
                continue;
            }
        }
        return null;
    } catch (e) {
        console.warn('Schema extraction failed:', e);
        return null;
    }
}

/**
 * Convert Schema.org recipe to our format for direct use.
 * This bypasses AI entirely if schema data is complete.
 * 
 * @param {Object} schema - Schema.org Recipe object
 * @returns {Object|null} Formatted recipe or null if incomplete
 */
export function schemaToRecipe(schema) {
    if (!schema || !schema.name) return null;

    // Parse duration strings like "PT30M", "PT1H30M", or "P0DT0H20M"
    const parseDuration = (isoDuration) => {
        if (!isoDuration) return null;

        // Handle full ISO 8601 duration: P[n]DT[n]H[n]M[n]S
        // Examples: PT30M, PT1H30M, P0DT0H20M, P1DT2H30M
        const match = isoDuration.match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        if (!match) return isoDuration; // Return as-is if not ISO format

        const days = parseInt(match[1] || 0);
        const hours = parseInt(match[2] || 0);
        const minutes = parseInt(match[3] || 0);

        // Build readable string
        const parts = [];
        if (days) parts.push(`${days} dag${days > 1 ? 'en' : ''}`);
        if (hours) parts.push(`${hours} uur`);
        if (minutes) parts.push(`${minutes} min`);

        return parts.length > 0 ? parts.join(' ') : null;
    };

    // Parse ingredients - use `name` field for new schema
    const parseIngredients = (ingredients) => {
        if (!ingredients) return [];
        return ingredients.map((ing, idx) => {
            if (typeof ing === 'string') {
                // Try to parse "2 cups flour" format
                const match = ing.match(/^([\d.,\/]+)?\s*(\w+)?\s+(.+)$/);
                if (match) {
                    return {
                        amount: match[1] ? parseFloat(match[1].replace(',', '.')) : null,
                        unit: match[2] || null,
                        name: match[3],
                        group_name: null,
                        notes: null,
                        order_index: idx
                    };
                }
                return { amount: null, unit: null, name: ing, group_name: null, notes: null, order_index: idx };
            }
            return { amount: null, unit: null, name: String(ing), group_name: null, notes: null, order_index: idx };
        });
    };

    // Parse instructions - return structured objects for new schema
    const parseInstructions = (instructions) => {
        if (!instructions) return [];
        return instructions.map((step, idx) => {
            let description = '';
            if (typeof step === 'string') {
                description = step;
            } else if (step.text) {
                description = step.text;
            } else if (step.name) {
                description = step.name;
            } else {
                description = String(step);
            }
            return {
                step_number: idx + 1,
                description,
                extra: null
            };
        }).filter(s => s.description);
    };

    return {
        title: schema.name,
        description: schema.description || '',
        ingredients: parseIngredients(schema.recipeIngredient),
        instructions: parseInstructions(schema.recipeInstructions),
        tools: [],  // Schema.org doesn't typically have this
        servings: parseInt(schema.recipeYield) || null,
        prep_time: parseDuration(schema.prepTime),
        cook_time: parseDuration(schema.cookTime),
        difficulty: null, // Schema doesn't have this
        cuisine: schema.recipeCuisine || null,
        author: typeof schema.author === 'string' ? schema.author : schema.author?.name || null,
        cookbook_name: null,
        isbn: null,
        source_language: 'en',
        ai_tags: schema.keywords ?
            (typeof schema.keywords === 'string' ? schema.keywords.split(',').map(k => k.trim()) : schema.keywords)
            : [],
        extra_data: {}
    };
}

/**
 * Clean HTML content for AI processing.
 * Removes scripts, styles, navigation, ads, and extracts main content.
 * 
 * @param {string} html - Raw HTML content
 * @returns {string} Cleaned text content
 */
export function cleanHtmlForAI(html) {
    let cleaned = html;

    // Remove script and style tags with content
    cleaned = cleaned.replace(/<script[\s\S]*?<\/script>/gi, '');
    cleaned = cleaned.replace(/<style[\s\S]*?<\/style>/gi, '');
    cleaned = cleaned.replace(/<noscript[\s\S]*?<\/noscript>/gi, '');

    // Remove common non-content elements
    cleaned = cleaned.replace(/<header[\s\S]*?<\/header>/gi, '');
    cleaned = cleaned.replace(/<footer[\s\S]*?<\/footer>/gi, '');
    cleaned = cleaned.replace(/<nav[\s\S]*?<\/nav>/gi, '');
    cleaned = cleaned.replace(/<aside[\s\S]*?<\/aside>/gi, '');
    cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');

    // Remove common ad/tracking divs by class/id patterns
    cleaned = cleaned.replace(/<div[^>]*(?:class|id)=["'][^"']*(?:ad-|ads-|advertisement|sponsor|tracking|cookie|popup|modal|sidebar|comment|share|social)[^"']*["'][^>]*>[\s\S]*?<\/div>/gi, '');

    // Try to extract main content area
    const mainMatch = cleaned.match(/<main[\s\S]*?<\/main>/i) ||
        cleaned.match(/<article[\s\S]*?<\/article>/i) ||
        cleaned.match(/<div[^>]*class=["'][^"']*(?:recipe|content|post)[^"']*["'][^>]*>[\s\S]*?<\/div>/i);

    if (mainMatch) {
        cleaned = mainMatch[0];
    }

    // Convert common elements to readable text
    cleaned = cleaned.replace(/<br\s*\/?>/gi, '\n');
    cleaned = cleaned.replace(/<\/p>/gi, '\n\n');
    cleaned = cleaned.replace(/<\/li>/gi, '\n');
    cleaned = cleaned.replace(/<\/h[1-6]>/gi, '\n\n');
    cleaned = cleaned.replace(/<\/tr>/gi, '\n');
    cleaned = cleaned.replace(/<\/td>/gi, ' | ');

    // Remove all remaining HTML tags
    cleaned = cleaned.replace(/<[^>]+>/g, ' ');

    // Decode HTML entities
    cleaned = cleaned.replace(/&nbsp;/g, ' ');
    cleaned = cleaned.replace(/&amp;/g, '&');
    cleaned = cleaned.replace(/&lt;/g, '<');
    cleaned = cleaned.replace(/&gt;/g, '>');
    cleaned = cleaned.replace(/&quot;/g, '"');
    cleaned = cleaned.replace(/&#(\d+);/g, (_, num) => String.fromCharCode(num));

    // Clean up whitespace
    cleaned = cleaned.replace(/\s+/g, ' ');
    cleaned = cleaned.replace(/\n\s*\n/g, '\n\n');
    cleaned = cleaned.trim();

    return cleaned;
}

/**
 * Process HTML and return the best content for recipe extraction.
 * Returns structured schema data if available, otherwise cleaned text.
 * 
 * @param {string} html - Raw HTML content
 * @returns {{type: 'schema'|'text', data: Object|string, schemaRecipe?: Object}}
 */
export function processHtmlForRecipe(html) {
    // First try to extract Schema.org recipe data
    const schemaData = extractSchemaRecipe(html);

    if (schemaData) {
        // Convert to our format
        const recipe = schemaToRecipe(schemaData);

        // Check if schema has enough data to skip AI
        const hasEssentials = recipe &&
            recipe.title &&
            recipe.ingredients?.length > 0 &&
            recipe.instructions?.length > 0;

        if (hasEssentials) {
            return {
                type: 'schema',
                data: recipe,
                schemaRecipe: schemaData
            };
        }

        // Schema exists but incomplete - include it as context for AI
        return {
            type: 'text',
            data: `STRUCTURED DATA FOUND:\n${JSON.stringify(schemaData, null, 2)}\n\nPAGE CONTENT:\n${cleanHtmlForAI(html).substring(0, 50000)}`,
            schemaRecipe: schemaData
        };
    }

    // No schema - return cleaned text
    return {
        type: 'text',
        data: cleanHtmlForAI(html).substring(0, 50000)
    };
}

/**
 * Extract recipe-relevant images from HTML.
 * Prioritizes Schema.org image, then content images.
 * Filters out icons, logos, tracking pixels.
 * 
 * @param {string} html - Raw HTML content
 * @param {string} baseUrl - Base URL for resolving relative paths
 * @returns {string[]} Array of absolute image URLs
 */
export function extractImagesFromHtml(html, baseUrl) {
    const images = new Set();

    // 1. First try Schema.org image (highest priority)
    const schema = extractSchemaRecipe(html);
    if (schema?.image) {
        const schemaImages = Array.isArray(schema.image) ? schema.image : [schema.image];
        for (const img of schemaImages) {
            const url = typeof img === 'string' ? img : img?.url;
            if (url) images.add(url);
        }
    }

    // 2. Look for Open Graph image (og:image)
    const ogMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
    if (ogMatch?.[1]) {
        images.add(ogMatch[1]);
    }

    // 3. Extract all img tags
    const imgMatches = html.matchAll(/<img[^>]*src=["']([^"']+)["'][^>]*>/gi);
    for (const match of imgMatches) {
        let src = match[1];

        // Skip common non-recipe images
        if (
            src.includes('data:image') ||
            src.includes('pixel') ||
            src.includes('tracking') ||
            src.includes('avatar') ||
            src.includes('logo') ||
            src.includes('icon') ||
            src.includes('share') ||
            src.includes('button') ||
            src.includes('ad-') ||
            src.includes('sponsor') ||
            src.includes('gravatar') ||
            src.includes('emoji') ||
            src.includes('.svg') ||
            src.includes('.gif') ||
            src.match(/\/\d+x\d+\./) // size indicators like /1x1.
        ) {
            continue;
        }

        // Resolve relative URLs
        if (!src.startsWith('http')) {
            try {
                src = new URL(src, baseUrl).href;
            } catch {
                continue;
            }
        }

        images.add(src);
    }

    // 4. Also check srcset for high-res versions
    const srcsetMatches = html.matchAll(/srcset=["']([^"']+)["']/gi);
    for (const match of srcsetMatches) {
        const srcset = match[1];
        // Parse srcset - format: "url1 1x, url2 2x" or "url1 300w, url2 600w"
        const parts = srcset.split(',').map(s => s.trim().split(/\s+/)[0]);
        for (let src of parts) {
            if (src.includes('data:image') || src.includes('.svg')) continue;

            if (!src.startsWith('http')) {
                try {
                    src = new URL(src, baseUrl).href;
                } catch {
                    continue;
                }
            }
            images.add(src);
        }
    }

    // Return as array, limit to 12 images max
    return Array.from(images).slice(0, 12);
}
