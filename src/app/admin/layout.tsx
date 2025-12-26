import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
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

    // Fetch user profile
    const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

    // Fetch user role - CRITICAL SECURITY CHECK
    const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

    const role = roleData?.role as 'user' | 'author' | 'admin' | null;

    // STRICT ADMIN CHECK - Non-admins see access denied
    if (role !== 'admin') {
        return (
            <AccessDenied
                title="Geen toegang tot Admin"
                message="Het Admin Dashboard is alleen beschikbaar voor beheerders."
                requiredRole="Admin"
            />
        );
    }

    // Fetch pending waitlist count
    const { count: pendingWaitlistCount } = await supabase
        .from('waitlist')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

    return (
        <AdminLayout
            user={user}
            profile={profile}
            role={role}
            pendingWaitlistCount={pendingWaitlistCount || 0}
        >
            {children}
        </AdminLayout>
    );
}
