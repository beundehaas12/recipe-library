import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import AccessDenied from '@/components/AccessDenied';

export default async function Layout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Not logged in - redirect to login
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

    // Only authors and admins can access the dashboard
    if (role !== 'author' && role !== 'admin') {
        return (
            <AccessDenied
                title="Geen toegang tot Dashboard"
                message="Het Auteurs Dashboard is alleen beschikbaar voor auteurs en beheerders."
                requiredRole="Auteur of Admin"
            />
        );
    }

    // Fetch user's collections
    const { data: collections } = await supabase
        .from('collections')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    // Fetch author profile
    const { data: authorProfile } = await supabase
        .from('author_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

    return (
        <DashboardLayout
            user={user}
            profile={profile}
            role={role}
            collections={collections ?? []}
            authorProfile={authorProfile}
        >
            {children}
        </DashboardLayout>
    );
}
