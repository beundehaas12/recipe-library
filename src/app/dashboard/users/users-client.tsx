'use client';

import { useState } from 'react';
import type { User } from '@supabase/supabase-js';
import type { Recipe, Collection, UserProfile } from '@/types/database';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Users, Shield, Search, CheckCircle, ChevronDown, UserPlus, Clock, Mail, Trash2, BadgeCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { inviteWaitlistUser, deleteWaitlistEntry } from '@/app/actions/invite';

interface UserWithRole {
    user_id: string;
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
    email?: string | null;
    role: string;
    created_at: string;
}

interface WaitlistEntry {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
    status: 'pending' | 'invited' | 'rejected';
    created_at: string;
}

interface UsersClientProps {
    user: User;
    profile: UserProfile | null;
    role: 'user' | 'author' | 'admin' | null;
    users: UserWithRole[];
    recipes: Recipe[];
    collections: Collection[];
    waitlist?: WaitlistEntry[];
}

export default function UsersClient({
    user,
    profile,
    role,
    users: initialUsers,
    recipes,
    collections,
    waitlist: initialWaitlist = [],
}: UsersClientProps) {
    const [activeTab, setActiveTab] = useState<'users' | 'waitlist'>('users');
    const [users, setUsers] = useState(initialUsers || []);
    const [waitlist, setWaitlist] = useState(initialWaitlist);
    const [searchTerm, setSearchTerm] = useState('');
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [invitingId, setInvitingId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [theme, setTheme] = useState<'dark' | 'light'>('light');

    const supabase = createClient();

    // Stats
    const admins = users.filter(u => u.role === 'admin');
    const authors = users.filter(u => u.role === 'author');
    const pendingCount = waitlist.filter(w => w.status === 'pending').length;

    // Filter
    const filteredUsers = users.filter(u =>
        u.user_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.last_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredWaitlist = waitlist.filter(w =>
        w.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        w.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        w.last_name?.toLowerCase().includes(searchTerm.toLowerCase())
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

    const handleInvite = async (entry: WaitlistEntry) => {
        setInvitingId(entry.id);
        try {
            const result = await inviteWaitlistUser(entry.id, entry.email);
            if (result.success) {
                setWaitlist(waitlist.map(w => w.id === entry.id ? { ...w, status: 'invited' as const } : w));
                alert(`✅ Uitnodiging verzonden naar ${entry.email}`);
            } else {
                alert(`❌ Fout: ${result.error}`);
            }
        } catch (err) {
            console.error('Error inviting:', err);
        } finally {
            setInvitingId(null);
        }
    };

    const handleDelete = async (entry: WaitlistEntry) => {
        if (!confirm(`Weet je zeker dat je ${entry.email} wilt verwijderen?`)) return;
        setDeletingId(entry.id);
        try {
            const result = await deleteWaitlistEntry(entry.id);
            if (result.success) {
                setWaitlist(waitlist.filter(w => w.id !== entry.id));
            } else {
                alert(`❌ Fout: ${result.error}`);
            }
        } catch (err) {
            console.error('Error deleting:', err);
        } finally {
            setDeletingId(null);
        }
    };

    const getUserDisplayName = (u: UserWithRole) => u.first_name ? `${u.first_name || ''} ${u.last_name || ''}`.trim() : 'Onbekend';
    const getUserInitials = (u: UserWithRole) => u.first_name ? `${u.first_name?.[0] || ''}${u.last_name?.[0] || ''}`.toUpperCase() : '?';

    return (
        <DashboardLayout
            user={user}
            profile={profile}
            role={role}
            activeFilter="users"
            onFilterChange={() => { }}
            collections={collections}
            isAdmin={true}
            currentTheme={theme}
            onThemeToggle={() => setTheme(theme === 'dark' ? 'light' : 'light')} // Force light
        >
            {/* V4 Title Section */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-zinc-900 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-zinc-200">
                            <Users size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-zinc-900">User Management</h1>
                            <p className="text-zinc-500 text-sm">Manage access and roles.</p>
                        </div>
                    </div>
                </div>

                {/* V4 Tabs */}
                <div className="flex items-center gap-8 border-b border-zinc-100">
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`pb-4 text-sm transition-colors ${activeTab === 'users' ? 'text-zinc-900 font-bold' : 'text-zinc-400 font-medium hover:text-zinc-600'}`}
                    >
                        Registered Users
                    </button>
                    <button
                        onClick={() => setActiveTab('waitlist')}
                        className={`pb-4 text-sm transition-colors ${activeTab === 'waitlist' ? 'text-zinc-900 font-bold' : 'text-zinc-400 font-medium hover:text-zinc-600'}`}
                    >
                        Waitlist ({pendingCount})
                    </button>
                </div>
            </div>

            {/* V4 Card Content */}
            <div className="bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-zinc-100/50 overflow-hidden">
                {/* Card Toolbar */}
                <div className="p-4 border-b border-zinc-100 flex items-center justify-between">
                    <div className="relative w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                        <input
                            type="text"
                            placeholder={activeTab === 'users' ? "Search users..." : "Search waitlist..."}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-zinc-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-zinc-200 placeholder:text-zinc-400"
                        />
                    </div>
                    <div className="flex gap-2">
                        {activeTab === 'users' && (
                            <>
                                <span className="px-3 py-1.5 rounded-lg bg-zinc-50 text-zinc-500 text-xs font-bold border border-zinc-100">
                                    Admins: {admins.length}
                                </span>
                                <span className="px-3 py-1.5 rounded-lg bg-zinc-50 text-zinc-500 text-xs font-bold border border-zinc-100">
                                    Authors: {authors.length}
                                </span>
                            </>
                        )}
                    </div>
                </div>

                {/* Table Content */}
                <div className="overflow-x-auto">
                    {activeTab === 'users' ? (
                        <UsersTable
                            users={filteredUsers}
                            updatingId={updatingId}
                            onRoleChange={handleRoleChange}
                            getUserDisplayName={getUserDisplayName}
                            getUserInitials={getUserInitials}
                        />
                    ) : (
                        <WaitlistTable
                            waitlist={filteredWaitlist}
                            invitingId={invitingId}
                            deletingId={deletingId}
                            onInvite={handleInvite}
                            onDelete={handleDelete}
                        />
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}

// Subcomponents - Monochrome Styled
function UsersTable({ users, updatingId, onRoleChange, getUserDisplayName, getUserInitials }: any) {
    return (
        <table className="w-full text-left text-sm text-zinc-600">
            <thead className="bg-zinc-50/50 text-zinc-400 font-medium border-b border-zinc-100">
                <tr>
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4">Email</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4 text-right">Joined</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
                {users.map((u: any) => (
                    <tr key={u.user_id} className="hover:bg-zinc-50/50 transition-colors">
                        <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                                {u.avatar_url ? (
                                    <img src={u.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover ring-2 ring-white shadow-sm" />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 font-bold text-xs">
                                        {getUserInitials(u)}
                                    </div>
                                )}
                                <span className="font-bold text-zinc-900">{getUserDisplayName(u)}</span>
                            </div>
                        </td>
                        <td className="px-6 py-4 text-zinc-500">{u.email}</td>
                        <td className="px-6 py-4">
                            <RoleDropdown currentRole={u.role} onRoleChange={(r: string) => onRoleChange(u.user_id, r)} updating={updatingId === u.user_id} />
                        </td>
                        <td className="px-6 py-4 text-right text-zinc-400 text-xs">
                            {new Date(u.created_at).toLocaleDateString('en-GB')}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

function RoleDropdown({ currentRole, onRoleChange, updating }: any) {
    const [isOpen, setIsOpen] = useState(false);
    const roles = [
        { value: 'user', label: 'User' },
        { value: 'author', label: 'Author' },
        { value: 'admin', label: 'Admin' },
    ];

    if (updating) return <div className="w-4 h-4 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />;

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border transition-colors ${currentRole === 'admin' ? 'bg-zinc-900 text-white border-transparent' :
                    currentRole === 'author' ? 'bg-zinc-100 text-zinc-900 border-zinc-200' :
                        'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300'
                    }`}
            >
                {currentRole === 'admin' && <Shield size={10} />}
                {currentRole.charAt(0).toUpperCase() + currentRole.slice(1)}
                <ChevronDown size={10} />
            </button>
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div className="absolute top-full left-0 mt-1 w-32 bg-white border border-zinc-100 rounded-xl shadow-xl z-50 overflow-hidden">
                        {roles.map(r => (
                            <button
                                key={r.value}
                                onClick={() => { onRoleChange(r.value); setIsOpen(false); }}
                                className="w-full text-left px-4 py-2 hover:bg-zinc-50 text-xs font-medium text-zinc-900"
                            >
                                {r.label}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

function WaitlistTable({ waitlist, onInvite, onDelete, invitingId, deletingId }: any) {
    return (
        <table className="w-full text-left text-sm text-zinc-600">
            <thead className="bg-zinc-50/50 text-zinc-400 font-medium border-b border-zinc-100">
                <tr>
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4">Email</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
                {waitlist.map((w: any) => (
                    <tr key={w.id} className="hover:bg-zinc-50/50 transition-colors">
                        <td className="px-6 py-4 font-medium text-zinc-900">{w.first_name || '-'}</td>
                        <td className="px-6 py-4">{w.email}</td>
                        <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${w.status === 'pending' ? 'bg-zinc-100 text-zinc-500' : 'bg-black text-white'
                                }`}>
                                {w.status === 'pending' ? <Clock size={10} /> : <CheckCircle size={10} />}
                                {w.status.toUpperCase()}
                            </span>
                        </td>
                        <td className="px-6 py-4 flex justify-end gap-2">
                            {w.status === 'pending' && (
                                <button onClick={() => onInvite(w)} className="p-1.5 bg-zinc-900 text-white rounded-lg hover:bg-zinc-700">
                                    <Mail size={12} />
                                </button>
                            )}
                            <button onClick={() => onDelete(w)} className="p-1.5 bg-zinc-100 text-zinc-500 rounded-lg hover:bg-red-50 hover:text-red-500">
                                <Trash2 size={12} />
                            </button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}
