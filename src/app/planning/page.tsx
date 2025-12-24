import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function PlanningPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/');

    return (
        <div className="min-h-screen bg-background pt-24 pb-12">
            <div className="px-0 md:px-4 lg:px-20">
                <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight mb-4">Planning</h1>
                <p className="text-muted-foreground">
                    Weekplanning voor je maaltijden. (Coming soon)
                </p>
            </div>
        </div>
    );
}
