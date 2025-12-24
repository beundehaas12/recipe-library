import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function ProfilePage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/');

    // Fetch author profile
    const { data: authorProfile } = await supabase
        .from('author_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

    return (
        <div className="min-h-screen bg-black p-8">
            <div className="max-w-2xl mx-auto">
                <h1 className="text-3xl font-black text-white mb-4">Author Profile</h1>
                <p className="text-muted-foreground mb-8">
                    Manage your public author profile.
                </p>

                <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-white/60 mb-2">First Name</label>
                        <p className="text-white">{authorProfile?.first_name || '-'}</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-white/60 mb-2">Last Name</label>
                        <p className="text-white">{authorProfile?.last_name || '-'}</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-white/60 mb-2">Bio</label>
                        <p className="text-white">{authorProfile?.bio || '-'}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
