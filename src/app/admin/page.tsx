import { createClient } from '@/lib/supabase/server';
import AdminOverview from './admin-overview';

export default async function AdminPage() {
    const supabase = await createClient();

    // Fetch system stats
    const [
        { count: totalUsers },
        { count: totalRecipes },
        { count: totalCollections },
        { count: pendingWaitlist },
        { count: totalAuthors },
    ] = await Promise.all([
        supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
        supabase.from('recipes').select('*', { count: 'exact', head: true }),
        supabase.from('collections').select('*', { count: 'exact', head: true }),
        supabase.from('waitlist').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('user_roles').select('*', { count: 'exact', head: true }).eq('role', 'author'),
    ]);

    const stats = {
        totalUsers: totalUsers || 0,
        totalRecipes: totalRecipes || 0,
        totalCollections: totalCollections || 0,
        pendingWaitlist: pendingWaitlist || 0,
        totalAuthors: totalAuthors || 0,
    };

    return <AdminOverview stats={stats} />;
}
