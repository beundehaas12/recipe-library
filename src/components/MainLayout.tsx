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
    searchQuery?: string;
    onSearchChange?: (query: string) => void;
}

export default function MainLayout({ children, user, profile, role, searchQuery, onSearchChange }: MainLayoutProps) {
    return (
        <>
            {/* App Header - Mobile & Desktop Navigation */}
            <AppHeader
                user={user}
                profile={profile}
                role={role}
                searchQuery={searchQuery}
                onSearchChange={onSearchChange}
            />

            {/* Floating Menu - Desktop Only */}
            <FloatingMenu
                user={user}
                profile={profile}
                role={role}
                searchQuery={searchQuery}
                onSearchChange={onSearchChange}
            />

            {/* Page Content */}
            {children}
        </>
    );
}
