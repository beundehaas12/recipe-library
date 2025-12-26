import { getRecipe } from '@/lib/data/recipes';
import { notFound } from 'next/navigation';
import RecipeDetailPage from './recipe-detail-page';

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function Page({ params }: PageProps) {
    const { id } = await params;
    const recipe = await getRecipe(id);

    if (!recipe) {
        notFound();
    }

    return (
        <RecipeDetailPage recipe={recipe} />
    );
}
