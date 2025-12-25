'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ChefHat, Eye, EyeOff, ArrowRight, CheckCircle, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function InviteAcceptPage() {
    const router = useRouter();
    const supabase = createClient();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        const handleInvite = async () => {
            // First, sign out any existing session (important for admin testing)
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                console.log('[invite-accept] Signing out existing session');
                await supabase.auth.signOut();
            }

            // Supabase automatically handles the token from URL hash
            // The onAuthStateChange will fire when the recovery token is processed
            const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
                console.log('[invite-accept] Auth event:', event);
                if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
                    setLoading(false);
                }
            });

            // Also try to get current user after a short delay (token processing)
            setTimeout(async () => {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    setLoading(false);
                }
            }, 1000);

            return () => subscription.unsubscribe();
        };

        handleInvite();
    }, [supabase.auth]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);

        try {
            const { error } = await supabase.auth.updateUser({ password });

            if (error) {
                throw error;
            }

            setSuccess(true);

            // Redirect to dashboard after short delay
            setTimeout(() => {
                router.push('/dashboard');
            }, 2000);
        } catch (err) {
            console.error('[invite-accept] Error:', err);
            setError(err instanceof Error ? err.message : 'Er is iets misgegaan');
        } finally {
            setSubmitting(false);
        }
    };

    if (success) {
        return (
            <PageWrapper>
                <div className="flex flex-col items-center justify-center space-y-6 text-center">
                    <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                        <CheckCircle size={32} />
                    </div>
                    <h2 className="text-3xl font-black text-zinc-900 tracking-tight">Account Aangemaakt!</h2>
                    <p className="text-zinc-500">Je wordt doorgestuurd naar het dashboard...</p>
                </div>
            </PageWrapper>
        );
    }

    if (loading) {
        return (
            <PageWrapper>
                <div className="flex flex-col items-center justify-center gap-4">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    <p className="text-zinc-500 text-sm">Uitnodiging verifiëren...</p>
                </div>
            </PageWrapper>
        );
    }

    return (
        <PageWrapper>
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
                        Stel een wachtwoord in om je account te activeren.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest ml-1">
                            Wachtwoord
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                                placeholder="••••••••"
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
        </PageWrapper>
    );
}

function PageWrapper({ children }: { children: React.ReactNode }) {
    return (
        <div className="h-screen w-screen bg-white flex flex-col md:flex-row overflow-hidden fixed inset-0">
            {/* Left Side: Content */}
            <div className="w-full md:w-1/2 h-full flex flex-col items-center justify-center p-8 md:p-12 lg:p-20 relative z-10 bg-white">
                {/* Brand */}
                <div className="absolute top-8 left-8 md:top-12 md:left-12 flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 rotate-3">
                        <ChefHat size={20} className="text-primary-foreground" />
                    </div>
                    <h1 className="text-xl font-black tracking-tighter text-zinc-900 leading-none">
                        Forkify
                    </h1>
                </div>

                {children}
            </div>

            {/* Right Side: Visual */}
            <div className="hidden md:flex w-1/2 h-full relative overflow-hidden items-center justify-center bg-zinc-50 border-l border-zinc-100">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
                <div className="w-96 h-96 bg-primary/10 rounded-full blur-[100px]" />
            </div>
        </div>
    );
}
