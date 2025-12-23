import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Camera, Upload, Trash2, Save, Loader2, ArrowLeft, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from './DashboardLayout';
import { supabase } from '../../lib/supabase';
import {
    getAuthorProfile,
    updateAuthorProfile,
    uploadAuthorAvatar,
    deleteAuthorAvatar,
    getAuthorAvatarUrl
} from '../../lib/authorProfileService';

export default function AuthorProfilePage() {
    const navigate = useNavigate();
    const { user, isAuthor, loading: authLoading, signOut } = useAuth();
    const fileInputRef = useRef(null);

    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [collections, setCollections] = useState([]);

    // Form state
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');

    // Route guard
    useEffect(() => {
        if (!authLoading && !isAuthor) {
            navigate('/');
        }
    }, [authLoading, isAuthor, navigate]);

    // Fetch collections for sidebar
    useEffect(() => {
        if (!user) return;
        supabase.from('collections').select('*').order('name').then(({ data }) => {
            if (data) setCollections(data);
        });
    }, [user]);

    // Fetch author profile
    useEffect(() => {
        if (!user) return;

        async function fetchProfile() {
            const { data, error } = await getAuthorProfile();
            if (data) {
                setProfile(data);
                setFirstName(data.first_name || '');
                setLastName(data.last_name || '');
            }
            setLoading(false);
        }

        fetchProfile();
    }, [user]);

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setSaveSuccess(false);

        try {
            const { data, error } = await updateAuthorProfile({
                first_name: firstName,
                last_name: lastName
            });

            if (error) throw error;
            setProfile(data);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (error) {
            console.error('Save failed:', error);
            alert('Opslaan mislukt: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleAvatarUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Selecteer een geldig afbeeldingsbestand');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            alert('Afbeelding mag maximaal 5MB zijn');
            return;
        }

        setUploadingAvatar(true);
        try {
            const { data, error } = await uploadAuthorAvatar(file);
            if (error) throw error;
            setProfile(prev => ({ ...prev, avatar_url: data.avatar_url }));
        } catch (error) {
            console.error('Avatar upload failed:', error);
            alert('Uploaden mislukt: ' + error.message);
        } finally {
            setUploadingAvatar(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleAvatarDelete = async () => {
        if (!window.confirm('Weet je zeker dat je je profielfoto wilt verwijderen?')) return;

        setUploadingAvatar(true);
        try {
            const { error } = await deleteAuthorAvatar();
            if (error) throw error;
            setProfile(prev => ({ ...prev, avatar_url: null, avatar_storage_path: null }));
        } catch (error) {
            console.error('Avatar delete failed:', error);
            alert('Verwijderen mislukt: ' + error.message);
        } finally {
            setUploadingAvatar(false);
        }
    };

    if (authLoading || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
        );
    }

    const avatarUrl = getAuthorAvatarUrl(profile, user);
    const hasCustomAvatar = !!profile?.avatar_url;

    return (
        <DashboardLayout
            user={user}
            signOut={signOut}
            activeFilter={null}
            onFilterChange={() => navigate('/dashboard')}
            collections={collections}
            onCreateCollection={() => navigate('/dashboard')}
            isAdmin={false}
        >
            <div className="flex-1 bg-black text-foreground flex flex-col h-full overflow-hidden">
                {/* Header */}
                <div className="h-14 border-b border-white/10 px-6 flex items-center gap-4 shrink-0 bg-zinc-950">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="p-2 hover:bg-white/10 rounded-lg text-muted-foreground hover:text-white transition-colors"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <h1 className="text-lg font-bold text-white flex items-center gap-2">
                        <User className="text-primary" size={20} />
                        Author Profile
                    </h1>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8">
                    <div className="max-w-xl mx-auto">
                        <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-8">
                            {/* Avatar Section */}
                            <div className="flex flex-col items-center mb-8">
                                <div className="relative group mb-4">
                                    <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-zinc-800 bg-zinc-900 shadow-xl relative">
                                        {uploadingAvatar && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                                                <Loader2 className="animate-spin text-white" size={32} />
                                            </div>
                                        )}

                                        {avatarUrl ? (
                                            <img
                                                src={avatarUrl}
                                                alt="Author"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-zinc-600 bg-zinc-900">
                                                <User size={48} />
                                            </div>
                                        )}

                                        {/* Hover Overlay */}
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                                            <button
                                                onClick={() => fileInputRef.current?.click()}
                                                className="text-white hover:text-primary transition-colors p-2"
                                                title="Upload nieuwe foto"
                                            >
                                                <Camera size={24} />
                                            </button>
                                            {hasCustomAvatar && (
                                                <button
                                                    onClick={handleAvatarDelete}
                                                    className="text-red-400 hover:text-red-300 transition-colors p-2"
                                                    title="Verwijder foto"
                                                >
                                                    <Trash2 size={24} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleAvatarUpload}
                                    accept="image/*"
                                    className="hidden"
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploadingAvatar}
                                    className="text-xs font-bold uppercase tracking-wider text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
                                >
                                    <Upload size={14} />
                                    Foto uploaden
                                </button>
                            </div>

                            {/* Form */}
                            <form onSubmit={handleSave} className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                                            Voornaam
                                        </label>
                                        <input
                                            type="text"
                                            value={firstName}
                                            onChange={(e) => setFirstName(e.target.value)}
                                            placeholder="Je voornaam"
                                            className="w-full bg-zinc-800 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                                            Achternaam
                                        </label>
                                        <input
                                            type="text"
                                            value={lastName}
                                            onChange={(e) => setLastName(e.target.value)}
                                            placeholder="Je achternaam"
                                            className="w-full bg-zinc-800 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                                        />
                                    </div>
                                </div>

                                {/* Save Button */}
                                <div className="flex items-center gap-4">
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="bg-primary hover:bg-primary/90 text-black font-bold px-6 py-3 rounded-lg flex items-center gap-2 transition-all disabled:opacity-50"
                                    >
                                        {saving ? (
                                            <Loader2 size={18} className="animate-spin" />
                                        ) : (
                                            <Save size={18} />
                                        )}
                                        Opslaan
                                    </button>

                                    <AnimatePresence>
                                        {saveSuccess && (
                                            <motion.div
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0 }}
                                                className="flex items-center gap-2 text-green-400 text-sm font-medium"
                                            >
                                                <CheckCircle size={16} />
                                                Opgeslagen!
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </form>
                        </div>

                        {/* Info */}
                        <p className="text-xs text-muted-foreground text-center mt-6">
                            Dit profiel wordt getoond bij jouw recepten.
                        </p>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
