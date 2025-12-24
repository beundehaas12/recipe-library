import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardClient from './dashboard-client';

export default async function DashboardPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/');

    // Fetch user profile and role
    const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

    // Fetch user role
    const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

    const role = roleData?.role as 'user' | 'author' | 'admin' | null;
    const isAdmin = role === 'admin';

    // Fetch user's recipes
    const { data: recipes } = await supabase
        .from('recipes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    // Fetch user's collections
    const { data: collections } = await supabase
        .from('collections')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    return (
        <DashboardClient
            user={user}
            profile={profile}
            role={role}
            isAdmin={isAdmin}
            initialRecipes={recipes ?? []}
            initialCollections={collections ?? []}
        />
    );
}
