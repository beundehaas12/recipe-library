import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function SettingsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/');

    return (
        <div className="min-h-screen bg-background text-foreground">
            {/* Content Area - matches home-page structure */}
            <div className="relative z-20 pb-24 bg-background max-w-[1600px] mx-auto pt-32">
                <div className="px-4 lg:px-20">
                    <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight mb-4">Instellingen</h1>
                    <p className="text-muted-foreground mb-8">
                        Bewerk je profiel en voorkeuren.
                    </p>

                    <div className="space-y-6 max-w-[800px]">
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                            <h2 className="text-lg font-bold text-white mb-2">Account</h2>
                            <p className="text-sm text-muted-foreground">
                                E-mail: {user.email}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
