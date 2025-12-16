import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
    console.warn('Missing Gemini API Key. AI features will not work.')
}

// Initialize with a dummy key if missing to prevent immediate crash on import, 
// but calls will fail if key is not provided at runtime.
const genAI = new GoogleGenerativeAI(API_KEY || 'dummy_key');

const RECIPE_JSON_SCHEMA = `
    {
      "title": "Recipe Title",
      "description": "Brief description",
      "ingredients": [
        { "amount": 1, "unit": "cup", "item": "flour" }, 
        { "amount": 2, "unit": "tsp", "item": "sugar" }
      ],
      "instructions": ["Mix ingredients", "Bake at 350F"],
      "servings": 4, 
      "prepTime": "10 mins",
      "cookTime": "30 mins",
      "difficulty": "Easy/Medium/Hard",
      "cuisine": "Italian",
      "author": "Author Name",
      "cookbook_name": "Book Title",
      "isbn": "978-3-16-148410-0"
    }
    
    IMPORTANT for ingredients:
    - Attempt to separate quantity (number), unit (string), and item name.
    - If no unit exists (e.g. "2 eggs"), set unit to null or empty string.
    - If quantity is a range ("1-2"), use the average or the higher number as a number type if possible, or string if complicated. Preference is NUMBER for scaling.
    - "servings" should be a number, e.g., 4.

    If the content is not a recipe or is unreadable, return { "error": "Not a recipe" }.
    Ensure the JSON is valid and strictly follows this structure. Do not include markdown formatting like \`\`\`json.
`;

const modelsToTry = [
    "gemini-2.5-flash", // Explicitly requested
    "gemini-1.5-flash", // Fallback (stable)
    "gemini-2.0-flash"  // Experimental
];

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function runGemini(prompt, parts) {
    let lastError = null;

    // Safety settings to prevent blocking harmless content (like "killing" dough or "alcoholic" marinades)
    const safetySettings = [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
    ];

    for (const modelName of modelsToTry) {
        try {
            console.log(`Attempting to generate with model: ${modelName}`);
            const model = genAI.getGenerativeModel({ model: modelName, safetySettings });

            const result = await model.generateContent([prompt, ...parts]);
            const response = await result.response;
            const text = response.text();

            // Clean up potential markdown code blocks
            const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(jsonStr);

        } catch (error) {
            console.warn(`Model ${modelName} failed:`, error.message);
            lastError = error;

            // If rate limited (429), wait a bit before trying the next model
            if (error.message.includes('429') || error.message.includes('limit') || error.message.includes('quota')) {
                console.warn("Rate limit hit. Waiting 1s before trying next model...");
                await delay(1000);
            }
        }
    }
    console.error("All models failed coverage. Last error:", lastError);
    throw new Error(`AI Extraction Failed: ${lastError ? lastError.message : "Unknown error"}. Check API Key/Quotas.`);
}

/**
 * Extracts recipe data from an image file.
 * @param {File} imageFile 
 * @returns {Promise<Object>} Structured recipe data
 */
export async function extractRecipeFromImage(imageFile) {
    if (!API_KEY) throw new Error("Missing Gemini API Key");

    const base64Data = await fileToBase64(imageFile);
    // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
    const base64Content = base64Data.split(',')[1];

    const imagePart = {
        inlineData: {
            data: base64Content,
            mimeType: imageFile.type,
        },
    };

    const prompt = `
  Extract the recipe from the following image and return it as JSON.
  IMPORTANT: Return the content in ENGLISH, regardless of the source language.
  
  Follow this JSON schema:
  ${RECIPE_JSON_SCHEMA}
  `;
    return runGemini(prompt, [imagePart]);
}

/**
 * Extracts recipe data from text/html content.
 * @param {string} textContent 
 * @returns {Promise<Object>} Structured recipe data
 */
export async function extractRecipeFromText(textContent) {
    if (!API_KEY) throw new Error("Missing Gemini API Key");

    const prompt = `
    Analyze this text content. If it contains a recipe, extract the following information in JSON format: ${RECIPE_JSON_SCHEMA}
    IMPORTANT: Return the content in ENGLISH, regardless of the source language of the text.
    `;

    // Pass text as a part in the array (Gemini handles mixed content, but here just text)
    // Actually generateContent takes (prompt, ...parts). 
    // We can just append the text to the prompt or pass it as a second string arg.
    return runGemini(prompt + "\n\nTEXT CONTENT:\n" + textContent, []);
}


/**
 * Translates recipe content to target language.
 * @param {Object} recipeData 
 * @param {string} targetLang 'en' or 'nl'
 * @returns {Promise<Object>} Translated recipe data
 */
export async function translateRecipe(recipeData, targetLang) {
    if (!API_KEY) throw new Error("Missing Gemini API Key");

    // Don't translate if language matches (simplification: we assume source is mixed/english)
    // Actually, force translation to ensure it matches target.

    const prompt = `
    You are a professional translator. Translate the values of this recipe JSON object into ${targetLang === 'nl' ? 'DUTCH (Nederlands)' : 'ENGLISH'}.
    
    Rules:
    - Translate 'title', 'description', 'ingredients' (item, unit), 'instructions', 'difficulty', 'cuisine', 'prepTime', 'cookTime'.
    - Keep the structure EXACTLY the same.
    - Do NOT translate keys.
    - Return ONLY the valid JSON.
    `;

    // Convert recipe to string for the prompt, but exclude heavy fields if any (images are urls, so fine)
    const jsonStr = JSON.stringify(recipeData);

    return runGemini(prompt + "\n\nJSON TO TRANSLATE:\n" + jsonStr, []);
}


function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}
