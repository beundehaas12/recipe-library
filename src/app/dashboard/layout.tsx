import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

export default async function Layout({
    children,
}: {
    children: React.ReactNode;
}) {
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

    // Fetch pending waitlist count for admins
    let pendingWaitlistCount = 0;
    if (isAdmin) {
        const { count } = await supabase
            .from('early_access_requests')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending');
        pendingWaitlistCount = count || 0;
    }

    return (
        <DashboardLayout
            user={user}
            profile={profile}
            role={role}
            isAdmin={isAdmin}
            collections={collections ?? []}
            authorProfile={authorProfile}
            pendingWaitlistCount={pendingWaitlistCount}
        >
            {children}
        </DashboardLayout>
    );
}
