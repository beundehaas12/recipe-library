import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChefHat, User, Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { validateInvitationToken, completeEarlyAccess } from '../lib/roleService';

export default function CompleteAccountScreen({ token, onComplete }) {
    const [loading, setLoading] = useState(true);
    const [validating, setValidating] = useState(true);
    const [tokenData, setTokenData] = useState(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    // Form state
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Validate token on mount
    useEffect(() => {
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
    }, [token]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validation
        if (password !== confirmPassword) {
            setError('Wachtwoorden komen niet overeen.');
            return;
        }

        if (password.length < 6) {
            setError('Wachtwoord moet minimaal 6 tekens bevatten.');
            return;
        }

        if (!firstName.trim() || !lastName.trim()) {
            setError('Vul je voor- en achternaam in.');
            return;
        }

        setSubmitting(true);

        try {
            // 1. Create auth user with Supabase
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: tokenData.email,
                password: password,
                options: {
                    data: {
                        first_name: firstName.trim(),
                        last_name: lastName.trim()
                    }
                }
            });

            if (authError) {
                throw new Error(authError.message);
            }

            // 2. Wait for user to be created, then update profile
            if (authData.user) {
                // Update user profile with names
                const { error: profileError } = await supabase
                    .from('user_profiles')
                    .update({
                        first_name: firstName.trim(),
                        last_name: lastName.trim(),
                        display_name: `${firstName.trim()} ${lastName.trim()}`
                    })
                    .eq('user_id', authData.user.id);

                if (profileError) {
                    console.error('Profile update error:', profileError);
                    // Continue anyway, profile can be updated later
                }
            }

            // 3. Mark early access as completed
            await completeEarlyAccess(token);

            // 4. Show success
            setSuccess(true);

            // 5. Redirect to login after a moment
            setTimeout(() => {
                if (onComplete) {
                    onComplete();
                } else {
                    // Reload to go to login
                    window.location.href = '/';
                }
            }, 3000);

        } catch (err) {
            console.error('Account creation error:', err);
            setError(err.message || 'Er is een fout opgetreden.');
        } finally {
            setSubmitting(false);
        }
    };

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

    // Success state
    if (success) {
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
                        <h1 className="text-2xl font-bold text-zinc-900">Account aangemaakt! 🎉</h1>
                        <p className="text-zinc-500">
                            Welkom bij Kookboek, {firstName}! Je wordt doorgestuurd naar de inlogpagina...
                        </p>
                    </div>
                    <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full mx-auto" />
                </motion.div>
            </div>
        );
    }

    // Account completion form
    return (
        <div className="h-screen w-screen bg-white flex flex-col items-center justify-center p-8 md:p-12 lg:p-20">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="w-full max-w-sm space-y-10"
            >
                {/* Brand Section */}
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 rotate-3">
                        <ChefHat size={24} className="text-primary-foreground" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black tracking-tighter text-zinc-900 leading-none">
                            KOOK<span className="text-primary">BOEK</span>
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
                            <p className="text-emerald-700 font-bold text-xs uppercase tracking-tight">Gefeliciteerd! 🎉</p>
                            <p className="text-emerald-600 text-[11px]">Je hebt early access gekregen.</p>
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
                    {/* Name Fields */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Voornaam</label>
                            <div className="relative group/input">
                                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300 group-focus-within/input:text-primary transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Voornaam"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    required
                                    className="w-full h-12 pl-11 pr-4 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-medium text-sm"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Achternaam</label>
                            <div className="relative group/input">
                                <input
                                    type="text"
                                    placeholder="Achternaam"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    required
                                    className="w-full h-12 px-4 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-medium text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Email (readonly) */}
                    <div className="space-y-2">
                        <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest ml-1">E-mailadres</label>
                        <div className="relative">
                            <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300" />
                            <input
                                type="email"
                                value={tokenData?.email || ''}
                                readOnly
                                className="w-full h-12 pl-11 pr-4 bg-zinc-100 border border-zinc-200 rounded-xl text-zinc-500 font-medium text-sm cursor-not-allowed"
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div className="space-y-2">
                        <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Wachtwoord</label>
                        <div className="relative group/input">
                            <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300 group-focus-within/input:text-primary transition-colors" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Minimaal 6 tekens"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
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
                        <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Bevestig wachtwoord</label>
                        <div className="relative group/input">
                            <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300 group-focus-within/input:text-primary transition-colors" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Herhaal wachtwoord"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
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
        </div>
    );
}
