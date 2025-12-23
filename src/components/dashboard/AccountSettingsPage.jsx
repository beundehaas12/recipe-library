import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { requestAccountDeletion, getAvatarUrl } from '../../lib/profileService';
import AvatarUpload from '../AvatarUpload';
import { User, Settings, ShieldAlert, Save, Loader2, Mail, Globe, Moon, Sun, Monitor, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AccountSettingsPage() {
    const {
        user,
        profile,
        preferences,
        updateProfile,
        updatePreferences,
        refreshProfile,
        loading: authLoading
    } = useAuth();

    const [activeTab, setActiveTab] = useState('profile');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState(null);

    // Form states
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [bio, setBio] = useState('');

    const [theme, setTheme] = useState('system');
    const [language, setLanguage] = useState('nl');
    const [emailNotifications, setEmailNotifications] = useState(true);

    // Load initial data
    useEffect(() => {
        if (profile) {
            setFirstName(profile.first_name || '');
            setLastName(profile.last_name || '');
            setBio(profile.bio || '');
        }
        if (preferences) {
            setTheme(preferences.theme || 'system');
            setLanguage(preferences.language || 'nl');
            setEmailNotifications(preferences.email_notifications ?? true);
        }
    }, [profile, preferences]);

    const handleProfileSave = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage(null);
        try {
            const { error } = await updateProfile({
                first_name: firstName,
                last_name: lastName,
                bio: bio
            });
            if (error) throw error;
            setMessage({ type: 'success', text: 'Profiel bijgewerkt' });
        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: 'Opslaan mislukt: ' + err.message });
        } finally {
            setIsLoading(false);
        }
    };

    const handlePreferencesSave = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage(null);
        try {
            const { error } = await updatePreferences({
                theme,
                language,
                email_notifications: emailNotifications
            });
            if (error) throw error;
            setMessage({ type: 'success', text: 'Voorkeuren opgeslagen' });
        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: 'Opslaan mislukt: ' + err.message });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteAccount = async () => {
        const confirmText = prompt('Typ "VERWIJDEREN" om je account permanent te verwijderen. Dit kan niet ongedaan worden gemaakt.');
        if (confirmText !== 'VERWIJDEREN') return;

        setIsLoading(true);
        try {
            const result = await requestAccountDeletion('User requested deletion via settings');
            if (!result.success) throw result.error;
            alert('Je account is gemarkeerd voor verwijdering. Je wordt nu uitgelogd.');
            window.location.reload(); // Force reload to trigger auth state change/logout
        } catch (err) {
            console.error(err);
            alert('Verwijderen mislukt: ' + err.message);
        } finally {
            setIsLoading(false);
        }
    };
    const handleAvatarUpdate = async (newUrl) => {
        // Trigger profile refresh in context since AvatarUpload already updated DB
        if (newUrl === null) {
            // Handle delete case if it returns null
            await updateProfile({ avatar_url: null });
        } else {
            await updateProfile({ avatar_url: newUrl });
        }
    };

    const handleRandomizeAvatar = async () => {
        setIsLoading(true);
        try {
            // Generate a random seed
            const newSeed = Math.random().toString(36).substring(7);

            // Update profile metadata with new seed
            // Preserve existing metadata
            const currentMetadata = profile?.metadata || {};

            const { error } = await updateProfile({
                metadata: {
                    ...currentMetadata,
                    avatar_seed: newSeed
                }
            });

            if (error) throw error;
        } catch (error) {
            console.error('Randomization failed:', error);
            setMessage({ type: 'error', text: 'Kon avatar niet wijzigen' });
        } finally {
            setIsLoading(false);
        }
    };

    if (authLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="animate-spin text-primary" size={32} />
            </div>
        );
    }

    const tabs = [
        { id: 'profile', label: 'Profiel', icon: User },
        { id: 'preferences', label: 'Voorkeuren', icon: Settings },
        { id: 'account', label: 'Account', icon: ShieldAlert },
    ];

    return (
        <div className="h-full overflow-y-auto bg-black text-white p-6 md:p-12">
            <div className="max-w-4xl mx-auto">
                <div className="mb-6">
                    <button
                        onClick={() => window.history.back()}
                        className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft size={20} />
                        <span>Terug</span>
                    </button>
                </div>
                <header className="mb-12">
                    <h1 className="text-3xl font-bold mb-2">Instellingen</h1>
                    <p className="text-zinc-400">Beheer je profiel, voorkeuren en accountinstellingen.</p>
                </header>

                <div className="flex flex-col md:flex-row gap-8">
                    {/* Tabs Sidebar */}
                    <nav className="w-full md:w-64 shrink-0 space-y-2">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => {
                                    setActiveTab(tab.id);
                                    setMessage(null);
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === tab.id
                                    ? 'bg-zinc-800 text-white shadow-lg'
                                    : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                                    }`}
                            >
                                <tab.icon size={18} />
                                {tab.label}
                            </button>
                        ))}
                    </nav>

                    {/* Content Area */}
                    <div className="flex-1 min-w-0">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                            >
                                {message && (
                                    <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${message.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                        }`}>
                                        {message.type === 'success' ? <Save size={16} /> : <ShieldAlert size={16} />}
                                        <span className="text-sm font-medium">{message.text}</span>
                                    </div>
                                )}

                                {activeTab === 'profile' && (
                                    <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 md:p-8 space-y-8">
                                        <section>
                                            <div className="flex justify-center mb-8">
                                                <AvatarUpload
                                                    currentAvatarUrl={getAvatarUrl(profile, user)}
                                                    isCustomAvatar={!!profile?.avatar_url}
                                                    onAvatarUpdate={handleAvatarUpdate}
                                                    onRandomize={handleRandomizeAvatar}
                                                />
                                            </div>
                                        </section>

                                        <div className="w-full h-px bg-white/5" />

                                        <form onSubmit={handleProfileSave} className="space-y-6">
                                            <div className="grid gap-6 md:grid-cols-2">
                                                <div className="space-y-2">
                                                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Voornaam</label>
                                                    <input
                                                        type="text"
                                                        value={firstName}
                                                        onChange={(e) => setFirstName(e.target.value)}
                                                        className="w-full bg-zinc-950 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                                        placeholder="Voornaam"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Achternaam</label>
                                                    <input
                                                        type="text"
                                                        value={lastName}
                                                        onChange={(e) => setLastName(e.target.value)}
                                                        className="w-full bg-zinc-950 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                                        placeholder="Achternaam"
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid gap-6 md:grid-cols-2">
                                                <div className="space-y-2">
                                                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Email</label>
                                                    <input
                                                        type="email"
                                                        value={user?.email || ''}
                                                        disabled
                                                        className="w-full bg-zinc-950/50 border border-white/5 rounded-lg px-4 py-3 text-zinc-500 cursor-not-allowed"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Bio</label>
                                                <textarea
                                                    value={bio}
                                                    onChange={(e) => setBio(e.target.value)}
                                                    rows={4}
                                                    className="w-full bg-zinc-950 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none"
                                                    placeholder="Vertel iets over jezelf..."
                                                />
                                            </div>

                                            <div className="pt-4 flex justify-end">
                                                <button
                                                    type="submit"
                                                    disabled={isLoading}
                                                    className="btn-primary flex items-center gap-2"
                                                >
                                                    {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                                    Opslaan
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                )}

                                {activeTab === 'preferences' && (
                                    <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 md:p-8">
                                        <form onSubmit={handlePreferencesSave} className="space-y-8">
                                            <section className="space-y-4">
                                                <h3 className="text-lg font-bold flex items-center gap-2">
                                                    <Monitor size={20} className="text-primary" />
                                                    Thema
                                                </h3>
                                                <div className="grid grid-cols-3 gap-4">
                                                    {[
                                                        { id: 'light', label: 'Licht', icon: Sun },
                                                        { id: 'dark', label: 'Donker', icon: Moon },
                                                        { id: 'system', label: 'Systeem', icon: Monitor },
                                                    ].map((t) => (
                                                        <button
                                                            key={t.id}
                                                            type="button"
                                                            onClick={() => setTheme(t.id)}
                                                            className={`flex flex-col items-center gap-3 p-4 rounded-xl border transition-all ${theme === t.id
                                                                ? 'bg-primary/10 border-primary text-primary'
                                                                : 'bg-zinc-950 border-white/10 text-zinc-400 hover:border-white/20 hover:text-zinc-200'
                                                                }`}
                                                        >
                                                            <t.icon size={24} />
                                                            <span className="text-sm font-medium">{t.label}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </section>

                                            <div className="w-full h-px bg-white/5" />

                                            <section className="space-y-4">
                                                <h3 className="text-lg font-bold flex items-center gap-2">
                                                    <Globe size={20} className="text-primary" />
                                                    Taal
                                                </h3>
                                                <select
                                                    value={language}
                                                    onChange={(e) => setLanguage(e.target.value)}
                                                    className="w-full bg-zinc-950 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                                                >
                                                    <option value="nl">Nederlands</option>
                                                    <option value="en">English</option>
                                                    <option value="fr">Français</option>
                                                </select>
                                            </section>

                                            <div className="w-full h-px bg-white/5" />

                                            <section className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <h3 className="text-lg font-bold flex items-center gap-2">
                                                        <Mail size={20} className="text-primary" />
                                                        Email Notificaties
                                                    </h3>
                                                    <label className="relative inline-flex items-center cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={emailNotifications}
                                                            onChange={(e) => setEmailNotifications(e.target.checked)}
                                                            className="sr-only peer"
                                                        />
                                                        <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                                    </label>
                                                </div>
                                                <p className="text-sm text-zinc-400">
                                                    Ontvang updates over nieuwe functies en activiteiten in je workspace.
                                                </p>
                                            </section>

                                            <div className="pt-4 flex justify-end">
                                                <button
                                                    type="submit"
                                                    disabled={isLoading}
                                                    className="btn-primary flex items-center gap-2"
                                                >
                                                    {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                                    Voorkeuren opslaan
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                )}

                                {activeTab === 'account' && (
                                    <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6 md:p-8 space-y-6">
                                        <div className="flex items-start gap-4">
                                            <div className="p-3 bg-red-500/10 rounded-xl text-red-500">
                                                <ShieldAlert size={32} />
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-bold text-red-500 mb-2">Account Verwijderen</h2>
                                                <p className="text-zinc-400 text-sm leading-relaxed mb-4">
                                                    Als je je account verwijdert, worden al je gegevens permanent gewist.
                                                    Dit omvat je profiel, recepten die je niet hebt gedeeld, en je voorkeuren.
                                                    Dit kan niet ongedaan worden gemaakt.
                                                </p>
                                                <button
                                                    onClick={handleDeleteAccount}
                                                    className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/50 rounded-lg text-sm font-bold uppercase tracking-wider transition-colors"
                                                >
                                                    Account definitief verwijderen
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
}
