'use client';

import { useState } from 'react';
import type { User } from '@supabase/supabase-js';
import type { Recipe, Collection, UserProfile } from '@/types/database';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Users, Shield, UserCheck, UserPlus, Clock, CheckCircle, Trash2, Mail, Search, User as UserIcon, ChevronDown } from 'lucide-react';
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

interface EarlyAccessRequest {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
    status: 'pending' | 'approved' | 'completed';
    created_at: string;
    invitation_token?: string;
}

interface UsersClientProps {
    user: User;
    profile: UserProfile | null;
    role: 'user' | 'author' | 'admin' | null;
    users: UserWithRole[];
    recipes: Recipe[];
    collections: Collection[];
    earlyAccessRequests: EarlyAccessRequest[];
}

export default function UsersClient({
    user,
    profile,
    role,
    users: initialUsers,
    recipes,
    collections,
    earlyAccessRequests: initialEarlyAccess = []
}: UsersClientProps) {
    const [activeFilter, setActiveFilter] = useState('users');
    const [activeTab, setActiveTab] = useState<'users' | 'early-access'>('users');
    const [users, setUsers] = useState(initialUsers || []);
    const [earlyAccessRequests, setEarlyAccessRequests] = useState(initialEarlyAccess || []);
    const [searchTerm, setSearchTerm] = useState('');
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [approvingId, setApprovingId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const supabase = createClient();

    // Count users by role
    const admins = users.filter(u => u.role === 'admin');
    const authors = users.filter(u => u.role === 'author');

    // Early access stats
    const pendingCount = earlyAccessRequests.filter(r => r.status === 'pending').length;
    const approvedCount = earlyAccessRequests.filter(r => r.status === 'approved').length;

    // Filter users
    const filteredUsers = users.filter(u =>
        u.user_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.last_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Filter early access
    const filteredEarlyAccess = earlyAccessRequests.filter(r =>
        r.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.last_name?.toLowerCase().includes(searchTerm.toLowerCase())
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

    const handleApproveEarlyAccess = async (requestId: string) => {
        setApprovingId(requestId);
        try {
            const { data, error } = await supabase.rpc('approve_early_access', { p_request_id: requestId });

            if (!error && data?.success) {
                setEarlyAccessRequests(earlyAccessRequests.map(r =>
                    r.id === requestId ? { ...r, status: 'approved' as const } : r
                ));

                try {
                    await supabase.functions.invoke('invite-user', {
                        body: {
                            email: data.email,
                            redirectTo: `${window.location.origin}/complete-account?token=${data.invitation_token}`
                        }
                    });
                    alert(`✅ Goedgekeurd! Uitnodigingsmail verzonden naar ${data.email}`);
                } catch {
                    alert(`⚠️ Goedgekeurd, maar e-mail kon niet worden verzonden.`);
                }
            } else {
                alert('Kon niet goedkeuren: ' + (error?.message || data?.error));
            }
        } catch (err) {
            console.error('Error approving early access:', err);
        } finally {
            setApprovingId(null);
        }
    };

    const handleDeleteEarlyAccess = async (requestId: string) => {
        if (!confirm('Weet je zeker dat je dit verzoek wilt verwijderen?')) return;

        setDeletingId(requestId);
        try {
            const { error } = await supabase
                .from('early_access_requests')
                .delete()
                .eq('id', requestId);

            if (!error) {
                setEarlyAccessRequests(earlyAccessRequests.filter(r => r.id !== requestId));
            }
        } catch (err) {
            console.error('Error deleting early access:', err);
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
                        <StatBadge label="Early Access" count={pendingCount} highlight={pendingCount > 0} />
                    </div>
                </div>

                {/* Tabs */}
                <div className="px-6 py-3 border-b border-white/5 flex gap-1">
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`px-4 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${activeTab === 'users'
                            ? 'bg-white/10 text-white'
                            : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                            }`}
                    >
                        <Users size={14} />
                        Registered Users
                    </button>
                    <button
                        onClick={() => setActiveTab('early-access')}
                        className={`px-4 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${activeTab === 'early-access'
                            ? 'bg-white/10 text-white'
                            : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                            }`}
                    >
                        <UserPlus size={14} />
                        Early Access Requests
                        {pendingCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-400 font-bold">
                                {pendingCount}
                            </span>
                        )}
                    </button>
                </div>

                {/* Toolbar */}
                <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                        <input
                            type="text"
                            placeholder={activeTab === 'users' ? "Search users..." : "Search requests..."}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-zinc-900 border border-white/10 rounded-lg py-1.5 pl-9 pr-4 text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary/50"
                        />
                    </div>

                    {activeTab === 'early-access' && (
                        <div className="flex gap-4">
                            <span className="text-[10px] text-zinc-500 flex items-center gap-1.5">
                                <Clock size={12} /> Pending: {pendingCount}
                            </span>
                            <span className="text-[10px] text-emerald-500 flex items-center gap-1.5">
                                <CheckCircle size={12} /> Approved: {approvedCount}
                            </span>
                        </div>
                    )}
                </div>

                {/* Table */}
                <div className="flex-1 overflow-y-auto p-6">
                    {activeTab === 'users' ? (
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
                    ) : (
                        <div className="bg-zinc-900/50 border border-white/5 rounded-xl overflow-hidden">
                            <div className="grid grid-cols-12 gap-4 px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-white/5 bg-zinc-900/80">
                                <div className="col-span-3">Naam</div>
                                <div className="col-span-3">Email</div>
                                <div className="col-span-2">Status</div>
                                <div className="col-span-2">Aangevraagd</div>
                                <div className="col-span-2 text-right">Actions</div>
                            </div>
                            <div className="divide-y divide-white/5">
                                {filteredEarlyAccess.length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground text-sm">
                                        No early access requests found.
                                    </div>
                                ) : (
                                    filteredEarlyAccess.map((r) => (
                                        <div key={r.id} className="grid grid-cols-12 gap-4 px-4 py-3 hover:bg-white/5 transition-colors items-center group">
                                            <div className="col-span-3 flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center border border-white/10">
                                                    {r.first_name ? (
                                                        <span className="text-xs font-bold text-zinc-300">
                                                            {r.first_name[0]}{r.last_name?.[0] || ''}
                                                        </span>
                                                    ) : (
                                                        <Mail size={14} className="text-muted-foreground" />
                                                    )}
                                                </div>
                                                <span className="text-sm text-white">
                                                    {r.first_name || r.last_name
                                                        ? `${r.first_name || ''} ${r.last_name || ''}`.trim()
                                                        : <span className="text-zinc-500 italic">Geen naam</span>
                                                    }
                                                </span>
                                            </div>
                                            <div className="col-span-3 text-sm text-zinc-400 truncate">
                                                {r.email}
                                            </div>
                                            <div className="col-span-2">
                                                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border ${r.status === 'approved' ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' :
                                                    r.status === 'completed' ? 'text-blue-400 bg-blue-400/10 border-blue-400/20' :
                                                        'text-amber-400 bg-amber-400/10 border-amber-400/20'
                                                    }`}>
                                                    {r.status === 'pending' && <Clock size={10} />}
                                                    {r.status === 'approved' && <CheckCircle size={10} />}
                                                    {r.status === 'pending' ? 'Wachtend' : r.status === 'approved' ? 'Goedgekeurd' : 'Voltooid'}
                                                </span>
                                            </div>
                                            <div className="col-span-2 text-xs text-zinc-500">
                                                {new Date(r.created_at).toLocaleDateString('nl-NL')}
                                            </div>
                                            <div className="col-span-2 flex justify-end gap-2">
                                                {approvingId === r.id || deletingId === r.id ? (
                                                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                                ) : (
                                                    <>
                                                        {r.status === 'pending' && (
                                                            <button
                                                                onClick={() => handleApproveEarlyAccess(r.id)}
                                                                className="px-3 py-1.5 bg-primary hover:bg-primary/90 text-black text-[11px] font-bold rounded-lg transition-all flex items-center gap-1.5"
                                                            >
                                                                <CheckCircle size={12} />
                                                                Goedkeuren
                                                            </button>
                                                        )}
                                                        {r.status === 'approved' && (
                                                            <span className="text-[10px] text-zinc-500">Wacht op account</span>
                                                        )}
                                                        {r.status === 'completed' && (
                                                            <span className="text-[10px] text-emerald-500 flex items-center gap-1">
                                                                <CheckCircle size={10} />
                                                                Account aangemaakt
                                                            </span>
                                                        )}
                                                        <button
                                                            onClick={() => handleDeleteEarlyAccess(r.id)}
                                                            className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                            title="Verwijderen"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
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

