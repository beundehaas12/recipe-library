import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCheck, Clock, Plus, Edit3, Trash2, FolderPlus, Folder, Info } from 'lucide-react';
import { fetchActivities, markAllAsRead } from '../../lib/activityService';
import { supabase } from '../../lib/supabase'; // logic for realtime

export default function ActivityPanel({ isOpen, onClose, userId }) {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(false);

    // Initial Fetch
    useEffect(() => {
        if (isOpen && userId) {
            loadActivities();
        }
    }, [isOpen, userId]);

    // Real-time subscription
    useEffect(() => {
        if (!userId) return;

        const channel = supabase
            .channel('activity-log')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'user_activities', filter: `user_id=eq.${userId}` },
                (payload) => {
                    // Prepend new activity
                    setActivities(prev => [payload.new, ...prev]);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId]);

    const loadActivities = async () => {
        setLoading(true);
        try {
            const data = await fetchActivities(userId);
            setActivities(data);
        } catch (error) {
            console.error('Failed to load activities', error);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAllRead = async () => {
        // Optimistic update
        setActivities(prev => prev.map(a => ({ ...a, read: true })));
        try {
            await markAllAsRead(userId);
        } catch (error) {
            console.error('Failed to mark read', error);
        }
    };

    const getIcon = (type) => {
        switch (type) {
            case 'create_recipe': return <Plus size={16} className="text-green-500" />;
            case 'update_recipe': return <Edit3 size={16} className="text-blue-500" />;
            case 'delete_recipe': return <Trash2 size={16} className="text-red-500" />;
            case 'create_collection': return <FolderPlus size={16} className="text-amber-500" />;
            case 'add_to_collection': return <Folder size={16} className="text-purple-500" />;
            default: return <Info size={16} className="text-gray-500" />;
        }
    };

    const formatTime = (isoString) => {
        const date = new Date(isoString);
        const now = new Date();
        const diffFrames = (now - date) / 1000; // seconds

        if (diffFrames < 60) return 'Zojuist';
        if (diffFrames < 3600) return `${Math.floor(diffFrames / 60)}m geleden`;
        if (diffFrames < 86400) return `${Math.floor(diffFrames / 3600)}u geleden`;
        return date.toLocaleDateString();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[90]"
                    />

                    {/* Panel */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                        className="fixed top-0 right-0 bottom-0 w-80 lg:w-96 bg-zinc-950 border-l border-white/10 shadow-2xl z-[100] flex flex-col"
                    >
                        {/* Header */}
                        <div className="h-14 border-b border-white/10 flex items-center justify-between px-4 bg-zinc-950/80 backdrop-blur-md">
                            <h2 className="font-bold text-white tracking-tight flex items-center gap-2">
                                <Clock size={18} />
                                Activiteit
                            </h2>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={handleMarkAllRead}
                                    title="Markeer alles als gelezen"
                                    className="p-2 hover:bg-white/10 rounded-lg text-muted-foreground hover:text-primary transition-colors"
                                >
                                    <CheckCheck size={18} />
                                </button>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-white/10 rounded-lg text-muted-foreground hover:text-white transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {loading ? (
                                <div className="text-center py-10 text-muted-foreground">Laden...</div>
                            ) : activities.length === 0 ? (
                                <div className="text-center py-10 text-muted-foreground">Geen recente activiteit</div>
                            ) : (
                                activities.map((activity) => (
                                    <div
                                        key={activity.id}
                                        className={`flex gap-3 p-3 rounded-xl border transition-colors ${activity.read ? 'bg-transparent border-transparent opacity-60' : 'bg-white/5 border-white/10'
                                            }`}
                                    >
                                        <div className={`w-8 h-8 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center shrink-0`}>
                                            {getIcon(activity.type)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-white/90 leading-tight">
                                                {activity.description}
                                            </p>
                                            <span className="text-[10px] uppercase font-bold text-muted-foreground mt-1 block">
                                                {formatTime(activity.created_at)}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
