import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function ShoppingPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/');

    return (
        <div className="min-h-screen bg-background text-foreground">
            {/* Content Area - matches home-page structure */}
            <div className="relative z-20 pb-24 bg-background max-w-[1600px] mx-auto pt-32">
                <div className="px-4 lg:px-20">
                    <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight mb-4">Boodschappen</h1>
                    <p className="text-muted-foreground">
                        Je boodschappenlijst gebaseerd op geplande recepten. (Coming soon)
                    </p>
                </div>
            </div>
        </div>
    );
}
