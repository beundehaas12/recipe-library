import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function SettingsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/');

    return (
        <div className="min-h-screen bg-background p-8 pt-24">
            <div className="max-w-[800px] mx-auto">
                <h1 className="text-3xl font-black text-white mb-4">Instellingen</h1>
                <p className="text-muted-foreground mb-8">
                    Bewerk je profiel en voorkeuren.
                </p>

                <div className="space-y-6">
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                        <h2 className="text-lg font-bold text-white mb-2">Account</h2>
                        <p className="text-sm text-muted-foreground">
                            E-mail: {user.email}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
