import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getUserRole, canAccessDashboard, canManageUsers } from '../lib/roleService';
import { getUserProfile, getUserPreferences, updateUserProfile, updateUserPreferences } from '../lib/profileService';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState(null); // null = not loaded yet
    const [profile, setProfile] = useState(null);
    const [preferences, setPreferences] = useState(null);
    const [loading, setLoading] = useState(true);

    // Derived permissions - treat null role as no access
    const isAdmin = role === 'admin';
    const isAuthor = role === 'author' || role === 'admin';

    // Fetch user role
    const fetchRole = async (userId) => {
        if (!userId) {
            setRole(null);
            return;
        }
        const userRole = await getUserRole(userId);
        setRole(userRole);
    };

    // Fetch user profile and preferences
    const fetchProfileAndPrefs = async () => {
        const [profileResult, prefsResult] = await Promise.all([
            getUserProfile(),
            getUserPreferences()
        ]);
        setProfile(profileResult.data);
        setPreferences(prefsResult.data);
    };

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            const currentUser = session?.user ?? null;
            setUser(currentUser);
            if (currentUser) {
                await fetchRole(currentUser.id);
                await fetchProfileAndPrefs();
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
                    await fetchProfileAndPrefs();
                } else {
                    setRole(null);
                    setProfile(null);
                    setPreferences(null);
                }
            }
        );

        return () => {
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
            setRole(null);
            setProfile(null);
            setPreferences(null);

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

    // Profile update wrapper that refreshes state
    const handleUpdateProfile = async (updates) => {
        const result = await updateUserProfile(updates);
        if (result.data) setProfile(result.data);
        return result;
    };

    // Preferences update wrapper that refreshes state
    const handleUpdatePreferences = async (updates) => {
        const result = await updateUserPreferences(updates);
        if (result.data) setPreferences(result.data);
        return result;
    };

    const value = {
        user,
        role,
        profile,
        preferences,
        isAdmin,
        isAuthor,
        loading,
        signUp,
        signIn,
        signOut,
        updateProfile: handleUpdateProfile,
        updatePreferences: handleUpdatePreferences,
        refreshProfile: fetchProfileAndPrefs,
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

