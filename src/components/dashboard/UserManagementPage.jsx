import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Shield, User, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { getAllUsersWithRoles, updateUserRole, getRoleCounts } from '../../lib/roleService';
import DashboardLayout from './DashboardLayout';

export default function UserManagementPage() {
    const navigate = useNavigate();
    const { user, isAdmin, isAuthor, signOut, loading: authLoading } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [stats, setStats] = useState({ total: 0, admins: 0, authors: 0, users: 0 });
    const [updatingId, setUpdatingId] = useState(null);
    const [collections, setCollections] = useState([]);

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
            const [usersData, statsData] = await Promise.all([
                getAllUsersWithRoles(),
                getRoleCounts()
            ]);
            setUsers(usersData);
            setStats(statsData);
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

    // Filter users
    const filteredUsers = users.filter(user =>
        user.user_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()))
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
                        <StatBadge label="Admins" count={stats.admins} active={true} />
                        <StatBadge label="Authors" count={stats.authors} active={false} />
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col min-h-0 bg-zinc-950/30">
                    {/* Toolbar */}
                    <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                        <div className="relative w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                            <input
                                type="text"
                                placeholder="Search users..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-zinc-900 border border-white/10 rounded-lg py-1.5 pl-9 pr-4 text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-zinc-600"
                            />
                        </div>
                    </div>

                    {/* Table Container */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {loading ? (
                            <div className="flex items-center justify-center h-64">
                                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                            </div>
                        ) : (
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
                        )}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}

function StatBadge({ label, count, active }) {
    return (
        <div className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-2 ${active
                ? 'bg-primary/10 border-primary/20 text-primary'
                : 'bg-zinc-900 border-white/10 text-muted-foreground'
            }`}>
            <span>{label}</span>
            <span className={`px-1.5 py-0.5 rounded-md ${active ? 'bg-primary text-black' : 'bg-white/10 text-white'}`}>
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
