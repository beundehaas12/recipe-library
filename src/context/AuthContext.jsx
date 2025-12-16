import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Timeout fallback for mobile: if auth check takes too long, stop loading
        const timeout = setTimeout(() => {
            if (loading) {
                console.warn('Auth check timed out, proceeding without session');
                setLoading(false);
            }
        }, 5000);

        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            setLoading(false);
        }).catch((error) => {
            console.error('Error getting session:', error);
            setLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                setUser(session?.user ?? null);
                setLoading(false);
            }
        );

        return () => {
            clearTimeout(timeout);
            subscription.unsubscribe();
        };
    }, []);

    const signUp = async (email, password) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
        });
        if (error) {
            console.error('Sign up error:', error.message);
            throw error;
        }
        return data;
    };

    const signIn = async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) {
            console.error('Sign in error:', error.message);
            throw error;
        }
        return data;
    };

    const signOut = async () => {
        console.log('SignOut called');
        try {
            const { error } = await supabase.auth.signOut();
            if (error) {
                console.error('Sign out error:', error.message);
            }
        } catch (error) {
            console.error('Sign out exception:', error);
        } finally {
            // Always clear user state
            setUser(null);

            // Manually clear all Supabase auth tokens from localStorage as fallback
            if (typeof window !== 'undefined' && window.localStorage) {
                const keysToRemove = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
                        keysToRemove.push(key);
                    }
                }
                keysToRemove.forEach(key => {
                    console.log('Removing localStorage key:', key);
                    localStorage.removeItem(key);
                });
            }
            console.log('SignOut complete, user cleared');
        }
    };

    const value = {
        user,
        loading,
        signUp,
        signIn,
        signOut,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
