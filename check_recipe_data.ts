
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRecipeData() {
    // Fetch one recipe that has ingredients/instructions
    const { data, error } = await supabase
        .from('recipes')
        .select('id, title, ingredients, instructions')
        .not('ingredients', 'is', null)
        .limit(1);

    if (error) {
        console.error('Error fetching recipe:', error);
        return;
    }

    if (data && data.length > 0) {
        console.log('Recipe found:', data[0].title);
        console.log('Ingredients type:', typeof data[0].ingredients, Array.isArray(data[0].ingredients));
        console.log('Ingredients sample:', JSON.stringify(data[0].ingredients, null, 2));
        console.log('Instructions type:', typeof data[0].instructions, Array.isArray(data[0].instructions));
        console.log('Instructions sample:', JSON.stringify(data[0].instructions, null, 2));
    } else {
        console.log('No recipes with ingredients found.');
    }
}

checkRecipeData();
