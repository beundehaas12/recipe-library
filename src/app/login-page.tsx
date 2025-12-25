'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChefHat, Eye, EyeOff, ArrowRight, Mail } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import type { Recipe } from '@/types/database';
import RecipeSlideshow from '@/components/RecipeSlideshow';

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

    // Waitlist states
    const [waitlistFirstName, setWaitlistFirstName] = useState('');
    const [waitlistLastName, setWaitlistLastName] = useState('');
    const [waitlistEmail, setWaitlistEmail] = useState('');
    const [waitlistLoading, setWaitlistLoading] = useState(false);
    const [waitlistMessage, setWaitlistMessage] = useState('');
    const [waitlistError, setWaitlistError] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            router.refresh();
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
        setWaitlistError(false);
        setWaitlistLoading(true);

        try {
            // Check if already on waitlist
            const { data: existing } = await supabase
                .from('waitlist')
                .select('status')
                .eq('email', waitlistEmail.toLowerCase().trim())
                .single();

            if (existing) {
                if (existing.status === 'pending') {
                    setWaitlistMessage('Je staat al op de wachtlijst! We nemen zo snel mogelijk contact op.');
                } else if (existing.status === 'invited') {
                    setWaitlistMessage('Je bent al uitgenodigd! Check je email voor de uitnodiging.');
                }
                return;
            }

            // Add to waitlist
            const { error } = await supabase
                .from('waitlist')
                .insert({
                    email: waitlistEmail.toLowerCase().trim(),
                    first_name: waitlistFirstName.trim(),
                    last_name: waitlistLastName.trim(),
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
            setWaitlistError(true);
        } finally {
            setWaitlistLoading(false);
        }
    };

    return (
        <div className="light min-h-[100dvh] w-full bg-background text-foreground flex flex-col md:flex-row md:h-screen md:fixed md:inset-0 md:overflow-hidden">
            {/* Left Side: Login Form (50%) */}
            <div className="w-full md:w-1/2 flex-1 md:flex-none md:h-full flex flex-col items-center pt-24 pb-12 md:py-0 md:justify-center px-6 md:px-12 lg:px-20 relative z-10 bg-background text-foreground">
                {/* Brand Section */}
                <div className="absolute top-8 left-8 md:top-12 md:left-12 flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 rotate-3">
                        <ChefHat size={20} className="text-primary-foreground" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black tracking-tighter text-foreground leading-none">
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
                        <h2 className="text-4xl font-black text-foreground tracking-tight">
                            Welkom bij Forkify
                        </h2>
                        <p className="text-muted-foreground text-sm">
                            Log in om door te gaan
                        </p>
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
                                className="w-full h-14 px-4 bg-secondary/50 border border-border rounded-2xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-medium"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest ml-1 flex justify-between">
                                Wachtwoord
                                <button type="button" className="text-primary hover:underline lowercase font-medium">Vergeten?</button>
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={6}
                                    className="w-full h-14 px-4 pr-12 bg-secondary/50 border border-border rounded-2xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-medium"
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

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full h-14 bg-zinc-900 hover:bg-black text-white rounded-2xl font-bold tracking-widest mt-4 transition-all active:scale-[0.98] flex items-center justify-center gap-3 group disabled:opacity-70"
                        >
                            {loading ? (
                                <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <span>Inloggen</span>
                                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Waitlist Section */}
                    <div className="pt-8 border-t border-border flex flex-col gap-4">
                        <div className="space-y-3">
                            <p className="text-zinc-500 text-xs font-medium leading-relaxed">
                                Geen account? Forkify is momenteel alleen op uitnodiging.
                                Meld je aan voor de wachtlijst.
                            </p>

                            <form onSubmit={handleWaitlistSubmit} className="space-y-2" autoComplete="off">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Voornaam"
                                        value={waitlistFirstName}
                                        onChange={(e) => setWaitlistFirstName(e.target.value)}
                                        required
                                        className="flex-1 h-10 px-3 bg-secondary/50 border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-all"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Achternaam"
                                        value={waitlistLastName}
                                        onChange={(e) => setWaitlistLastName(e.target.value)}
                                        required
                                        className="flex-1 h-10 px-3 bg-secondary/50 border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-all"
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
                                <p className={`text-[10px] font-bold text-left px-1 ${waitlistError ? 'text-red-600' : 'text-emerald-600'}`}>
                                    {waitlistMessage}
                                </p>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Right Side: Scrolling Recipe Cards (50%) */}
            <RecipeSlideshow recipes={initialRecipes} />
        </div>
    );
}
