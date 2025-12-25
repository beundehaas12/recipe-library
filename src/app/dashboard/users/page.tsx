import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import UsersClient from './users-client';

export default async function UsersPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/');

    // Check if user is admin
    const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

    const role = (roleData?.role as 'user' | 'author' | 'admin') ?? null;

    if (role !== 'admin') {
        redirect('/dashboard');
    }

    // Use admin client to bypass RLS for fetching all users
    const adminSupabase = createAdminClient();

    // Fetch all data - admin client bypasses RLS
    const [
        { data: profile },
        { data: userProfiles },
        { data: userRoles },
        { data: recipes },
        { data: collections },
        { data: authUsers },
        { data: waitlist }
    ] = await Promise.all([
        supabase.from('user_profiles').select('*').eq('user_id', user.id).single(),
        adminSupabase.from('user_profiles').select('*').order('created_at', { ascending: false }),
        adminSupabase.from('user_roles').select('*').order('created_at', { ascending: false }),
        supabase.from('recipes').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('collections').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        // Fetch auth users to get emails
        adminSupabase.auth.admin.listUsers(),
        // Fetch waitlist (using admin to bypass RLS)
        adminSupabase.from('waitlist').select('*').order('created_at', { ascending: false }),
    ]);

    // Create a map of user_id to email from auth users
    const emailMap = new Map<string, string>();
    authUsers?.users?.forEach(u => {
        if (u.email) {
            emailMap.set(u.id, u.email);
        }
    });

    // Combine user profiles with roles and emails
    const users = (userProfiles ?? []).map(profile => {
        const roleEntry = userRoles?.find(r => r.user_id === profile.user_id);
        return {
            ...profile,
            role: roleEntry?.role || 'user',
            email: emailMap.get(profile.user_id) || null
        };
    });

    return (
        <UsersClient
            user={user}
            profile={profile}
            role={role}
            users={users}
            recipes={recipes ?? []}
            collections={collections ?? []}
            waitlist={waitlist ?? []}
        />
    );
}
