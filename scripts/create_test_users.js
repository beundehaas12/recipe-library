import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Load credentials from .env.local manually
const envPath = path.resolve(__dirname, '../.env.local');
let supabaseUrl = process.env.VITE_SUPABASE_URL;
let supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            if (key.trim() === 'VITE_SUPABASE_URL') supabaseUrl = value.trim();
            if (key.trim() === 'VITE_SUPABASE_ANON_KEY') supabaseKey = value.trim();
        }
    });
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Use fresh emails to avoid conflicts
const TEST_USERS = [
    { email: 'author1@test.com', password: 'test123', role: 'author' },
    { email: 'author2@test.com', password: 'test123', role: 'author' },
    { email: 'author3@test.com', password: 'test123', role: 'author' }
];

async function createUsers() {
    console.log('Creating test users (2nd attempt)...');

    for (const user of TEST_USERS) {
        console.log(`Processing ${user.email}...`);

        // 1. Sign Up
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: user.email,
            password: user.password
        });

        if (authError) {
            console.error(`Error creating ${user.email}:`, authError.message);

            // If error persists, try to login as backup
            console.log(`Attempting login for ${user.email}...`);
            const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
                email: user.email,
                password: user.password
            });

            if (loginError) {
                console.error(`Could not login:`, loginError.message);
                continue;
            }

            var userId = loginData.user.id;
        } else {
            var userId = authData?.user?.id;
        }

        if (userId) {
            console.log(`User ID: ${userId}`);

            // 2. Assign Role
            const { error: roleError } = await supabase
                .from('user_roles')
                .upsert({
                    user_id: userId,
                    role: user.role
                }, { onConflict: 'user_id' });

            if (roleError) {
                console.error(`Error assigning role to ${user.email}:`, roleError.message);
            } else {
                console.log(`Successfully assigned role '${user.role}' to ${user.email}`);
            }
        }
    }
}

createUsers();
