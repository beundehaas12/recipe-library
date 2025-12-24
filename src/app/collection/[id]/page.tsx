import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import CollectionDetailPage from './collection-detail-page';
import type { Recipe, AuthorProfile } from '@/types/database';

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

    // Fetch collection with recipes
    const { data: collection, error } = await supabase
        .from('collections')
        .select(`
              *,
              recipe_collections (
                recipe:recipes (*)
              )
            `)
        .eq('id', id)
        .single();

    if (error || !collection) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
                Collectie niet gevonden
            </div>
        );
    }

    // Extract recipes from the junction table
    const rawRecipes = collection.recipe_collections
        ?.map((rc: { recipe: Recipe | null }) => rc.recipe)
        .filter((r: Recipe | null): r is Recipe => r !== null) ?? [];

    // Fetch author profiles for all recipes in this collection
    const userIds = [...new Set(rawRecipes.map((r: Recipe) => r.user_id).filter(Boolean))];
    let profileMap: Record<string, AuthorProfile> = {};

    if (userIds.length > 0) {
        const { data: authorProfiles } = await supabase
            .from('author_profiles')
            .select('user_id, first_name, last_name, avatar_url')
            .in('user_id', userIds);

        profileMap = (authorProfiles ?? []).reduce((acc, p) => {
            acc[p.user_id] = p;
            return acc;
        }, {} as Record<string, AuthorProfile>);
    }

    // Attach author profiles to recipes
    const recipes = rawRecipes.map((r: Recipe) => ({
        ...r,
        author_profile: profileMap[r.user_id] ?? null,
    }));

    return (
        <CollectionDetailPage collection={collection} recipes={recipes} />
    );
}
