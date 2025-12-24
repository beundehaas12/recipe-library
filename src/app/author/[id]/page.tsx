import { getAuthorProfile, getAuthorRecipes, getAuthorCollections } from '@/lib/data/authors';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AuthorProfilePage from './author-profile-page';

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

    // Fetch author profile and content
    const [profile, recipes, collections] = await Promise.all([
        getAuthorProfile(id),
        getAuthorRecipes(id),
        getAuthorCollections(id),
    ]);

    if (!profile) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
                Author niet gevonden
            </div>
        );
    }

    return (
        <AuthorProfilePage
            profile={profile}
            recipes={recipes}
            collections={collections}
        />
    );
}
