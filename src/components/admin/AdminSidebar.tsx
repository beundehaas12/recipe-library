'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGrid, Users, PanelLeftClose } from 'lucide-react';

interface AdminSidebarProps {
    pendingWaitlistCount?: number;
    isCollapsed?: boolean;
    onToggleCollapse?: () => void;
}

export default function AdminSidebar({
    pendingWaitlistCount = 0,
    isCollapsed = false,
    onToggleCollapse
}: AdminSidebarProps) {
    const pathname = usePathname();

    const activeClass = "bg-zinc-100 text-zinc-900 font-bold";
    const inactiveClass = "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50";

    const NavItem = ({ active, icon: Icon, label, href, badgeCount }: any) => {
        const content = (
            <>
                <Icon size={20} className={`shrink-0 w-5 h-5 ${active ? "text-zinc-900" : "text-zinc-400"}`} />
                {!isCollapsed && (
                    <>
                        <span className="whitespace-nowrap overflow-hidden flex-1">{label}</span>
                        {badgeCount > 0 && (
                            <span className="ml-auto px-2 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[20px] text-center">
                                {badgeCount}
                            </span>
                        )}
                    </>
                )}
                {isCollapsed && badgeCount > 0 && (
                    <span className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[16px] text-center">
                        {badgeCount}
                    </span>
                )}
                {isCollapsed && (
                    <div className="absolute left-[calc(100%+10px)] top-1/2 -translate-y-1/2 bg-zinc-900 text-white text-xs font-bold px-3 py-1.5 rounded-md shadow-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-[100]">
                        {label}
                    </div>
                )}
            </>
        );

        const className = `relative group flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${active ? activeClass : inactiveClass} ${isCollapsed ? 'justify-center' : ''}`;

        return (
            <Link href={href} className={className}>
                {content}
            </Link>
        );
    };

    return (
        <div className={`${isCollapsed ? 'w-20' : 'w-[280px]'} flex flex-col h-full bg-white border-r border-zinc-100 flex-shrink-0 relative`}>
            <button
                onClick={onToggleCollapse}
                className={`p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors z-50 flex items-center justify-center ${isCollapsed ? 'mx-auto mt-4 mb-2' : 'absolute top-3 right-3'}`}
            >
                <PanelLeftClose size={20} className={`shrink-0 transition-transform ${isCollapsed ? 'rotate-180' : ''}`} />
            </button>

            {/* Navigation */}
            <div className={`flex-1 px-4 space-y-1 ${isCollapsed ? 'mt-2 overflow-visible' : 'mt-14 overflow-y-auto'}`}>
                <NavItem
                    href="/admin"
                    active={pathname === '/admin'}
                    icon={LayoutGrid}
                    label="Overview"
                />

                {!isCollapsed && <div className="text-xs font-semibold text-zinc-400 px-4 mb-2 mt-6 uppercase tracking-wider">Management</div>}

                <NavItem
                    href="/admin/users"
                    active={pathname === '/admin/users'}
                    icon={Users}
                    label="Users & Waitlist"
                    badgeCount={pendingWaitlistCount}
                />
            </div>
        </div>
    );
}
