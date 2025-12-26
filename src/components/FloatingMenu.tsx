'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
    { label: 'Ontdek', path: '/' },
    { label: 'Planning', path: '/planning' },
    { label: 'Boodschappen', path: '/shopping' },
    { label: 'Favorieten', path: '/favorites' },
];

export default function FloatingMenu() {
    const pathname = usePathname();

    // Hide on dashboard/admin/settings
    if (pathname.startsWith('/dashboard') || pathname.startsWith('/admin') || pathname.startsWith('/settings')) return null;

    return (
        <div className="fixed top-4 left-0 right-0 z-[5000] justify-center px-4 pointer-events-none hidden lg:flex">
            <div
                className="pointer-events-auto bg-black/80 backdrop-blur-xl border border-white/10 shadow-2xl flex items-center h-11 rounded-full p-1"
            >
                <div className="flex items-center gap-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.path;
                        return (
                            <Link
                                key={item.label}
                                href={item.path}
                                className={`
                                    relative px-4 h-9 flex items-center justify-center rounded-full text-sm font-bold tracking-wide transition-all
                                    ${isActive ? 'text-black bg-primary' : 'text-white/70 hover:text-white hover:bg-white/10'}
                                `}
                            >
                                {item.label}
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
