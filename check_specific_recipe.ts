import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load .env.local manually since tsx doesn't do it automatically
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            process.env[key.trim()] = value.trim();
        }
    });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
console.log('URL:', supabaseUrl ? 'Found' : 'Missing');
console.log('Key:', supabaseKey ? 'Found' : 'Missing');

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function checkSpecificRecipe() {
    const id = '607a6928-3a5d-4525-939e-86f8f6f45afc';
    const { data, error } = await supabase
        .from('recipes')
        .select('id, title, ingredients, instructions')
        .eq('id', id)
        .single();

    if (error) {
        console.error('Error fetching recipe:', error);
        return;
    }

    if (data) {
        console.log('Recipe title:', data.title);
        console.log('Ingredients raw:', JSON.stringify(data.ingredients, null, 2));
        console.log('Instructions raw:', JSON.stringify(data.instructions, null, 2));
        console.log('Ingredients type:', typeof data.ingredients, Array.isArray(data.ingredients));
        console.log('Instructions type:', typeof data.instructions, Array.isArray(data.instructions));
    } else {
        console.log('Recipe not found');
    }
}

checkSpecificRecipe();
