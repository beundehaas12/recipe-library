import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getUserRole, canAccessDashboard, canManageUsers } from '../lib/roleService';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState('user');
    const [loading, setLoading] = useState(true);

    // Derived permissions
    const isAdmin = role === 'admin';
    const isAuthor = role === 'author' || role === 'admin';

    // Fetch user role
    const fetchRole = async (userId) => {
        if (!userId) {
            setRole('user');
            return;
        }
        const userRole = await getUserRole(userId);
        setRole(userRole);
    };

    useEffect(() => {
        // Timeout fallback for mobile: if auth check takes too long, stop loading
        const timeout = setTimeout(() => {
            if (loading) {
                console.warn('Auth check timed out, proceeding without session');
                setLoading(false);
            }
        }, 5000);

        // Get initial session
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            const currentUser = session?.user ?? null;
            setUser(currentUser);
            if (currentUser) {
                await fetchRole(currentUser.id);
            }
            setLoading(false);
        }).catch((error) => {
            console.error('Error getting session:', error);
            setLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                const currentUser = session?.user ?? null;
                setUser(currentUser);
                if (currentUser) {
                    await fetchRole(currentUser.id);
                } else {
                    setRole('user');
                }
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
            setRole('user');

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
        role,
        isAdmin,
        isAuthor,
        loading,
        signUp,
        signIn,
        signOut,
        canAccessDashboard: () => canAccessDashboard(role),
        canManageUsers: () => canManageUsers(role),
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

