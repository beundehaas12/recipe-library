import { getRecipe } from '@/lib/data/recipes';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import RecipeDetailPage from './recipe-detail-page';

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

    // Fetch recipe
    const recipe = await getRecipe(id);

    if (!recipe) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
                Recept niet gevonden
            </div>
        );
    }

    return (
        <RecipeDetailPage recipe={recipe} />
    );
}
