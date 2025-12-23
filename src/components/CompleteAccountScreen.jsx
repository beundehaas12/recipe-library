import { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { ChefHat, Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { validateInvitationToken, completeEarlyAccess } from '../lib/roleService';
import { fetchLandingPageRecipes } from '../lib/recipeService';
import BentoRecipeCard from './BentoRecipeCard';

export default function CompleteAccountScreen({ token, isInvitedUser, userEmail, onComplete }) {
    // Start loading by default to prevent prematute interaction
    const [loading, setLoading] = useState(true);
    const [validating, setValidating] = useState(!isInvitedUser);
    const [tokenData, setTokenData] = useState(isInvitedUser ? { email: userEmail } : null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    // Form state
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Recipe slideshow state
    const [recipes, setRecipes] = useState([]);

    // Log state moved to top level to fix Hook Error #321
    const [statusLog, setStatusLog] = useState([]);
    const logEndRef = useRef(null);

    // Auto-scroll log
    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [statusLog]);

    // Fetch recipes for slideshow
    useEffect(() => {
        const loadRecipes = async () => {
            const data = await fetchLandingPageRecipes(15);
            setRecipes(data);
        };
        loadRecipes();
    }, []);

    // Validate token on mount (only for token-based flow) OR check session for invite flow
    useEffect(() => {
        if (isInvitedUser) {
            // Check if we actually have a session
            const checkSession = async () => {
                const { data: { user } } = await supabase.auth.getUser();
                console.info('[CompleteAccount] Checking session for invited user:', user?.id);

                if (user) {
                    setTokenData({ email: user.email, userId: user.id });
                    setLoading(false);
                    setValidating(false);
                } else {
                    // Start polling/waiting for session (Supabase might be processing hash)
                    console.info('[CompleteAccount] No user yet, waiting for session...');
                    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
                        console.info('[CompleteAccount] Auth state change:', event, session?.user?.id);
                        if (session?.user) {
                            setTokenData({ email: session.user.email, userId: session.user.id });
                            setLoading(false);
                            setValidating(false);
                            subscription.unsubscribe();
                        }
                    });

                    // Fallback timeout if session never comes
                    setTimeout(() => {
                        setLoading((loading) => {
                            if (loading) {
                                console.error('[CompleteAccount] Session init timed out');
                                setError('Sessie kon niet worden gestart. Probeer opnieuw in te loggen via de link.');
                                setValidating(false);
                                return false;
                            }
                            return loading;
                        });
                    }, 5000); // Wait 5s for hash processing
                }
            };
            checkSession();
            return;
        }

        const validateToken = async () => {
            if (!token) {
                setError('Geen geldige uitnodigingslink.');
                setValidating(false);
                setLoading(false);
                return;
            }

            try {
                const result = await validateInvitationToken(token);
                if (result.valid) {
                    setTokenData(result);
                } else {
                    setError(result.error || 'Ongeldige of verlopen uitnodiging.');
                }
            } catch (err) {
                console.error('Token validation error:', err);
                setError('Er is een fout opgetreden bij het valideren.');
            } finally {
                setValidating(false);
                setLoading(false);
            }
        };

        validateToken();
    }, [token, isInvitedUser]);


    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        setStatusLog([]);

        const addLog = (msg) => {
            console.info(`[CompleteAccount] ${msg}`);
            setStatusLog(prev => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`]);
        };

        try {
            if (isInvitedUser) {
                // Fire password update (don't await - known to hang)
                supabase.auth.updateUser({ password });
                setSuccess(true);

            } else {
                // === TOKEN-BASED FLOW (Early Access) ===
                addLog('Creating account...');
                const { data: authData, error: authError } = await supabase.auth.signUp({
                    email: tokenData.email,
                    password: password
                });

                if (authError) {
                    throw new Error(authError.message);
                }

                addLog('Completing early access...');
                await completeEarlyAccess(token);

                setSuccess(true);
                setTimeout(() => {
                    if (onComplete) {
                        onComplete();
                    } else {
                        window.location.href = '/';
                    }
                }, 2000);
            }

        } catch (err) {
            console.error('Account creation error:', err);
            setError(err.message || 'Er is een fout opgetreden.');
        } finally {
            setSubmitting(false);
        }
    };

    // Skeleton recipes for loading
    const skeletonRecipes = useMemo(() => Array.from({ length: 12 }).map((_, i) => ({
        id: `skeleton-${i}`,
        title: "Laden...",
        author_profile: null,
        user_id: null,
        image_url: null
    })), []);

    const displayRecipes = recipes.length > 0 ? recipes : skeletonRecipes;

    // Column data for slideshow
    const columnData = useMemo(() => {
        return [0, 1, 2].map((col) => {
            const durations = [180, 130, 260];
            const offsets = [0, -40, -90];
            return {
                duration: durations[col],
                offset: offsets[col] % durations[col],
                recipes: [...displayRecipes].sort(() => Math.random() - 0.5)
            };
        });
    }, [displayRecipes]);

    // Loading state
    if (loading) {
        return (
            <div className="h-screen w-screen bg-white flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
        );
    }

    // Error state (invalid token)
    if (!tokenData && !validating) {
        return (
            <div className="h-screen w-screen bg-white flex flex-col items-center justify-center p-8">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="max-w-sm w-full text-center space-y-6"
                >
                    <div className="w-16 h-16 mx-auto bg-red-50 rounded-2xl flex items-center justify-center">
                        <AlertCircle size={32} className="text-red-500" />
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-2xl font-bold text-zinc-900">Oeps!</h1>
                        <p className="text-zinc-500">{error}</p>
                    </div>
                    <button
                        onClick={() => window.location.href = '/'}
                        className="px-6 py-3 bg-zinc-900 text-white rounded-xl font-medium hover:bg-black transition-colors"
                    >
                        Ga naar inloggen
                    </button>
                </motion.div>
            </div>
        );
    }

    // Success state - auto-redirect (names already collected at signup)
    if (success) {
        // Auto-redirect after short delay
        setTimeout(() => onComplete?.(), 1500);

        return (
            <div className="h-screen w-screen bg-white flex flex-col items-center justify-center p-8">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="max-w-sm w-full text-center space-y-6"
                >
                    <div className="w-16 h-16 mx-auto bg-emerald-50 rounded-2xl flex items-center justify-center">
                        <CheckCircle size={32} className="text-emerald-500" />
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-2xl font-bold text-zinc-900">Welkom! 🎉</h1>
                        <p className="text-zinc-500">
                            Je account is klaar. Een moment geduld...
                        </p>
                    </div>
                    <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full mx-auto" />
                </motion.div>
            </div>
        );
    }

    // Account completion form with slideshow
    return (
        <div className="h-screen w-screen bg-white flex flex-col md:flex-row overflow-hidden fixed inset-0">
            {/* Left Side: Form (50%) */}
            <div className="w-full md:w-1/2 h-full flex flex-col items-center justify-center p-8 md:p-12 lg:p-20 relative z-10 bg-white overflow-y-auto">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="w-full max-w-sm space-y-10"
                >
                    {/* Brand Section */}
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 rotate-3">
                            <ChefHat size={24} className="text-primary-foreground" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black tracking-tighter text-zinc-900 leading-none">
                                Forkify
                            </h1>
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Culinary Assistant</p>
                        </div>
                    </div>

                    {/* Welcome Message */}
                    <div className="space-y-4">
                        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center flex-shrink-0">
                                <CheckCircle size={18} className="text-white" />
                            </div>
                            <div>
                                <p className="text-emerald-700 font-bold text-xs uppercase tracking-tight">
                                    {isInvitedUser ? 'Welkom! 👋' : 'Gefeliciteerd! 🎉'}
                                </p>
                                <p className="text-emerald-600 text-[11px]">
                                    {isInvitedUser ? 'Je bent uitgenodigd.' : 'Je hebt early access gekregen.'}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <h2 className="text-3xl font-black text-zinc-900 tracking-tight">
                                Voltooi je account
                            </h2>
                            <p className="text-zinc-500">
                                Stel je profiel in voor <span className="font-medium text-zinc-700">{tokenData?.email}</span>
                            </p>
                        </div>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">

                        {/* Email (readonly) */}
                        <div className="space-y-2">
                            <label htmlFor="email" className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest ml-1">E-mailadres</label>
                            <div className="relative">
                                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300" />
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={tokenData?.email || ''}
                                    readOnly
                                    autoComplete="email"
                                    className="w-full h-12 pl-11 pr-4 bg-zinc-100 border border-zinc-200 rounded-xl text-zinc-500 font-medium text-sm cursor-not-allowed"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <label htmlFor="new-password" className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Wachtwoord</label>
                            <div className="relative group/input">
                                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300 group-focus-within/input:text-primary transition-colors" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    id="new-password"
                                    name="new-password"
                                    placeholder="Minimaal 6 tekens"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={6}
                                    autoComplete="new-password"
                                    className="w-full h-12 pl-11 pr-11 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-medium text-sm"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-300 hover:text-zinc-500 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {/* Confirm Password */}
                        <div className="space-y-2">
                            <label htmlFor="confirm-password" className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Bevestig wachtwoord</label>
                            <div className="relative group/input">
                                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300 group-focus-within/input:text-primary transition-colors" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    id="confirm-password"
                                    name="confirm-password"
                                    placeholder="Herhaal wachtwoord"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    autoComplete="new-password"
                                    className="w-full h-12 pl-11 pr-4 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-medium text-sm"
                                />
                            </div>
                        </div>

                        {/* Error */}
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

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full h-14 bg-zinc-900 hover:bg-black text-white rounded-2xl font-bold tracking-widest transition-all active:scale-[0.98] flex items-center justify-center gap-3 group disabled:opacity-70"
                        >
                            {submitting ? (
                                <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <span>Account voltooien</span>
                                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>
                </motion.div>

                {/* Status Log - VISIBLE NOW */}
                {statusLog.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="w-full bg-zinc-900 rounded-xl p-4 overflow-hidden mt-4"
                    >
                        <div className="h-32 overflow-y-auto font-mono text-[10px] space-y-1 text-zinc-400">
                            {statusLog.map((log, i) => (
                                <div key={i} className="border-b border-white/5 pb-0.5 last:border-0">
                                    {log}
                                </div>
                            ))}
                            <div ref={logEndRef} />
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Right Side: Recipe Slideshow (50%) */}
            <div className="hidden md:flex w-1/2 h-full relative overflow-hidden items-center justify-center bg-white">
                <div className="w-full h-full pr-6 relative flex gap-3">
                    {columnData.map((col, colIdx) => (
                        <div key={colIdx} className="flex-1 h-full overflow-hidden relative">
                            <div
                                style={{
                                    animationDuration: `${col.duration}s`,
                                    WebkitAnimationDuration: `${col.duration}s`,
                                    animationDelay: `${col.offset}s`,
                                    WebkitAnimationDelay: `${col.offset}s`
                                }}
                                className="animate-scroll-up flex flex-col gap-3"
                            >
                                {[...col.recipes, ...col.recipes].map((recipe, idx) => (
                                    <div key={`${colIdx}-${recipe.id}-${idx}`} className="w-full">
                                        <BentoRecipeCard recipe={recipe} size="small" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Ambient Blur Glows */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/[0.02] blur-[100px] rounded-full -mr-64 -mt-64" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/[0.02] blur-[100px] rounded-full -ml-64 -mb-64" />
            </div>
        </div >
    );
}
