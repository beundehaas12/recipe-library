'use client';

import type { User } from '@supabase/supabase-js';
import type { UserProfile } from '@/types/database';
import AppHeader from '@/components/AppHeader';
import FloatingMenu from '@/components/FloatingMenu';

interface MainLayoutProps {
    children: React.ReactNode;
    user: User;
    profile?: UserProfile | null;
    role?: 'user' | 'author' | 'admin' | null;
}

export default function MainLayout({ children, user, profile, role }: MainLayoutProps) {
    return (
        <>
            {/* App Header - Mobile & Desktop Navigation */}
            <AppHeader
                user={user}
                profile={profile}
                role={role}
            />

            {/* Floating Menu - Desktop Only */}
            <FloatingMenu
                user={user}
                profile={profile}
                role={role}
            />

            {/* Page Content */}
            {children}
        </>
    );
}
