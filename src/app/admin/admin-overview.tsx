'use client';

import { Users, ChefHat, FolderOpen, Clock, UserCheck } from 'lucide-react';

interface AdminOverviewProps {
    stats: {
        totalUsers: number;
        totalRecipes: number;
        totalCollections: number;
        pendingWaitlist: number;
        totalAuthors: number;
    };
}

export default function AdminOverview({ stats }: AdminOverviewProps) {
    const statCards = [
        { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'bg-blue-500' },
        { label: 'Authors', value: stats.totalAuthors, icon: UserCheck, color: 'bg-green-500' },
        { label: 'Recipes', value: stats.totalRecipes, icon: ChefHat, color: 'bg-orange-500' },
        { label: 'Collections', value: stats.totalCollections, icon: FolderOpen, color: 'bg-purple-500' },
        { label: 'Pending Waitlist', value: stats.pendingWaitlist, icon: Clock, color: 'bg-red-500' },
    ];

    return (
        <>
            {/* Title Section */}
            <div className="mb-8">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-zinc-900 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-zinc-200">
                        <Users size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-zinc-900">Admin Overview</h1>
                        <p className="text-zinc-500 text-sm">System statistics and quick actions.</p>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                {statCards.map((stat) => (
                    <div
                        key={stat.label}
                        className="bg-white rounded-2xl p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-zinc-100/50"
                    >
                        <div className="flex items-center gap-3 mb-3">
                            <div className={`w-10 h-10 ${stat.color} rounded-xl flex items-center justify-center text-white`}>
                                <stat.icon size={20} />
                            </div>
                        </div>
                        <p className="text-3xl font-bold text-zinc-900">{stat.value}</p>
                        <p className="text-sm text-zinc-500 mt-1">{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-zinc-100/50">
                <h2 className="text-lg font-bold text-zinc-900 mb-4">Quick Actions</h2>
                <div className="flex flex-wrap gap-3">
                    <a
                        href="/admin/users"
                        className="px-4 py-2 bg-zinc-900 text-white rounded-xl text-sm font-medium hover:bg-zinc-800 transition-colors"
                    >
                        Manage Users
                    </a>
                </div>
            </div>
        </>
    );
}
