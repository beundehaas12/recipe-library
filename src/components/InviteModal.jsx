import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Copy, Check, Trash2, UserPlus, Users, Shield, Crown, Loader2 } from 'lucide-react';
import { inviteToWorkspace, getWorkspaceInvitations, cancelInvitation, getWorkspaceMembersBasic, removeMember } from '../lib/workspaceService';

export default function InviteModal({ workspace, currentUserId, onClose, onMembersChange }) {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [invitations, setInvitations] = useState([]);
    const [members, setMembers] = useState([]);
    const [copied, setCopied] = useState(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const isOwner = workspace?.owner_id === currentUserId;

    useEffect(() => {
        if (workspace?.id) {
            loadData();
        }
    }, [workspace?.id]);

    const loadData = async () => {
        try {
            const [invs, mems] = await Promise.all([
                getWorkspaceInvitations(workspace.id),
                getWorkspaceMembersBasic(workspace.id)
            ]);
            setInvitations(invs || []);
            setMembers(mems || []);
        } catch (err) {
            console.error('Failed to load workspace data:', err);
        }
    };

    const handleInvite = async (e) => {
        e.preventDefault();
        if (!email.trim()) return;

        setIsLoading(true);
        setError('');
        setSuccess('');

        try {
            const invitation = await inviteToWorkspace(workspace.id, email.trim(), currentUserId);
            setInvitations([...invitations, invitation]);
            setEmail('');
            setSuccess(`Uitnodiging verstuurd naar ${email}`);
        } catch (err) {
            setError(err.message || 'Kon uitnodiging niet versturen');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopyLink = (invitation) => {
        const link = `${window.location.origin}?invite=${invitation.token}`;
        navigator.clipboard.writeText(link);
        setCopied(invitation.id);
        setTimeout(() => setCopied(null), 2000);
    };

    const handleCancelInvitation = async (invitationId) => {
        try {
            await cancelInvitation(invitationId);
            setInvitations(invitations.filter(i => i.id !== invitationId));
        } catch (err) {
            setError('Kon uitnodiging niet annuleren');
        }
    };

    const handleRemoveMember = async (userId) => {
        if (!confirm('Weet je zeker dat je dit lid wilt verwijderen?')) return;

        try {
            await removeMember(workspace.id, userId);
            setMembers(members.filter(m => m.user_id !== userId));
            onMembersChange?.();
        } catch (err) {
            setError('Kon lid niet verwijderen');
        }
    };

    const getRoleIcon = (role) => {
        switch (role) {
            case 'owner': return <Crown size={14} className="text-yellow-500" />;
            case 'admin': return <Shield size={14} className="text-blue-400" />;
            default: return null;
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Users size={20} className="text-primary" />
                            Beheer Toegang
                        </h2>
                        <p className="text-white/50 text-sm mt-1">{workspace?.name}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Invite Form */}
                    {isOwner && (
                        <form onSubmit={handleInvite} className="space-y-3">
                            <label className="text-sm font-medium text-white/70 block">
                                Nodig iemand uit
                            </label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={18} />
                                    <input
                                        type="email"
                                        placeholder="email@voorbeeld.nl"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="input-standard pl-10 !rounded-xl"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={isLoading || !email.trim()}
                                    className="btn-primary !px-4 !rounded-xl flex items-center gap-2 disabled:opacity-50"
                                >
                                    {isLoading ? (
                                        <Loader2 size={18} className="animate-spin" />
                                    ) : (
                                        <UserPlus size={18} />
                                    )}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Feedback Messages */}
                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm"
                            >
                                {error}
                            </motion.div>
                        )}
                        {success && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-green-400 text-sm"
                            >
                                {success}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Pending Invitations */}
                    {invitations.length > 0 && (
                        <div className="space-y-3">
                            <h3 className="text-sm font-bold text-white/50 uppercase tracking-wider">
                                Uitnodigingen ({invitations.length})
                            </h3>
                            <div className="space-y-2">
                                {invitations.map(inv => (
                                    <div
                                        key={inv.id}
                                        className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold">
                                                {inv.email[0].toUpperCase()}
                                            </div>
                                            <span className="text-white/80 text-sm">{inv.email}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => handleCopyLink(inv)}
                                                className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-colors"
                                                title="Kopieer link"
                                            >
                                                {copied === inv.id ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                                            </button>
                                            {isOwner && (
                                                <button
                                                    onClick={() => handleCancelInvitation(inv.id)}
                                                    className="w-8 h-8 rounded-lg hover:bg-red-500/20 flex items-center justify-center text-white/40 hover:text-red-400 transition-colors"
                                                    title="Annuleren"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Current Members */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-white/50 uppercase tracking-wider">
                            Leden ({members.length})
                        </h3>
                        <div className="space-y-2">
                            {members.map(member => (
                                <div
                                    key={member.id}
                                    className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white text-sm font-bold">
                                            ?
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-white/80 text-sm">
                                                    {member.user_id === currentUserId ? 'Jij' : 'Lid'}
                                                </span>
                                                {getRoleIcon(member.role)}
                                            </div>
                                            <span className="text-white/40 text-xs capitalize">{member.role}</span>
                                        </div>
                                    </div>
                                    {isOwner && member.user_id !== currentUserId && (
                                        <button
                                            onClick={() => handleRemoveMember(member.user_id)}
                                            className="w-8 h-8 rounded-lg hover:bg-red-500/20 flex items-center justify-center text-white/40 hover:text-red-400 transition-colors"
                                            title="Verwijderen"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}
