import { getRecipes, getRecipesWithImages, getCollections } from '@/lib/data/recipes';
import { createClient } from '@/lib/supabase/server';
import HomePage from './home-page';
import LoginPage from './login-page';

export default async function Page() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // If not authenticated, show login with recipes that have images
  if (!user) {
    const [recipesWithImages, { data: siteContentData }] = await Promise.all([
      getRecipesWithImages(20),
      supabase
        .from('site_content')
        .select('*')
        .in('key', ['login_about', 'login_author']),
    ]);

    // Transform to keyed object
    const siteContent = siteContentData?.reduce((acc: Record<string, { title: string; subtitle?: string; content: Record<string, unknown> }>, item: { key: string; title: string; subtitle?: string; content: Record<string, unknown> }) => {
      acc[item.key] = item;
      return acc;
    }, {}) || {};

    return <LoginPage initialRecipes={recipesWithImages} siteContent={siteContent} />;
  }

  // Fetch recipes and collections for authenticated users
  const [recipes, collections] = await Promise.all([
    getRecipes(20),
    getCollections(),
  ]);

  // Fetch user profile and role
  const [{ data: profile }, { data: roleData }] = await Promise.all([
    supabase.from('user_profiles').select('*').eq('user_id', user.id).single(),
    supabase.from('user_roles').select('role').eq('user_id', user.id).single(),
  ]);

  const role = (roleData?.role as 'user' | 'author' | 'admin') ?? null;

  return (
    <HomePage
      initialRecipes={recipes}
      initialCollections={collections}
      user={user}
      profile={profile}
      role={role}
    />
  );
}
