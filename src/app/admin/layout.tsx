import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';

export default async function Layout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

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

    // STRICT ADMIN CHECK - Non-admins cannot access
    if (role !== 'admin') {
        redirect('/');
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
