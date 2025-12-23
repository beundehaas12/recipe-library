import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChefHat, Mail, Lock, Eye, EyeOff, Sparkles, Camera, Users, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchLandingPageRecipes } from '../lib/recipeService';
import { submitEarlyAccessRequest } from '../lib/roleService';
import BentoRecipeCard from './BentoRecipeCard';

export default function LoginScreen() {
    const { signIn, signUp } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [hasInvite, setHasInvite] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);
    const [recipes, setRecipes] = useState([]);

    // Waitlist states
    const [waitlistFirstName, setWaitlistFirstName] = useState('');
    const [waitlistLastName, setWaitlistLastName] = useState('');
    const [waitlistEmail, setWaitlistEmail] = useState('');
    const [waitlistLoading, setWaitlistLoading] = useState(false);
    const [waitlistMessage, setWaitlistMessage] = useState('');

    // Check for invitation token in URL and fetch landing recipes
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('invite')) {
            setHasInvite(true);
            setIsSignUp(true);
        }

        const loadRecipes = async () => {
            const data = await fetchLandingPageRecipes(15);
            setRecipes(data);
        };
        loadRecipes();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setLoading(true);

        try {
            if (isSignUp || hasInvite) {
                await signUp(email, password);
                setMessage('Account aangemaakt! Controleer je e-mail om te bevestigen.');
            } else {
                await signIn(email, password);
            }
        } catch (err) {
            setError(err.message === 'Invalid login credentials'
                ? 'Ongeldige inloggegevens'
                : err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleWaitlistSubmit = async (e) => {
        e.preventDefault();
        setWaitlistMessage('');
        setWaitlistLoading(true);

        try {
            const result = await submitEarlyAccessRequest(waitlistEmail, waitlistFirstName, waitlistLastName);
            if (result.success) {
                setWaitlistMessage('Je staat op de lijst! 🎉');
                setWaitlistEmail('');
                setWaitlistFirstName('');
                setWaitlistLastName('');
            } else {
                setWaitlistMessage(result.error || 'Er is iets misgegaan. Probeer het opnieuw.');
            }
        } catch (err) {
            console.error('Waitlist error:', err);
            setWaitlistMessage('Er is iets misgegaan. Probeer het opnieuw.');
        } finally {
            setWaitlistLoading(false);
        }
    };

    // Skeleton recipes for immediate animation start
    const skeletonRecipes = useMemo(() => Array.from({ length: 12 }).map((_, i) => ({
        id: `skeleton-${i}`,
        title: "Laden...",
        author_profile: null,
        user_id: null,
        image_url: null
    })), []);

    const displayRecipes = recipes.length > 0 ? recipes : skeletonRecipes;

    // Randomized order per column - moved outside JSX to comply with Hook rules
    const columnData = useMemo(() => {
        return [0, 1, 2].map((col) => {
            const durations = [180, 130, 260];
            const offsets = [0, -40, -90]; // Clear staggered start points (verspringing)

            return {
                duration: durations[col],
                offset: offsets[col] % durations[col],
                // Shuffle recipes uniquely for this column
                recipes: [...displayRecipes].sort(() => Math.random() - 0.5)
            };
        });
    }, [displayRecipes]);

    return (
        <div className="h-screen w-screen bg-white flex flex-col md:flex-row overflow-hidden fixed inset-0">
            {/* Left Side: Login Form (50%) */}
            <div className="w-full md:w-1/2 h-full flex flex-col items-center justify-center p-8 md:p-12 lg:p-20 relative z-10 bg-white">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="w-full max-w-sm space-y-12"
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

                    <div className="space-y-4">
                        <h2 className="text-4xl font-black text-zinc-900 tracking-tight">
                            {isSignUp || hasInvite ? 'Maak een account' : 'Welkom terug!'}
                        </h2>
                        <p className="text-zinc-500 text-lg">
                            {isSignUp || hasInvite
                                ? 'Sluit je aan bij onze culinaire community.'
                                : 'Log in op je persoonlijke receptenbibliotheek.'}
                        </p>
                    </div>

                    {/* Invitation Banner */}
                    {hasInvite && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-center gap-4"
                        >
                            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
                                <Users size={18} className="text-primary-foreground" />
                            </div>
                            <div>
                                <p className="text-zinc-900 font-bold text-xs uppercase tracking-tight">Je bent uitgenodigd! 🎉</p>
                                <p className="text-zinc-500 text-[11px]">Join een gedeelde bibliotheek.</p>
                            </div>
                        </motion.div>
                    )}

                    {/* Auth Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest ml-1">E-mailadres</label>
                            <div className="relative group/input">
                                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300 group-focus-within/input:text-primary transition-colors" />
                                <input
                                    type="email"
                                    placeholder="naam@voorbeeld.nl"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full h-14 pl-12 pr-4 bg-zinc-50 border border-zinc-200 rounded-2xl text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-medium"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest ml-1 flex justify-between">
                                Wachtwoord
                                {!isSignUp && !hasInvite && (
                                    <button type="button" className="text-primary hover:underline lowercase font-medium">Vergeten?</button>
                                )}
                            </label>
                            <div className="relative group/input">
                                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300 group-focus-within/input:text-primary transition-colors" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={6}
                                    className="w-full h-14 pl-12 pr-12 bg-zinc-50 border border-zinc-200 rounded-2xl text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-medium"
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
                                    <span>{isSignUp || hasInvite ? 'Account aanmaken' : 'Inloggen'}</span>
                                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="pt-8 border-t border-zinc-100 flex flex-col gap-4">
                        <div className="space-y-3">
                            <p className="text-zinc-500 text-xs font-medium leading-relaxed">
                                Geen account? Kookboek is momenteel alleen op uitnodiging.
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
                                        autoComplete="off"
                                        className="flex-1 h-10 px-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-primary transition-all"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Achternaam"
                                        value={waitlistLastName}
                                        onChange={(e) => setWaitlistLastName(e.target.value)}
                                        required
                                        autoComplete="off"
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
                                            autoComplete="off"
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
                                <p className="text-emerald-600 text-[10px] font-bold text-left px-1 animate-in fade-in slide-in-from-top-1">
                                    {waitlistMessage}
                                </p>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Right Side: Discovery area (50%) - ZERO borders/backgrounds */}
            <div className="hidden md:flex w-1/2 h-full relative overflow-hidden items-center justify-center bg-white">
                <div className="w-full h-full pr-6 relative flex gap-3">
                    {/* Continuous Scrolling Columns - Exactly 3 columns */}
                    {columnData.map((col, colIdx) => {
                        return (
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
                                    {/* Double the items for seamless loop */}
                                    {[...col.recipes, ...col.recipes].map((recipe, idx) => {
                                        return (
                                            <div
                                                key={`${colIdx}-${recipe.id}-${idx}`}
                                                className="w-full"
                                            >
                                                <BentoRecipeCard
                                                    recipe={recipe}
                                                    size="small"
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Ambient Blur Glows - Subtle depth */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/[0.02] blur-[100px] rounded-full -mr-64 -mt-64" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/[0.02] blur-[100px] rounded-full -ml-64 -mb-64" />
            </div>
        </div>
    );
}
