import { getRecipes, getCollections } from '@/lib/data/recipes';
import { createClient } from '@/lib/supabase/server';
import HomePage from './home-page';
import LoginPage from './login-page';

export default async function Page() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch recipes for both login (display) and home page
  const [recipes, collections] = await Promise.all([
    getRecipes(20),
    getCollections(),
  ]);

  // If not authenticated, show login with recipes for display
  if (!user) {
    return <LoginPage initialRecipes={recipes} />;
  }

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
