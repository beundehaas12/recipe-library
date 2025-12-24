import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function PlanningPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/');

    return (
        <div className="min-h-screen bg-background p-8 pt-24">
            <div className="max-w-[1200px] mx-auto">
                <h1 className="text-3xl font-black text-white mb-4">Planning</h1>
                <p className="text-muted-foreground">
                    Weekplanning voor je maaltijden. (Coming soon)
                </p>
            </div>
        </div>
    );
}
