'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ChefHat, Eye, EyeOff, ArrowRight, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function InviteAcceptPage() {
    const router = useRouter();
    const supabase = createClient();

    const [status, setStatus] = useState<'loading' | 'ready' | 'success' | 'error'>('loading');
    const [submitting, setSubmitting] = useState(false);
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [userEmail, setUserEmail] = useState('');

    useEffect(() => {
        const processInvite = async () => {
            try {
                // Get the hash from URL (contains access_token, refresh_token, type)
                const hash = window.location.hash;
                console.log('[invite-accept] Processing, hash present:', !!hash);
                console.log('[invite-accept] Full URL:', window.location.href);

                if (hash && (hash.includes('access_token') || hash.includes('type=invite') || hash.includes('type=recovery'))) {
                    console.log('[invite-accept] Token detected in URL');

                    // Parse the hash parameters
                    const hashParams = new URLSearchParams(hash.substring(1));
                    const accessToken = hashParams.get('access_token');
                    const refreshToken = hashParams.get('refresh_token');
                    const tokenType = hashParams.get('type');
                    const errorCode = hashParams.get('error_code');
                    const errorDescription = hashParams.get('error_description');

                    console.log('[invite-accept] Token type:', tokenType);
                    console.log('[invite-accept] Error code:', errorCode);
                    console.log('[invite-accept] Error description:', errorDescription);

                    // Check for error in URL first
                    if (errorCode || errorDescription) {
                        console.error('[invite-accept] Error in URL:', errorCode, errorDescription);
                        let errorMessage = 'Uitnodiging verlopen of ongeldig.';
                        if (errorDescription?.includes('expired')) {
                            errorMessage = 'Deze uitnodiging is verlopen. Vraag een nieuwe uitnodiging aan.';
                        } else if (errorDescription?.includes('used')) {
                            errorMessage = 'Deze uitnodiging is al gebruikt. Probeer in te loggen.';
                        }
                        setError(errorMessage);
                        setStatus('error');
                        return;
                    }

                    // If we have tokens, try to set the session explicitly
                    if (accessToken && refreshToken) {
                        console.log('[invite-accept] Setting session with tokens');
                        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
                            access_token: accessToken,
                            refresh_token: refreshToken,
                        });

                        if (sessionError) {
                            console.error('[invite-accept] setSession error:', sessionError);
                            let errorMessage = 'Kon uitnodiging niet verifiëren.';
                            if (sessionError.message?.includes('expired') || sessionError.message?.includes('invalid')) {
                                errorMessage = 'Deze uitnodiging is verlopen of ongeldig. Vraag een nieuwe uitnodiging aan.';
                            }
                            setError(errorMessage);
                            setStatus('error');
                            return;
                        }

                        if (sessionData.session) {
                            console.log('[invite-accept] Session established for:', sessionData.session.user.email);
                            setUserEmail(sessionData.session.user.email || '');
                            setStatus('ready');

                            // Clear the hash from URL for cleaner look
                            window.history.replaceState(null, '', window.location.pathname);
                            return;
                        }
                    }

                    // Fallback: wait for Supabase to auto-process and check session
                    await new Promise(resolve => setTimeout(resolve, 1500));
                    const { data: { session } } = await supabase.auth.getSession();

                    if (session) {
                        console.log('[invite-accept] Session found after wait:', session.user.email);
                        setUserEmail(session.user.email || '');
                        setStatus('ready');
                        window.history.replaceState(null, '', window.location.pathname);
                        return;
                    }
                }

                // No hash or no session - listen for auth changes
                const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
                    console.log('[invite-accept] Auth event:', event);

                    if ((event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY') && session) {
                        setUserEmail(session.user.email || '');
                        setStatus('ready');
                    }
                });

                // Fallback: check again after more time
                setTimeout(async () => {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (session) {
                        setUserEmail(session.user.email || '');
                        setStatus('ready');
                    } else if (status === 'loading') {
                        setError('Uitnodiging verlopen of ongeldig. Vraag een nieuwe uitnodiging aan.');
                        setStatus('error');
                    }
                }, 5000);

                return () => subscription.unsubscribe();
            } catch (err) {
                console.error('[invite-accept] Error:', err);
                setError('Er is iets misgegaan');
                setStatus('error');
            }
        };

        processInvite();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);

        try {
            const { error } = await supabase.auth.updateUser({ password });

            if (error) {
                throw error;
            }

            setStatus('success');

            // Redirect to home/dashboard after short delay
            setTimeout(() => {
                router.push('/');
            }, 2000);
        } catch (err) {
            console.error('[invite-accept] Error:', err);
            setError(err instanceof Error ? err.message : 'Er is iets misgegaan');
        } finally {
            setSubmitting(false);
        }
    };

    // Render as a full-page overlay to hide any underlying layout
    return (
        <div className="fixed inset-0 z-[9999] bg-white flex flex-col md:flex-row overflow-hidden">
            {/* Left Side: Content */}
            <div className="w-full md:w-1/2 min-h-screen flex flex-col items-center justify-center p-8 md:p-12 lg:p-20 relative bg-white">
                {/* Brand */}
                <div className="absolute top-8 left-8 md:top-12 md:left-12 flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 rotate-3">
                        <ChefHat size={20} className="text-primary-foreground" />
                    </div>
                    <h1 className="text-xl font-black tracking-tighter text-zinc-900 leading-none">
                        Forkify
                    </h1>
                </div>

                {status === 'loading' && (
                    <div className="flex flex-col items-center justify-center gap-4">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        <p className="text-zinc-500 text-sm">Uitnodiging verifiëren...</p>
                    </div>
                )}

                {status === 'error' && (
                    <div className="flex flex-col items-center justify-center space-y-6 text-center max-w-sm">
                        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
                            <AlertCircle size={32} />
                        </div>
                        <h2 className="text-2xl font-black text-zinc-900 tracking-tight">Oeps!</h2>
                        <p className="text-zinc-500">{error}</p>
                        <button
                            onClick={async () => {
                                // Sign out any stale session before redirecting to login
                                await supabase.auth.signOut();
                                router.push('/');
                            }}
                            className="px-6 py-3 bg-zinc-900 text-white rounded-xl font-bold hover:bg-black transition-all"
                        >
                            Naar login
                        </button>
                    </div>
                )}

                {status === 'success' && (
                    <div className="flex flex-col items-center justify-center space-y-6 text-center">
                        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle size={32} />
                        </div>
                        <h2 className="text-3xl font-black text-zinc-900 tracking-tight">Account Aangemaakt!</h2>
                        <p className="text-zinc-500">Je wordt doorgestuurd...</p>
                    </div>
                )}

                {status === 'ready' && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full max-w-sm space-y-8"
                    >
                        <div className="space-y-2">
                            <h2 className="text-3xl font-black text-zinc-900 tracking-tight">
                                Welkom bij Forkify
                            </h2>
                            <p className="text-zinc-500 text-sm">
                                {userEmail ? (
                                    <>Stel een wachtwoord in voor <strong>{userEmail}</strong></>
                                ) : (
                                    'Stel een wachtwoord in om je account te activeren.'
                                )}
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest ml-1">
                                    Nieuw wachtwoord
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        minLength={6}
                                        placeholder="••••••••"
                                        autoFocus
                                        className="w-full h-14 px-4 pr-12 bg-zinc-50 border border-zinc-200 rounded-2xl text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-medium"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-300 hover:text-zinc-500 transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                <p className="text-[10px] text-zinc-400 ml-1">Minimaal 6 karakters</p>
                            </div>

                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-red-600 text-[11px] font-bold flex items-center gap-2 bg-red-50 p-4 rounded-xl border border-red-100"
                                >
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                                    {error}
                                </motion.div>
                            )}

                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full h-14 bg-zinc-900 hover:bg-black text-white rounded-2xl font-bold tracking-widest mt-4 transition-all active:scale-[0.98] flex items-center justify-center gap-3 group disabled:opacity-70"
                            >
                                {submitting ? (
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                ) : (
                                    <>
                                        <span>Account Activeren</span>
                                        <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </form>
                    </motion.div>
                )}
            </div>

            {/* Right Side: Visual */}
            <div className="hidden md:flex w-1/2 h-screen relative overflow-hidden items-center justify-center bg-zinc-50 border-l border-zinc-100">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
                <div className="w-96 h-96 bg-primary/10 rounded-full blur-[100px]" />
            </div>
        </div>
    );
}
