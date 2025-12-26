'use client';

import { motion } from 'framer-motion';
import { ShieldX, ArrowLeft, Home } from 'lucide-react';
import Link from 'next/link';

interface AccessDeniedProps {
    title?: string;
    message?: string;
    requiredRole?: string;
}

export default function AccessDenied({
    title = "Geen toegang",
    message = "Je hebt geen toegang tot deze pagina.",
    requiredRole
}: AccessDeniedProps) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="max-w-md w-full"
            >
                {/* Card */}
                <div className="bg-white rounded-2xl shadow-xl border border-zinc-100 overflow-hidden">
                    {/* Header with icon */}
                    <div className="bg-gradient-to-br from-red-500 to-red-600 p-8 flex justify-center">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                            className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm"
                        >
                            <ShieldX size={40} className="text-white" />
                        </motion.div>
                    </div>

                    {/* Content */}
                    <div className="p-8 text-center">
                        <h1 className="text-2xl font-bold text-zinc-900 mb-2">
                            {title}
                        </h1>
                        <p className="text-zinc-500 mb-6">
                            {message}
                        </p>

                        {requiredRole && (
                            <div className="mb-6 p-3 bg-zinc-50 rounded-lg border border-zinc-100">
                                <p className="text-xs text-zinc-400 uppercase tracking-wider mb-1">
                                    Vereiste rol
                                </p>
                                <p className="text-sm font-bold text-zinc-700 capitalize">
                                    {requiredRole}
                                </p>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex flex-col sm:flex-row gap-3">
                            <Link
                                href="/"
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-zinc-900 text-white rounded-xl font-bold text-sm hover:bg-zinc-800 transition-colors"
                            >
                                <Home size={16} />
                                Naar Home
                            </Link>
                            <button
                                onClick={() => window.history.back()}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-zinc-100 text-zinc-700 rounded-xl font-bold text-sm hover:bg-zinc-200 transition-colors"
                            >
                                <ArrowLeft size={16} />
                                Terug
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer text */}
                <p className="text-center text-xs text-zinc-400 mt-6">
                    Denk je dat dit een fout is? Neem contact op met een beheerder.
                </p>
            </motion.div>
        </div>
    );
}
