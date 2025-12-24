import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function ShoppingPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/');

    return (
        <div className="min-h-screen bg-background p-8 pt-24">
            <div className="max-w-[1200px] mx-auto">
                <h1 className="text-3xl font-black text-white mb-4">Boodschappen</h1>
                <p className="text-muted-foreground">
                    Je boodschappenlijst gebaseerd op geplande recepten. (Coming soon)
                </p>
            </div>
        </div>
    );
}
