import { getRecipe } from '@/lib/data/recipes';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import RecipeDetailPage from './recipe-detail-page';
import MainLayout from '@/components/MainLayout';

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function Page({ params }: PageProps) {
    const { id } = await params;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Redirect to login if not authenticated
    if (!user) {
        redirect('/');
    }

    // Fetch recipe and user profile in parallel
    const [recipe, { data: profile }, { data: roleData }] = await Promise.all([
        getRecipe(id),
        supabase.from('user_profiles').select('*').eq('user_id', user.id).single(),
        supabase.from('user_roles').select('role').eq('user_id', user.id).single(),
    ]);

    const role = (roleData?.role as 'user' | 'author' | 'admin') ?? null;

    if (!recipe) {
        return (
            <MainLayout user={user} profile={profile} role={role}>
                <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
                    Recept niet gevonden
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout user={user} profile={profile} role={role}>
            <RecipeDetailPage recipe={recipe} />
        </MainLayout>
    );
}
