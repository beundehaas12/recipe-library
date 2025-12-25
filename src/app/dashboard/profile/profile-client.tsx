'use client';

import { useState } from 'react';
import type { User } from '@supabase/supabase-js';
import type { UserProfile, Collection } from '@/types/database';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { UserCircle } from 'lucide-react';

interface ProfileClientProps {
    user: User;
    profile: UserProfile | null;
    role: 'user' | 'author' | 'admin' | null;
    collections: Collection[];
    authorProfile: any; // Using any for now to avoid extensive type imports, clean up later
}

export default function ProfileClient({
    user,
    profile,
    role,
    collections,
    authorProfile
}: ProfileClientProps) {
    const [activeFilter, setActiveFilter] = useState('profile');
    const [theme, setTheme] = useState<'dark' | 'light'>('light');

    // Theme helpers
    const textPrimary = theme === 'light' ? 'text-zinc-900' : 'text-white';
    const textSecondary = theme === 'light' ? 'text-zinc-500' : 'text-muted-foreground';
    const borderClass = theme === 'light' ? 'border-zinc-200' : 'border-white/10';
    const cardClass = theme === 'light' ? 'bg-white border-zinc-200 shadow-sm' : 'bg-zinc-900 border-white/10';
    const labelClass = theme === 'light' ? 'text-zinc-500' : 'text-white/60';

    return (
        <DashboardLayout
            user={user}
            profile={profile}
            role={role}
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            collections={collections}
            isAdmin={role === 'admin'}
            currentTheme={theme}
            onThemeToggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
            <div className="w-full max-w-4xl">
                <div className="flex items-center gap-3 mb-8">
                    <div>
                        <h1 className={`text-3xl font-bold ${textPrimary}`}>Author Profile</h1>
                        <p className={textSecondary}>
                            Manage your public author profile.
                        </p>
                    </div>
                </div>

                <div className={`border rounded-2xl p-6 space-y-6 ${cardClass}`}>
                    <div>
                        <label className={`block text-sm font-medium mb-2 ${labelClass}`}>First Name</label>
                        <p className={`text-lg font-medium ${textPrimary}`}>{authorProfile?.first_name || '-'}</p>
                    </div>

                    <div>
                        <label className={`block text-sm font-medium mb-2 ${labelClass}`}>Last Name</label>
                        <p className={`text-lg font-medium ${textPrimary}`}>{authorProfile?.last_name || '-'}</p>
                    </div>

                    <div>
                        <label className={`block text-sm font-medium mb-2 ${labelClass}`}>Bio</label>
                        <p className={`text-lg ${textPrimary}`}>{authorProfile?.bio || '-'}</p>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
