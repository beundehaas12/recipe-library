'use client';

import { useState, useTransition } from 'react';
import type { User } from '@supabase/supabase-js';
import type { Recipe, Collection, UserProfile } from '@/types/database';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Users, Shield, Search, CheckCircle, ChevronDown, UserPlus, Clock, Mail, Trash2 } from 'lucide-react';
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
    const [activeFilter, setActiveFilter] = useState('users');
    const [activeTab, setActiveTab] = useState<'users' | 'waitlist'>('users');
    const [users, setUsers] = useState(initialUsers || []);
    const [waitlist, setWaitlist] = useState(initialWaitlist);
    const [searchTerm, setSearchTerm] = useState('');
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [invitingId, setInvitingId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [theme, setTheme] = useState<'dark' | 'light'>('light');

    const supabase = createClient();

    // Theme helpers
    const textPrimary = theme === 'light' ? 'text-zinc-900' : 'text-white';
    const textSecondary = theme === 'light' ? 'text-zinc-500' : 'text-muted-foreground';
    const borderClass = theme === 'light' ? 'border-zinc-200' : 'border-white/10';
    const bgCard = theme === 'light' ? 'bg-white shadow-sm' : 'bg-zinc-900/50';
    const bgHover = theme === 'light' ? 'hover:bg-zinc-50' : 'hover:bg-white/5';
    const cardBorder = theme === 'light' ? 'border-zinc-200' : 'border-white/5';

    // Count users by role
    const admins = users.filter(u => u.role === 'admin');
    const authors = users.filter(u => u.role === 'author');

    // Waitlist stats
    const pendingCount = waitlist.filter(w => w.status === 'pending').length;
    const invitedCount = waitlist.filter(w => w.status === 'invited').length;

    // Filter users
    const filteredUsers = users.filter(u =>
        u.user_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.last_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Filter waitlist
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
                setWaitlist(waitlist.map(w =>
                    w.id === entry.id ? { ...w, status: 'invited' as const } : w
                ));
                alert(`✅ Uitnodiging verzonden naar ${entry.email}`);
            } else {
                alert(`❌ Fout: ${result.error}`);
            }
        } catch (err) {
            console.error('Error inviting:', err);
            alert('Er is iets misgegaan');
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
            currentTheme={theme}
            onThemeToggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Header */}
                <div className={`h-14 border-b px-6 flex items-center justify-between shrink-0 ${borderClass} ${theme === 'light' ? 'bg-white' : ''}`}>
                    <div className="flex items-center gap-3">
                        <h1 className={`text-lg font-bold flex items-center gap-2 ${textPrimary}`}>
                            <Users className="text-primary" size={20} />
                            User Management
                        </h1>
                        <div className={`h-4 w-px ${theme === 'light' ? 'bg-zinc-200' : 'bg-white/10'}`} />
                        <span className={`text-xs ${textSecondary}`}>
                            {users.length} registered users
                        </span>
                    </div>

                    <div className="flex gap-2">
                        <StatBadge label="Admins" count={admins.length} theme={theme} />
                        <StatBadge label="Authors" count={authors.length} theme={theme} />
                        <StatBadge label="Waitlist" count={pendingCount} highlight={pendingCount > 0} theme={theme} />
                    </div>
                </div>

                {/* Tabs */}
                <div className={`px-6 py-3 border-b flex gap-1 ${borderClass}`}>
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`px-4 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${activeTab === 'users'
                            ? (theme === 'light' ? 'bg-zinc-100 text-zinc-900' : 'bg-white/10 text-white')
                            : (theme === 'light' ? 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5')
                            }`}
                    >
                        <Users size={14} />
                        Registered Users
                    </button>
                    <button
                        onClick={() => setActiveTab('waitlist')}
                        className={`px-4 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${activeTab === 'waitlist'
                            ? (theme === 'light' ? 'bg-zinc-100 text-zinc-900' : 'bg-white/10 text-white')
                            : (theme === 'light' ? 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5')
                            }`}
                    >
                        <UserPlus size={14} />
                        Waitlist
                        {pendingCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-400 font-bold">
                                {pendingCount}
                            </span>
                        )}
                    </button>
                </div>

                {/* Toolbar */}
                <div className={`px-6 py-4 border-b flex items-center justify-between ${borderClass}`}>
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                        <input
                            type="text"
                            placeholder={activeTab === 'users' ? "Search users..." : "Search waitlist..."}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={`w-full border rounded-lg py-1.5 pl-9 pr-4 text-xs focus:outline-none focus:ring-1 focus:ring-primary/50 ${theme === 'light'
                                ? 'bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400'
                                : 'bg-zinc-900 border-white/10 text-white placeholder:text-zinc-500'}`}
                        />
                    </div>

                    {activeTab === 'waitlist' && (
                        <div className="flex gap-4">
                            <span className="text-[10px] text-zinc-500 flex items-center gap-1.5">
                                <Clock size={12} /> Pending: {pendingCount}
                            </span>
                            <span className="text-[10px] text-emerald-500 flex items-center gap-1.5">
                                <CheckCircle size={12} /> Invited: {invitedCount}
                            </span>
                        </div>
                    )}
                </div>

                {/* Table */}
                <div className="flex-1 overflow-y-auto p-6">
                    {activeTab === 'users' ? (
                        <UsersTable
                            users={filteredUsers}
                            updatingId={updatingId}
                            onRoleChange={handleRoleChange}
                            getUserDisplayName={getUserDisplayName}
                            getUserInitials={getUserInitials}
                            theme={theme}
                        />
                    ) : (
                        <WaitlistTable
                            waitlist={filteredWaitlist}
                            invitingId={invitingId}
                            deletingId={deletingId}
                            onInvite={handleInvite}
                            onDelete={handleDelete}
                            theme={theme}
                        />
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}

function UsersTable({
    users,
    updatingId,
    onRoleChange,
    getUserDisplayName,
    getUserInitials,
    theme,
}: {
    users: UserWithRole[];
    updatingId: string | null;
    onRoleChange: (userId: string, role: string) => void;
    getUserDisplayName: (u: UserWithRole) => string;
    getUserInitials: (u: UserWithRole) => string;
    theme: 'light' | 'dark';
}) {
    const textPrimary = theme === 'light' ? 'text-zinc-900' : 'text-white';
    const borderClass = theme === 'light' ? 'border-zinc-200' : 'border-white/5';
    const bgHeader = theme === 'light' ? 'bg-zinc-50' : 'bg-zinc-900/80';
    const bgHover = theme === 'light' ? 'hover:bg-zinc-50' : 'hover:bg-white/5';

    return (
        <div className={`border rounded-2xl overflow-hidden ${theme === 'light' ? 'bg-white shadow-[0_2px_8px_rgba(0,0,0,0.02)] border-zinc-100' : 'bg-zinc-900/50 border-white/5'}`}>
            <div className={`grid grid-cols-12 gap-4 px-6 py-4 text-xs font-medium ${theme === 'light' ? 'text-zinc-400' : 'text-zinc-500'} border-b ${borderClass} ${bgHeader}`}>
                <div className="col-span-3">Name</div>
                <div className="col-span-4">Email</div>
                <div className="col-span-3">Role</div>
                <div className="col-span-2 text-right">Joined</div>
            </div>
            <div className={`divide-y ${theme === 'light' ? 'divide-zinc-100' : 'divide-white/5'}`}>
                {users.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground text-sm">
                        No users found.
                    </div>
                ) : (
                    users.map((u) => (
                        <div key={u.user_id} className={`grid grid-cols-12 gap-4 px-4 py-3 transition-colors items-center ${bgHover}`}>
                            <div className="col-span-3 flex items-center gap-3">
                                {u.avatar_url ? (
                                    <img src={u.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                                ) : (
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${theme === 'light' ? 'bg-primary/10 text-primary-dark' : 'bg-primary/10 text-primary'}`}>
                                        {getUserInitials(u)}
                                    </div>
                                )}
                                <span className={`font-medium truncate ${textPrimary}`}>
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
                                        onRoleChange={(newRole) => onRoleChange(u.user_id, newRole)}
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
    );
}

function WaitlistTable({
    waitlist,
    invitingId,
    deletingId,
    onInvite,
    onDelete,
    theme,
}: {
    waitlist: WaitlistEntry[];
    invitingId: string | null;
    deletingId: string | null;
    onInvite: (entry: WaitlistEntry) => void;
    onDelete: (entry: WaitlistEntry) => void;
    theme: 'light' | 'dark';
}) {
    const textPrimary = theme === 'light' ? 'text-zinc-900' : 'text-white';
    const borderClass = theme === 'light' ? 'border-zinc-200' : 'border-white/5';
    const bgHeader = theme === 'light' ? 'bg-zinc-50' : 'bg-zinc-900/80';
    const bgHover = theme === 'light' ? 'hover:bg-zinc-50' : 'hover:bg-white/5';

    return (
        <div className={`border rounded-2xl overflow-hidden ${theme === 'light' ? 'bg-white shadow-[0_2px_8px_rgba(0,0,0,0.02)] border-zinc-100' : 'bg-zinc-900/50 border-white/5'}`}>
            <div className={`grid grid-cols-12 gap-4 px-6 py-4 text-xs font-medium ${theme === 'light' ? 'text-zinc-400' : 'text-zinc-500'} border-b ${borderClass} ${bgHeader}`}>
                <div className="col-span-3">Naam</div>
                <div className="col-span-4">Email</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-1">Datum</div>
                <div className="col-span-2 text-right">Acties</div>
            </div>
            <div className={`divide-y ${theme === 'light' ? 'divide-zinc-100' : 'divide-white/5'}`}>
                {waitlist.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground text-sm">
                        Geen wachtlijst aanvragen.
                    </div>
                ) : (
                    waitlist.map((w) => (
                        <div key={w.id} className={`grid grid-cols-12 gap-4 px-4 py-3 transition-colors items-center group ${bgHover}`}>
                            <div className="col-span-3 flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${theme === 'light' ? 'bg-zinc-100 border-zinc-200' : 'bg-zinc-800 border-white/10'}`}>
                                    <UserPlus size={14} className="text-zinc-500" />
                                </div>
                                <span className={`font-medium truncate ${textPrimary}`}>
                                    {w.first_name || w.last_name
                                        ? `${w.first_name || ''} ${w.last_name || ''}`.trim()
                                        : <span className="text-zinc-600 italic">Geen naam</span>
                                    }
                                </span>
                            </div>
                            <div className="col-span-4 text-sm text-zinc-400 truncate">
                                {w.email}
                            </div>
                            <div className="col-span-2">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium ${w.status === 'pending'
                                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                    }`}>
                                    {w.status === 'pending' ? <Clock size={10} /> : <CheckCircle size={10} />}
                                    {w.status === 'pending' ? 'Pending' : 'Invited'}
                                </span>
                            </div>
                            <div className="col-span-1 text-xs text-muted-foreground">
                                {new Date(w.created_at).toLocaleDateString('nl-NL')}
                            </div>
                            <div className="col-span-2 flex justify-end gap-2">
                                {w.status === 'pending' && (
                                    <button
                                        onClick={() => onInvite(w)}
                                        disabled={invitingId === w.id}
                                        className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-[10px] font-bold transition-all flex items-center gap-1.5 disabled:opacity-50"
                                    >
                                        {invitingId === w.id ? (
                                            <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <Mail size={10} />
                                        )}
                                        Uitnodigen
                                    </button>
                                )}
                                <button
                                    onClick={() => onDelete(w)}
                                    disabled={deletingId === w.id}
                                    className="px-2 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-[10px] transition-all disabled:opacity-50"
                                >
                                    {deletingId === w.id ? (
                                        <div className="w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <Trash2 size={12} />
                                    )}
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

interface WaitlistEntry {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
    status: 'pending' | 'invited' | 'rejected';
    created_at: string;
}

interface StatBadgeProps {
    label: string;
    count: number;
    highlight?: boolean;
    theme: 'light' | 'dark';
}

function StatBadge({ label, count, highlight = false, theme }: StatBadgeProps) {
    return (
        <div className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-2 ${highlight
            ? 'bg-amber-500/10 border-amber-500/20 text-amber-500'
            : (theme === 'light' ? 'bg-zinc-50 border-zinc-200 text-zinc-600' : 'bg-zinc-900 border-white/10 text-muted-foreground')
            }`}>
            <span>{label}</span>
            <span className={`px-1.5 py-0.5 rounded-md ${highlight
                ? 'bg-amber-500 text-black'
                : (theme === 'light' ? 'bg-zinc-200 text-zinc-700' : 'bg-white/10 text-white')
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
