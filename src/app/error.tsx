'use client';

import { useEffect } from 'react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-8">
            <div className="text-center max-w-md">
                <h2 className="text-2xl font-bold text-white mb-4">
                    Er ging iets mis
                </h2>
                <p className="text-muted-foreground mb-6">
                    {error.message || 'Een onverwachte fout is opgetreden.'}
                </p>
                <button
                    onClick={() => reset()}
                    className="btn-primary"
                >
                    Probeer opnieuw
                </button>
            </div>
        </div>
    );
}
