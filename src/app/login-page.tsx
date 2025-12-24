'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChefHat, Mail, Eye, EyeOff, Users, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import type { Recipe } from '@/types/database';
import BentoRecipeCard from '@/components/BentoRecipeCard';

interface LoginPageProps {
    initialRecipes?: Recipe[];
}

export default function LoginPage({ initialRecipes = [] }: LoginPageProps) {
    const router = useRouter();
    const supabase = createClient();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);

    // Waitlist states
    const [waitlistFirstName, setWaitlistFirstName] = useState('');
    const [waitlistLastName, setWaitlistLastName] = useState('');
    const [waitlistEmail, setWaitlistEmail] = useState('');
    const [waitlistLoading, setWaitlistLoading] = useState(false);
    const [waitlistMessage, setWaitlistMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setLoading(true);

        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({ email, password });
                if (error) throw error;
                setMessage('Account aangemaakt! Controleer je e-mail om te bevestigen.');
            } else {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                router.refresh();
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Er ging iets mis';
            setError(message === 'Invalid login credentials' ? 'Ongeldige inloggegevens' : message);
        } finally {
            setLoading(false);
        }
    };

    const handleWaitlistSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setWaitlistMessage('');
        setWaitlistLoading(true);

        try {
            // Check if email already exists
            const { data: existing } = await supabase
                .from('early_access_requests')
                .select('status')
                .eq('email', waitlistEmail)
                .single();

            if (existing) {
                if (existing.status === 'pending') {
                    setWaitlistMessage('Je staat al op de wachtlijst! We nemen zo snel mogelijk contact op.');
                } else if (existing.status === 'approved') {
                    setWaitlistMessage('Je aanvraag is al goedgekeurd! Check je email voor de uitnodiging.');
                } else {
                    setWaitlistMessage('Je hebt al toegang! Probeer in te loggen.');
                }
                return;
            }

            const { error } = await supabase
                .from('early_access_requests')
                .insert({
                    first_name: waitlistFirstName,
                    last_name: waitlistLastName,
                    email: waitlistEmail,
                    status: 'pending'
                });

            if (error) throw error;

            setWaitlistMessage('Je staat op de lijst! 🎉 We sturen je een email zodra je toegang hebt.');
            setWaitlistEmail('');
            setWaitlistFirstName('');
            setWaitlistLastName('');
        } catch (err) {
            console.error('Waitlist error:', err);
            setWaitlistMessage('Er is iets misgegaan. Probeer het opnieuw.');
        } finally {
            setWaitlistLoading(false);
        }
    };

    // Skeleton recipes for animation
    const skeletonRecipes: Recipe[] = useMemo(() => Array.from({ length: 12 }).map((_, i) => ({
        id: `skeleton-${i}`,
        user_id: '',
        title: "Laden...",
        created_at: '',
        image_url: undefined,
    })), []);

    const displayRecipes = initialRecipes.length > 0 ? initialRecipes : skeletonRecipes;

    // Deterministic columns for SSR (no Math.random to avoid hydration mismatch)
    const columnData = useMemo(() => {
        return [0, 1, 2].map((col) => {
            const durations = [180, 130, 260];
            const offsets = [0, -40, -90];
            // Deterministic shuffle: offset recipes by column index
            const shuffled = [...displayRecipes].slice(col).concat([...displayRecipes].slice(0, col));
            return {
                duration: durations[col],
                offset: offsets[col] % durations[col],
                recipes: shuffled
            };
        });
    }, [displayRecipes]);

    return (
        <div className="h-screen w-screen bg-white flex flex-col md:flex-row overflow-hidden fixed inset-0">
            {/* Left Side: Login Form (50%) */}
            <div className="w-full md:w-1/2 h-full flex flex-col items-center justify-center p-8 md:p-12 lg:p-20 relative z-10 bg-white">
                {/* Brand Section */}
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

                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="w-full max-w-sm space-y-8"
                >
                    <div className="space-y-2">
                        <h2 className="text-4xl font-black text-zinc-900 tracking-tight">
                            Welkom bij Forkify
                        </h2>
                    </div>

                    {/* Auth Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest ml-1">E-mailadres</label>
                            <input
                                type="email"
                                placeholder="naam@voorbeeld.nl"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full h-14 px-4 bg-zinc-50 border border-zinc-200 rounded-2xl text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-medium"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest ml-1 flex justify-between">
                                Wachtwoord
                                {!isSignUp && (
                                    <button type="button" className="text-primary hover:underline lowercase font-medium">Vergeten?</button>
                                )}
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={6}
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

                        {message && (
                            <motion.div
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-emerald-600 text-[11px] font-bold flex items-center gap-2 bg-emerald-50 p-4 rounded-xl border border-emerald-100"
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                                {message}
                            </motion.div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full h-14 bg-zinc-900 hover:bg-black text-white rounded-2xl font-bold tracking-widest mt-4 transition-all active:scale-[0.98] flex items-center justify-center gap-3 group disabled:opacity-70"
                        >
                            {loading ? (
                                <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <span>{isSignUp ? 'Account aanmaken' : 'Inloggen'}</span>
                                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Waitlist Section */}
                    <div className="pt-8 border-t border-zinc-100 flex flex-col gap-4">
                        <div className="space-y-3">
                            <p className="text-zinc-500 text-xs font-medium leading-relaxed">
                                Geen account? Forkify is momenteel alleen op uitnodiging.
                                Meld je aan voor de vroege toegang lijst.
                            </p>

                            <form onSubmit={handleWaitlistSubmit} className="space-y-2" autoComplete="off">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Voornaam"
                                        value={waitlistFirstName}
                                        onChange={(e) => setWaitlistFirstName(e.target.value)}
                                        required
                                        className="flex-1 h-10 px-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-primary transition-all"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Achternaam"
                                        value={waitlistLastName}
                                        onChange={(e) => setWaitlistLastName(e.target.value)}
                                        required
                                        className="flex-1 h-10 px-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-primary transition-all"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-300" size={14} />
                                        <input
                                            type="email"
                                            placeholder="E-mailadres"
                                            value={waitlistEmail}
                                            onChange={(e) => setWaitlistEmail(e.target.value)}
                                            required
                                            className="w-full h-10 pl-9 pr-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-primary transition-all"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={waitlistLoading}
                                        className="px-4 h-10 bg-zinc-900 text-white rounded-xl text-[11px] font-bold uppercase tracking-wider hover:bg-black transition-all disabled:opacity-50 whitespace-nowrap"
                                    >
                                        {waitlistLoading ? '...' : 'Aanmelden'}
                                    </button>
                                </div>
                            </form>

                            {waitlistMessage && (
                                <p className="text-emerald-600 text-[10px] font-bold text-left px-1">
                                    {waitlistMessage}
                                </p>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Right Side: Scrolling Recipe Cards (50%) */}
            <div className="hidden md:flex w-1/2 h-full relative overflow-hidden items-center justify-center bg-white">
                <div className="w-full h-full pr-6 relative flex gap-3">
                    {columnData.map((col, colIdx) => (
                        <div key={colIdx} className="flex-1 h-full overflow-hidden relative">
                            <div
                                style={{
                                    animationDuration: `${col.duration}s`,
                                    animationDelay: `${col.offset}s`
                                }}
                                className="animate-scroll-up flex flex-col gap-3"
                            >
                                {/* Double for seamless loop */}
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
        </div>
    );
}
