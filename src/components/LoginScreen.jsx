import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChefHat, Mail, Lock, Eye, EyeOff, Sparkles, Camera } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
    const { signIn, signUp } = useAuth();
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setLoading(true);

        try {
            if (isSignUp) {
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

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Ambient background glow */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] bg-[radial-gradient(circle_at_center,var(--primary-glow)_0%,transparent_70%)] opacity-20 pointer-events-none" />
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/5 via-transparent to-blue-500/5" />
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="relative z-10 flex flex-col items-center max-w-md w-full"
            >
                {/* Logo Section */}
                <motion.div
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.6 }}
                    className="mb-12 relative group"
                >
                    <div className="absolute -inset-4 bg-primary/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="w-24 h-24 glass-panel border-primary/30 rounded-[var(--radius)] flex items-center justify-center shadow-2xl relative">
                        <ChefHat size={48} className="text-primary" />
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                            className="absolute -top-2 -right-2 w-8 h-8 glass-panel border-primary/20 rounded-lg flex items-center justify-center"
                        >
                            <Sparkles size={16} className="text-primary" />
                        </motion.div>
                    </div>
                </motion.div>

                {/* Title & Subtitle */}
                <div className="text-center mb-10 space-y-3">
                    <motion.h1
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, duration: 0.5 }}
                        className="text-5xl md:text-6xl font-black text-white tracking-tighter"
                    >
                        KOOK<span className="text-primary">BOEK</span>
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4, duration: 0.5 }}
                        className="text-muted-foreground font-medium text-lg tracking-wide uppercase text-[10px]"
                    >
                        Jouw AI-gestuurde culinaire assistent
                    </motion.p>
                </div>

                {/* Main Auth Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.6 }}
                    className="w-full glass-panel p-8 shadow-2xl relative overflow-hidden group"
                >
                    {/* Inner subtle glow */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full -mr-16 -mt-16 pointer-events-none" />

                    <h2 className="text-2xl font-black text-white mb-8">
                        {isSignUp ? 'Account aanmaken' : 'Inloggen'}
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">E-mailadres</label>
                            <div className="relative group/input">
                                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within/input:text-primary transition-colors" />
                                <input
                                    type="email"
                                    placeholder="naam@voorbeeld.nl"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="input-standard pl-12"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Wachtwoord</label>
                            <div className="relative group/input">
                                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within/input:text-primary transition-colors" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={6}
                                    className="input-standard pl-12 pr-12"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-red-400 text-xs font-bold text-center bg-red-500/10 border border-red-500/20 rounded-[var(--radius-btn)] py-3 px-4"
                            >
                                {error}
                            </motion.div>
                        )}

                        {message && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-primary text-xs font-bold text-center bg-primary/10 border border-primary/20 rounded-[var(--radius-btn)] py-3 px-4"
                            >
                                {message}
                            </motion.div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full !py-4 text-black font-black uppercase tracking-widest mt-4 shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-[0.98]"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-3">
                                    <div className="w-5 h-5 border-3 border-black/20 border-t-black rounded-full animate-spin" />
                                    Bezig...
                                </span>
                            ) : (
                                isSignUp ? 'Registreren' : 'Inloggen'
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center pt-6 border-t border-white/5">
                        <button
                            onClick={() => {
                                setIsSignUp(!isSignUp);
                                setError('');
                                setMessage('');
                            }}
                            className="text-muted-foreground hover:text-primary transition-all text-xs font-bold uppercase tracking-widest"
                        >
                            {isSignUp ? 'Al een account? Inloggen' : 'Nog geen account? Registreren'}
                        </button>
                    </div>
                </motion.div>

                {/* Simple Features for Context */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8, duration: 0.6 }}
                    className="mt-12 grid grid-cols-3 gap-8 text-center w-full max-w-sm"
                >
                    {[
                        { icon: <Camera size={20} />, label: "Scannen" },
                        { icon: <Sparkles size={20} />, label: "AI Chef" },
                        { icon: <ChefHat size={20} />, label: "Collectie" },
                    ].map((feature, idx) => (
                        <div key={idx} className="flex flex-col items-center gap-3 group/feature">
                            <div className="w-12 h-12 rounded-2xl glass-card flex items-center justify-center text-muted-foreground group-hover/feature:text-primary group-hover/feature:scale-110 transition-all border-white/5 group-hover/feature:border-primary/30">
                                {feature.icon}
                            </div>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest group-hover/feature:text-white transition-colors">{feature.label}</span>
                        </div>
                    ))}
                </motion.div>
            </motion.div>
        </div>
    );
}
