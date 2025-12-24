import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import MainLayout from '@/components/MainLayout';

export default async function ShoppingPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/');

    // Fetch profile and role
    const [{ data: profile }, { data: roleData }] = await Promise.all([
        supabase.from('user_profiles').select('*').eq('user_id', user.id).single(),
        supabase.from('user_roles').select('role').eq('user_id', user.id).single(),
    ]);
    const role = (roleData?.role as 'user' | 'author' | 'admin') ?? null;

    return (
        <MainLayout user={user} profile={profile} role={role}>
            <div className="min-h-screen bg-background p-8 pt-24">
                <div className="max-w-[1200px] mx-auto">
                    <h1 className="text-3xl font-black text-white mb-4">Boodschappen</h1>
                    <p className="text-muted-foreground">
                        Je boodschappenlijst gebaseerd op geplande recepten. (Coming soon)
                    </p>
                </div>
            </div>
        </MainLayout>
    );
}
