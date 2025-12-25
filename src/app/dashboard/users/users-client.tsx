'use client';

import { useState } from 'react';
import type { User } from '@supabase/supabase-js';
import type { Recipe, Collection, UserProfile } from '@/types/database';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Users, Shield, Search, CheckCircle, ChevronDown } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface UserWithRole {
    user_id: string;
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
    email?: string | null;
    role: string;
    created_at: string;
}

interface UsersClientProps {
    user: User;
    profile: UserProfile | null;
    role: 'user' | 'author' | 'admin' | null;
    users: UserWithRole[];
    recipes: Recipe[];
    collections: Collection[];
}

export default function UsersClient({
    user,
    profile,
    role,
    users: initialUsers,
    recipes,
    collections,
}: UsersClientProps) {
    const [activeFilter, setActiveFilter] = useState('users');
    const [users, setUsers] = useState(initialUsers || []);
    const [searchTerm, setSearchTerm] = useState('');
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    const supabase = createClient();

    // Count users by role
    const admins = users.filter(u => u.role === 'admin');
    const authors = users.filter(u => u.role === 'author');

    // Filter users
    const filteredUsers = users.filter(u =>
        u.user_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.last_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleRoleChange = async (userId: string, newRole: string) => {
        setUpdatingId(userId);
        try {
            const { error } = await supabase
                .from('user_roles')
                .update({ role: newRole, updated_at: new Date().toISOString() })
                .eq('user_id', userId);

            if (!error) {
                setUsers(users.map(u =>
                    u.user_id === userId ? { ...u, role: newRole } : u
                ));
            }
        } catch (err) {
            console.error('Error changing role:', err);
        } finally {
            setUpdatingId(null);
        }
    };

    const getUserDisplayName = (u: UserWithRole) => {
        if (u.first_name || u.last_name) {
            return `${u.first_name || ''} ${u.last_name || ''}`.trim();
        }
        return 'Onbekend';
    };

    const getUserInitials = (u: UserWithRole) => {
        if (u.first_name || u.last_name) {
            return `${u.first_name?.[0] || ''}${u.last_name?.[0] || ''}`.toUpperCase();
        }
        return '?';
    };

    return (
        <DashboardLayout
            user={user}
            profile={profile}
            role={role}
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            collections={collections}
            isAdmin={true}
        >
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Header */}
                <div className="h-14 border-b border-white/10 px-6 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <h1 className="text-lg font-bold text-white flex items-center gap-2">
                            <Users className="text-primary" size={20} />
                            User Management
                        </h1>
                        <div className="h-4 w-px bg-white/10" />
                        <span className="text-xs text-muted-foreground">
                            {users.length} registered users
                        </span>
                    </div>

                    <div className="flex gap-2">
                        <StatBadge label="Admins" count={admins.length} />
                        <StatBadge label="Authors" count={authors.length} />
                    </div>
                </div>

                {/* Toolbar */}
                <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                        <input
                            type="text"
                            placeholder="Search users..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-zinc-900 border border-white/10 rounded-lg py-1.5 pl-9 pr-4 text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary/50"
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="bg-zinc-900/50 border border-white/5 rounded-xl overflow-hidden">
                        <div className="grid grid-cols-12 gap-4 px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-white/5 bg-zinc-900/80">
                            <div className="col-span-3">Name</div>
                            <div className="col-span-4">Email</div>
                            <div className="col-span-3">Role</div>
                            <div className="col-span-2 text-right">Joined</div>
                        </div>
                        <div className="divide-y divide-white/5">
                            {filteredUsers.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground text-sm">
                                    No users found.
                                </div>
                            ) : (
                                filteredUsers.map((u) => (
                                    <div key={u.user_id} className="grid grid-cols-12 gap-4 px-4 py-3 hover:bg-white/5 transition-colors items-center">
                                        <div className="col-span-3 flex items-center gap-3">
                                            {u.avatar_url ? (
                                                <img src={u.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                                    {getUserInitials(u)}
                                                </div>
                                            )}
                                            <span className="font-medium text-white truncate">
                                                {getUserDisplayName(u)}
                                            </span>
                                        </div>
                                        <div className="col-span-4 text-sm text-zinc-400 truncate">
                                            {u.email || <span className="text-zinc-600 italic">No email</span>}
                                        </div>
                                        <div className="col-span-3">
                                            {updatingId === u.user_id ? (
                                                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                            ) : (
                                                <RoleDropdown
                                                    currentRole={u.role}
                                                    onRoleChange={(newRole) => handleRoleChange(u.user_id, newRole)}
                                                />
                                            )}
                                        </div>
                                        <div className="col-span-2 text-xs text-muted-foreground text-right">
                                            {new Date(u.created_at).toLocaleDateString('nl-NL')}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}

function StatBadge({ label, count, highlight = false }: { label: string; count: number; highlight?: boolean }) {
    return (
        <div className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-2 ${highlight
            ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
            : 'bg-zinc-900 border-white/10 text-muted-foreground'
            }`}>
            <span>{label}</span>
            <span className={`px-1.5 py-0.5 rounded-md ${highlight
                ? 'bg-amber-500 text-black'
                : 'bg-white/10 text-white'
                }`}>
                {count}
            </span>
        </div>
    );
}

function RoleDropdown({ currentRole, onRoleChange }: { currentRole: string; onRoleChange: (role: string) => void }) {
    const [isOpen, setIsOpen] = useState(false);

    const roles = [
        { value: 'user', label: 'User', color: 'text-zinc-400 bg-zinc-800 border-white/10 hover:bg-zinc-700' },
        { value: 'author', label: 'Author', color: 'text-primary bg-primary/10 border-primary/20 hover:bg-primary/20' },
        { value: 'admin', label: 'Admin', color: 'text-purple-400 bg-purple-400/10 border-purple-400/20 hover:bg-purple-400/20' },
    ];

    const currentRoleData = roles.find(r => r.value === currentRole) || roles[0];

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium border transition-all cursor-pointer ${currentRoleData.color}`}
            >
                {currentRole === 'admin' && <Shield size={10} />}
                {currentRole.charAt(0).toUpperCase() + currentRole.slice(1)}
                <ChevronDown size={10} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div className="absolute right-0 top-full mt-1 z-50 bg-zinc-900 border border-white/10 rounded-lg shadow-xl overflow-hidden min-w-[100px]">
                        {roles.map(role => (
                            <button
                                key={role.value}
                                onClick={() => {
                                    onRoleChange(role.value);
                                    setIsOpen(false);
                                }}
                                className={`w-full px-3 py-2 text-left text-xs font-medium flex items-center gap-2 transition-colors ${role.value === currentRole ? 'bg-white/10' : 'hover:bg-white/5'
                                    } ${role.value === 'admin' ? 'text-purple-400' :
                                        role.value === 'author' ? 'text-primary' : 'text-zinc-400'
                                    }`}
                            >
                                {role.value === 'admin' && <Shield size={10} />}
                                {role.label}
                                {role.value === currentRole && <CheckCircle size={10} className="ml-auto" />}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
