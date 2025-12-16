import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
    console.warn('Missing Gemini API Key. AI features will not work.')
}

const genAI = new GoogleGenerativeAI(API_KEY || 'dummy_key');

const RECIPE_JSON_SCHEMA = `
    {
      "title": "Recipe Title (in original language)",
      "description": "Brief description (in original language)",
      "ingredients": [
        { "amount": 1, "unit": "cup", "item": "flour" }, 
        { "amount": 2, "unit": "tsp", "item": "sugar" }
      ],
      "instructions": ["Step 1...", "Step 2..."],
      "servings": 4, 
      "prepTime": "10 mins",
      "cookTime": "30 mins",
      "difficulty": "Easy/Medium/Hard",
      "cuisine": "Italian",
      "author": "Author Name",
      "cookbook_name": "Book Title",
      "isbn": "978-3-16-148410-0",
      "source_language": "nl/en/de/fr/es/it (ISO 639-1 code)",
      "ai_tags": ["tag1", "tag2", "tag3", "...10-15 descriptive tags for search"]
    }
    
    IMPORTANT RULES:
    - PRESERVE THE ORIGINAL LANGUAGE of the recipe. Do NOT translate.
    - Detect and return the source_language as ISO 639-1 code (nl, en, de, fr, es, it, etc.)
    - Generate 10-15 ai_tags in DUTCH that describe: dish type, main ingredients, cooking method, dietary info, occasion, season, difficulty, cuisine origin, flavor profile, etc.
    - For ingredients: separate quantity (number), unit (string), and item name.
    - If no unit exists (e.g. "2 eggs"), set unit to null or empty string.
    - "servings" should be a number, e.g., 4.

    If the content is not a recipe or is unreadable, return { "error": "Not a recipe" }.
    Ensure the JSON is valid. Do not include markdown formatting like \`\`\`json.
`;

const modelsToTry = [
    "gemini-2.5-flash",
    "gemini-1.5-flash",
    "gemini-2.0-flash"
];

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function runGemini(prompt, parts) {
    let lastError = null;

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

            if (error.message.includes('429') || error.message.includes('limit') || error.message.includes('quota')) {
                console.warn("Rate limit hit. Waiting 1s before trying next model...");
                await delay(1000);
            }
        }
    }
    console.error("All models failed. Last error:", lastError);
    throw new Error(`AI Extraction Failed: ${lastError ? lastError.message : "Unknown error"}. Check API Key/Quotas.`);
}

/**
 * Extracts recipe data from an image file.
 * Preserves original language and generates Dutch AI tags for search.
 * @param {File} imageFile 
 * @returns {Promise<Object>} Structured recipe data with source_language and ai_tags
 */
export async function extractRecipeFromImage(imageFile) {
    if (!API_KEY) throw new Error("Missing Gemini API Key");

    const base64Data = await fileToBase64(imageFile);
    const base64Content = base64Data.split(',')[1];

    const imagePart = {
        inlineData: {
            data: base64Content,
            mimeType: imageFile.type,
        },
    };

    const prompt = `
Extract the recipe from the following image and return it as JSON.

CRITICAL INSTRUCTIONS:
1. PRESERVE THE ORIGINAL LANGUAGE of the recipe text. Do NOT translate the recipe content.
2. Detect the source language and include it as "source_language" (ISO 639-1 code like "nl", "en", "de", etc.)
3. Generate 10-15 "ai_tags" IN DUTCH that describe the dish for search purposes. Tags should cover: dish type, main ingredients, cooking method, dietary restrictions, meal type, cuisine, season, occasion, flavor profile, texture, etc.

Follow this JSON schema:
${RECIPE_JSON_SCHEMA}
  `;
    return runGemini(prompt, [imagePart]);
}

/**
 * Extracts recipe data from text/html content.
 * Preserves original language and generates Dutch AI tags for search.
 * @param {string} textContent 
 * @returns {Promise<Object>} Structured recipe data with source_language and ai_tags
 */
export async function extractRecipeFromText(textContent) {
    if (!API_KEY) throw new Error("Missing Gemini API Key");

    const prompt = `
Analyze this text content. If it contains a recipe, extract it as JSON.

CRITICAL INSTRUCTIONS:
1. PRESERVE THE ORIGINAL LANGUAGE of the recipe text. Do NOT translate the recipe content.
2. Detect the source language and include it as "source_language" (ISO 639-1 code like "nl", "en", "de", etc.)
3. Generate 10-15 "ai_tags" IN DUTCH that describe the dish for search purposes. Tags should cover: dish type, main ingredients, cooking method, dietary restrictions, meal type, cuisine, season, occasion, flavor profile, texture, etc.

Follow this JSON schema:
${RECIPE_JSON_SCHEMA}

TEXT CONTENT:
${textContent}
    `;

    return runGemini(prompt, []);
}


function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}
