'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ChefHat, Eye, EyeOff, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { validateInvitationToken, completeEarlyAccess } from '@/lib/services/role';

function CompleteAccountContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');
    const supabase = createClient();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [tokenData, setTokenData] = useState<{ email?: string, request_id?: string } | null>(null);

    // Form state
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [statusLog, setStatusLog] = useState<string[]>([]);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        // If we have an active session (from invite link -> auth/callback -> here),
        // we can proceed without a token.
        const checkSession = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                // Determine email from user object
                setTokenData({
                    email: user.email,
                    request_id: 'session-active'
                });
                setLoading(false);
                return;
            }

            if (!token) {
                setLoading(false);
                return;
            }

            const result = await validateInvitationToken(token);
            if (result && result.valid) {
                setTokenData(result);
            } else {
                setError(result?.error || 'Ongeldige of verlopen uitnodiging.');
            }
            setLoading(false);
        };

        checkSession();
    }, [token, supabase.auth]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        setStatusLog([]);

        const addLog = (msg: string) => {
            console.info(`[CompleteAccount] ${msg}`);
            setStatusLog(prev => [...prev, msg]);
        };

        try {
            if (!tokenData?.email) throw new Error('Geen e-mailadres gevonden');

            addLog('Creating account...');

            // Check if we are already logged in (session-based)
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                // Update password for existing user
                const { error: updateError } = await supabase.auth.updateUser({
                    password: password
                });
                if (updateError) throw updateError;
            } else {
                // Token-based signups (Legacy / Direct)
                const { data: authData, error: authError } = await supabase.auth.signUp({
                    email: tokenData.email,
                    password: password,
                });
                if (authError) throw new Error(authError.message);
            }

            addLog('Completing early access...');
            const completionResult = await completeEarlyAccess(token!);

            if (!completionResult?.success) {
                // Even if this fails, auth might have succeeded, so maybe we shouldn't block?
                // But strictly following legacy logic:
                console.warn('Early access completion warning:', completionResult?.error);
            }

            setSuccess(true);
            addLog('Redirecting...');

            setTimeout(() => {
                router.push('/dashboard');
            }, 2000);

        } catch (err) {
            console.error('Account creation error:', err);
            setError(err instanceof Error ? err.message : 'Er is een fout opgetreden.');
        } finally {
            setSubmitting(false);
        }
    };

    if (success) {
        return (
            <div className="flex flex-col items-center justify-center space-y-6 text-center">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle size={32} />
                </div>
                <h2 className="text-3xl font-black text-zinc-900 tracking-tight">Account Aangemaakt!</h2>
                <p className="text-zinc-500">Je wordt doorgestuurd naar het dashboard...</p>
                <div className="text-xs text-zinc-400 font-mono mt-4 space-y-1">
                    {statusLog.map((log, i) => <div key={i}>{log}</div>)}
                </div>
            </div>
        );
    }

    if (!token) {
        return (
            <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle size={32} />
                </div>
                <h2 className="text-2xl font-bold text-zinc-900">Geen uitnodiging gevonden</h2>
                <p className="text-zinc-500">Controleer de link in je e-mail.</p>
                <button
                    onClick={() => router.push('/')}
                    className="px-6 py-2 bg-zinc-900 text-white rounded-lg text-sm font-bold"
                >
                    Terug naar Home
                </button>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center gap-4">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-zinc-500 text-sm font-medium">Uitnodiging controleren...</p>
            </div>
        );
    }

    if (error && !tokenData) {
        return (
            <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle size={32} />
                </div>
                <h2 className="text-2xl font-bold text-zinc-900">Ongeldige Uitnodiging</h2>
                <p className="text-zinc-500">{error}</p>
                <button
                    onClick={() => router.push('/')}
                    className="px-6 py-2 bg-zinc-900 text-white rounded-lg text-sm font-bold"
                >
                    Terug naar Home
                </button>
            </div>
        );
    }

    return (
        <div className="w-full max-w-sm space-y-8">
            <div className="space-y-2">
                <h2 className="text-3xl font-black text-zinc-900 tracking-tight">
                    Account Voltooien
                </h2>
                <p className="text-zinc-500 text-sm">
                    Welkom {tokenData?.email}! Stel een wachtwoord in om je account te activeren.
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
                        <AlertCircle size={14} />
                        {error}
                    </motion.div>
                )}

                <button
                    type="submit"
                    disabled={submitting}
                    className="w-full h-14 bg-zinc-900 hover:bg-black text-white rounded-2xl font-bold tracking-widest mt-4 transition-all active:scale-[0.98] flex items-center justify-center gap-3 group disabled:opacity-70"
                >
                    {submitting ? (
                        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                        <>
                            <span>Account Activeren</span>
                            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                        </>
                    )}
                </button>
            </form>
        </div>
    );
}

export default function CompleteAccountPage() {
    return (
        <div className="h-screen w-screen bg-white flex flex-col md:flex-row overflow-hidden fixed inset-0">
            {/* Left Side: Form */}
            <div className="w-full md:w-1/2 h-full flex flex-col items-center justify-center p-8 md:p-12 lg:p-20 relative z-10 bg-white">
                <div className="absolute top-8 left-8 md:top-12 md:left-12 flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 rotate-3">
                        <ChefHat size={20} className="text-primary-foreground" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black tracking-tighter text-zinc-900 leading-none">
                            Forkify
                        </h1>
                    </div>
                </div>

                <Suspense fallback={
                    <div className="flex flex-col items-center justify-center gap-4">
                        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                }>
                    <CompleteAccountContent />
                </Suspense>
            </div>

            {/* Right Side: Visuals */}
            <div className="hidden md:flex w-1/2 h-full relative overflow-hidden items-center justify-center bg-zinc-50 border-l border-zinc-100">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
                <div className="w-96 h-96 bg-primary/10 rounded-full blur-[100px]" />
            </div>
        </div>
    );
}
