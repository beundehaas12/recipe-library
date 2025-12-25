import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import ProfileClient from './profile-client';

export default async function ProfilePage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/');

    // Fetch user profile
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

    // Fetch author profile
    const { data: authorProfile } = await supabase
        .from('author_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

    // Fetch collections (needed for sidebar)
    const { data: collections } = await supabase
        .from('collections')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    return (
        <ProfileClient
            user={user}
            profile={profile}
            role={role}
            collections={collections || []}
            authorProfile={authorProfile}
        />
    );
}
