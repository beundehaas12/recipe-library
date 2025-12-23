import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, Users, Shield, User, Search, Clock, CheckCircle, Mail, UserPlus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import {
    getAllUsersWithRoles,
    updateUserRole,
    getRoleCounts,
    getEarlyAccessRequests,
    getEarlyAccessCounts,
    approveEarlyAccessRequest,
    deleteEarlyAccessRequest
} from '../../lib/roleService';
import DashboardLayout from './DashboardLayout';

export default function UserManagementPage() {
    const navigate = useNavigate();
    const { user, isAdmin, isAuthor, signOut, loading: authLoading } = useAuth();
    const [users, setUsers] = useState([]);
    const [earlyAccessRequests, setEarlyAccessRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [stats, setStats] = useState({ total: 0, admins: 0, authors: 0, users: 0 });
    const [earlyAccessStats, setEarlyAccessStats] = useState({ pending: 0, approved: 0, completed: 0 });
    const [updatingId, setUpdatingId] = useState(null);
    const [approvingId, setApprovingId] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const [collections, setCollections] = useState([]);
    const [activeTab, setActiveTab] = useState('users'); // 'users' or 'early-access'

    // Fetch collections for Sidebar consistency
    useEffect(() => {
        if (!user) return;
        supabase.from('collections').select('*').order('name').then(({ data }) => {
            if (data) setCollections(data);
        });
    }, [user]);

    // Data loading logic
    useEffect(() => {
        if (!authLoading && !isAdmin) {
            navigate('/dashboard');
            return;
        }

        if (isAdmin) {
            loadData();
        }
    }, [authLoading, isAdmin, navigate, user]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [usersData, statsData, earlyAccessData, earlyAccessStatsData] = await Promise.all([
                getAllUsersWithRoles(),
                getRoleCounts(),
                getEarlyAccessRequests(),
                getEarlyAccessCounts()
            ]);
            setUsers(usersData);
            setStats(statsData);
            setEarlyAccessRequests(earlyAccessData);
            setEarlyAccessStats(earlyAccessStatsData);
        } catch (error) {
            console.error('Failed to load user data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRoleChange = async (userId, newRole) => {
        setUpdatingId(userId);
        try {
            const { success, error } = await updateUserRole(userId, newRole);
            if (success) {
                setUsers(users.map(u =>
                    u.user_id === userId ? { ...u, role: newRole } : u
                ));
                const newStats = await getRoleCounts();
                setStats(newStats);
            } else {
                alert('Failed to update role: ' + error);
            }
        } catch (err) {
            console.error('Error changing role:', err);
        } finally {
            setUpdatingId(null);
        }
    };

    const handleApproveEarlyAccess = async (requestId) => {
        setApprovingId(requestId);
        try {
            const result = await approveEarlyAccessRequest(requestId);
            if (result.success) {
                // Update local state
                setEarlyAccessRequests(earlyAccessRequests.map(r =>
                    r.id === requestId ? { ...r, status: 'approved', invitation_token: result.invitation_token } : r
                ));

                // Update counts
                setEarlyAccessStats({
                    ...earlyAccessStats,
                    pending: earlyAccessStats.pending - 1,
                    approved: earlyAccessStats.approved + 1
                });

                // Show success message based on email status
                if (result.emailSent) {
                    alert(`✅ Goedgekeurd!\n\nEen uitnodigingsmail is verzonden naar ${result.email}.`);
                } else if (result.emailError) {
                    alert(`⚠️ Goedgekeurd, maar e-mail niet verzonden.\n\nE-mail: ${result.email}\nFout: ${result.emailError}\n\nDe gebruiker moet handmatig worden uitgenodigd.`);
                } else {
                    alert(`✅ Goedgekeurd!\n\nE-mail: ${result.email}`);
                }
            } else {
                alert('Kon niet goedkeuren: ' + result.error);
            }
        } catch (err) {
            console.error('Error approving early access:', err);
            alert('Er is een fout opgetreden');
        } finally {
            setApprovingId(null);
        }
    };

    const handleDeleteEarlyAccess = async (requestId) => {
        if (!confirm('Weet je zeker dat je dit verzoek wilt verwijderen?')) return;

        setDeletingId(requestId);
        try {
            const result = await deleteEarlyAccessRequest(requestId);
            if (result.success) {
                // Remove from local state
                const deleted = earlyAccessRequests.find(r => r.id === requestId);
                setEarlyAccessRequests(earlyAccessRequests.filter(r => r.id !== requestId));

                // Update counts
                if (deleted) {
                    setEarlyAccessStats({
                        ...earlyAccessStats,
                        [deleted.status]: earlyAccessStats[deleted.status] - 1
                    });
                }
            } else {
                alert('Kon verzoek niet verwijderen: ' + result.error);
            }
        } catch (err) {
            console.error('Error deleting early access:', err);
            alert('Er is een fout opgetreden');
        } finally {
            setDeletingId(null);
        }
    };

    // Filter users
    const filteredUsers = users.filter(user =>
        user.user_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Filter early access requests
    const filteredEarlyAccess = earlyAccessRequests.filter(req =>
        req.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Initial loading state
    if (authLoading) return (
        <div className="min-h-screen flex items-center justify-center bg-black">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
    );

    return (
        <DashboardLayout
            user={user}
            signOut={signOut}
            activeFilter={null}
            onFilterChange={() => navigate('/dashboard')}
            collections={collections}
            onCreateCollection={() => navigate('/dashboard')}
            isAdmin={isAdmin}
        >
            <div className="flex-1 bg-black text-foreground flex flex-col h-full overflow-hidden">
                {/* Header */}
                <div className="h-14 border-b border-white/10 px-6 flex items-center justify-between shrink-0 bg-zinc-950">
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
                        <StatBadge label="Admins" count={stats.admins} active={activeTab === 'users'} />
                        <StatBadge label="Authors" count={stats.authors} active={false} />
                        <StatBadge
                            label="Early Access"
                            count={earlyAccessStats.pending}
                            active={activeTab === 'early-access'}
                            highlight={earlyAccessStats.pending > 0}
                        />
                    </div>
                </div>

                {/* Tabs */}
                <div className="px-6 py-3 border-b border-white/5 flex gap-1 bg-zinc-950/50">
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${activeTab === 'users'
                            ? 'bg-white/10 text-white'
                            : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                            }`}
                    >
                        <Users size={14} className="inline mr-2" />
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
                        {earlyAccessStats.pending > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-400 font-bold">
                                {earlyAccessStats.pending}
                            </span>
                        )}
                    </button>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col min-h-0 bg-zinc-950/30">
                    {/* Toolbar */}
                    <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                        <div className="relative w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                            <input
                                type="text"
                                placeholder={activeTab === 'users' ? "Search users..." : "Search requests..."}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-zinc-900 border border-white/10 rounded-lg py-1.5 pl-9 pr-4 text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-zinc-600"
                            />
                        </div>

                        {activeTab === 'early-access' && (
                            <div className="flex gap-2">
                                <span className="text-[10px] text-zinc-500 flex items-center gap-1.5">
                                    <Clock size={12} /> Pending: {earlyAccessStats.pending}
                                </span>
                                <span className="text-[10px] text-emerald-500 flex items-center gap-1.5">
                                    <CheckCircle size={12} /> Approved: {earlyAccessStats.approved}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Table Container */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {loading ? (
                            <div className="flex items-center justify-center h-64">
                                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                            </div>
                        ) : activeTab === 'users' ? (
                            <div className="bg-zinc-900/50 border border-white/5 rounded-xl overflow-hidden">
                                {/* Table Header */}
                                <div className="grid grid-cols-12 gap-4 px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-white/5 bg-zinc-900/80">
                                    <div className="col-span-5">User</div>
                                    <div className="col-span-3">Role</div>
                                    <div className="col-span-2">Joined</div>
                                    <div className="col-span-2 text-right">Actions</div>
                                </div>

                                {/* User List */}
                                <div className="divide-y divide-white/5">
                                    {filteredUsers.length === 0 ? (
                                        <div className="text-center py-12 text-muted-foreground text-sm">
                                            No users found matching your search.
                                        </div>
                                    ) : (
                                        filteredUsers.map((user) => (
                                            <UserRow
                                                key={user.id}
                                                user={user}
                                                onRoleChange={handleRoleChange}
                                                isUpdating={updatingId === user.user_id}
                                            />
                                        ))
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="bg-zinc-900/50 border border-white/5 rounded-xl overflow-hidden">
                                {/* Early Access Table Header */}
                                <div className="grid grid-cols-12 gap-4 px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-white/5 bg-zinc-900/80">
                                    <div className="col-span-5">Email</div>
                                    <div className="col-span-2">Status</div>
                                    <div className="col-span-2">Requested</div>
                                    <div className="col-span-3 text-right">Actions</div>
                                </div>

                                {/* Early Access List */}
                                <div className="divide-y divide-white/5">
                                    {filteredEarlyAccess.length === 0 ? (
                                        <div className="text-center py-12 text-muted-foreground text-sm">
                                            No early access requests found.
                                        </div>
                                    ) : (
                                        filteredEarlyAccess.map((request) => (
                                            <EarlyAccessRow
                                                key={request.id}
                                                request={request}
                                                onApprove={handleApproveEarlyAccess}
                                                onDelete={handleDeleteEarlyAccess}
                                                isApproving={approvingId === request.id}
                                                isDeleting={deletingId === request.id}
                                            />
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}

function StatBadge({ label, count, active, highlight }) {
    return (
        <div className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-2 ${highlight
            ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
            : active
                ? 'bg-primary/10 border-primary/20 text-primary'
                : 'bg-zinc-900 border-white/10 text-muted-foreground'
            }`}>
            <span>{label}</span>
            <span className={`px-1.5 py-0.5 rounded-md ${highlight
                ? 'bg-amber-500 text-black'
                : active
                    ? 'bg-primary text-black'
                    : 'bg-white/10 text-white'
                }`}>
                {count}
            </span>
        </div>
    );
}

function UserRow({ user, onRoleChange, isUpdating }) {
    const getRoleColor = (role) => {
        switch (role) {
            case 'admin': return 'text-purple-400 bg-purple-400/10 border-purple-400/20';
            case 'author': return 'text-primary bg-primary/10 border-primary/20';
            default: return 'text-zinc-400 bg-zinc-800 border-white/10';
        }
    };

    return (
        <div className="grid grid-cols-12 gap-4 px-4 py-3 hover:bg-white/5 transition-colors items-center group">
            <div className="col-span-5 flex items-center gap-3 overflow-hidden">
                <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center shrink-0 border border-white/10 text-muted-foreground">
                    <User size={14} />
                </div>
                <div className="min-w-0">
                    <div className="text-sm font-medium text-zinc-200 truncate" title={user.user_id}>
                        {user.email || user.user_id}
                    </div>
                    {user.email && (
                        <div className="text-[10px] text-zinc-500 truncate font-mono">
                            {user.user_id.substring(0, 8)}...
                        </div>
                    )}
                </div>
            </div>

            <div className="col-span-3">
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border ${getRoleColor(user.role)}`}>
                    {user.role === 'admin' && <Shield size={10} />}
                    {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                </span>
            </div>

            <div className="col-span-2 text-xs text-zinc-500">
                {new Date(user.created_at).toLocaleDateString()}
            </div>

            <div className="col-span-2 flex justify-end">
                {isUpdating ? (
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                ) : (
                    <select
                        value={user.role}
                        onChange={(e) => onRoleChange(user.user_id, e.target.value)}
                        className="bg-black border border-white/10 text-xs text-zinc-400 rounded px-2 py-1 focus:outline-none focus:border-primary cursor-pointer hover:bg-zinc-800 hover:text-white transition-colors"
                    >
                        <option value="user">User</option>
                        <option value="author">Author</option>
                        <option value="admin">Admin</option>
                    </select>
                )}
            </div>
        </div>
    );
}

function EarlyAccessRow({ request, onApprove, onDelete, isApproving, isDeleting }) {
    const getStatusColor = (status) => {
        switch (status) {
            case 'approved': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
            case 'completed': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
            default: return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
        }
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'approved': return 'Goedgekeurd';
            case 'completed': return 'Voltooid';
            default: return 'Wachtend';
        }
    };

    return (
        <div className="grid grid-cols-12 gap-4 px-4 py-3 hover:bg-white/5 transition-colors items-center group">
            <div className="col-span-5 flex items-center gap-3 overflow-hidden">
                <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center shrink-0 border border-white/10 text-muted-foreground">
                    <Mail size={14} />
                </div>
                <div className="min-w-0">
                    <div className="text-sm font-medium text-zinc-200 truncate">
                        {request.email}
                    </div>
                </div>
            </div>

            <div className="col-span-2">
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border ${getStatusColor(request.status)}`}>
                    {request.status === 'pending' && <Clock size={10} />}
                    {request.status === 'approved' && <CheckCircle size={10} />}
                    {getStatusLabel(request.status)}
                </span>
            </div>

            <div className="col-span-2 text-xs text-zinc-500">
                {new Date(request.created_at).toLocaleDateString()}
            </div>

            <div className="col-span-3 flex justify-end gap-2">
                {isApproving || isDeleting ? (
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                ) : (
                    <>
                        {request.status === 'pending' && (
                            <button
                                onClick={() => onApprove(request.id)}
                                className="px-3 py-1.5 bg-primary hover:bg-primary/90 text-black text-[11px] font-bold rounded-lg transition-all flex items-center gap-1.5"
                            >
                                <CheckCircle size={12} />
                                Goedkeuren
                            </button>
                        )}
                        {request.status === 'approved' && (
                            <span className="text-[10px] text-zinc-500">Wacht op account voltooiing</span>
                        )}
                        {request.status === 'completed' && (
                            <span className="text-[10px] text-emerald-500 flex items-center gap-1">
                                <CheckCircle size={10} />
                                Account aangemaakt
                            </span>
                        )}
                        <button
                            onClick={() => onDelete(request.id)}
                            className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                            title="Verwijderen"
                        >
                            <Trash2 size={14} />
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
