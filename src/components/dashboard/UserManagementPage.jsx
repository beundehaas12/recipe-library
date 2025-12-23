import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function UserManagementPage() {
    const navigate = useNavigate();
    const { isAdmin, loading } = useAuth();

    // Route guard: redirect non-admin users to dashboard
    useEffect(() => {
        if (!loading && !isAdmin) {
            navigate('/dashboard');
        }
    }, [loading, isAdmin, navigate]);

    // Don't render if not admin
    if (loading || !isAdmin) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 text-center">
            <div className="w-20 h-20 bg-zinc-900 rounded-2xl flex items-center justify-center mb-6 border border-white/10">
                <Users size={40} className="text-white/20" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Gebruikersbeheer</h1>
            <p className="text-muted-foreground max-w-md">
                Beheer gebruikersrollen en toegangsrechten. Deze pagina wordt binnenkort uitgebreid.
            </p>
        </div>
    );
}
