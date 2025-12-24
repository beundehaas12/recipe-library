'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChefHat, BookOpen, Folder } from 'lucide-react';
import type { Recipe, Collection, AuthorProfile } from '@/types/database';
import RecipeThumbnail from '@/components/RecipeThumbnail';
import CollectionCard from '@/components/CollectionCard';
import BackButton from '@/components/BackButton';
import { getAuthorDisplayName, getAuthorAvatarUrl } from '@/lib/authorProfileService';

interface AuthorProfilePageProps {
    profile: AuthorProfile;
    recipes: Recipe[];
    collections: Collection[];
}

export default function AuthorProfilePage({ profile, recipes, collections }: AuthorProfilePageProps) {
    const [activeTab, setActiveTab] = useState<'recipes' | 'collections'>('recipes');

    const authorName = getAuthorDisplayName(profile) || 'Unknown Author';
    const avatarUrl = getAuthorAvatarUrl(profile, { id: profile.user_id });

    return (
        <div className="min-h-screen bg-background pt-20 pb-24">
            {/* Back Button */}
            <div className="fixed top-20 left-4 z-50">
                <BackButton />
            </div>

            {/* Hero Section - Avatar + Name */}
            <div className="max-w-[1600px] mx-auto px-4 lg:px-20 py-12">
                <div className="flex items-start gap-8">
                    {/* Large Avatar - Left */}
                    <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-4 border-white/10 bg-white/5 flex-shrink-0">
                        <img
                            src={avatarUrl}
                            alt={authorName}
                            className="w-full h-full object-cover"
                        />
                    </div>

                    {/* Author Info - Right */}
                    <div className="flex-1">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                        >
                            <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-2">
                                Author
                            </p>
                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white leading-tight mb-4">
                                {authorName}
                            </h1>

                            {/* Bio - if present */}
                            {profile.bio && (
                                <p className="text-lg text-white/70 leading-relaxed max-w-3xl">
                                    {profile.bio}
                                </p>
                            )}

                            {/* Stats */}
                            <div className="flex gap-6 mt-6">
                                <div className="flex items-center gap-2">
                                    <BookOpen size={20} className="text-primary" />
                                    <span className="text-white font-bold">{recipes.length}</span>
                                    <span className="text-white/60 text-sm">Recepten</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Folder size={20} className="text-primary" />
                                    <span className="text-white font-bold">{collections.length}</span>
                                    <span className="text-white/60 text-sm">Collecties</span>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="max-w-[1600px] mx-auto px-4 lg:px-20 mb-8">
                <div className="flex gap-4 border-b border-white/10">
                    <button
                        onClick={() => setActiveTab('recipes')}
                        className={`px-6 py-3 font-bold text-sm uppercase tracking-wider transition-colors relative ${activeTab === 'recipes'
                            ? 'text-white'
                            : 'text-white/40 hover:text-white/60'
                            }`}
                    >
                        Recepten ({recipes.length})
                        {activeTab === 'recipes' && (
                            <motion.div
                                layoutId="activeTab"
                                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                            />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('collections')}
                        className={`px-6 py-3 font-bold text-sm uppercase tracking-wider transition-colors relative ${activeTab === 'collections'
                            ? 'text-white'
                            : 'text-white/40 hover:text-white/60'
                            }`}
                    >
                        Collecties ({collections.length})
                        {activeTab === 'collections' && (
                            <motion.div
                                layoutId="activeTab"
                                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                            />
                        )}
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-[1600px] mx-auto px-0 md:px-4 lg:px-20">
                {activeTab === 'recipes' ? (
                    recipes.length > 0 ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-0.5 md:gap-1 lg:gap-2"
                        >
                            {recipes.map((recipe) => (
                                <div key={recipe.id} className="w-full">
                                    <RecipeThumbnail recipe={recipe} />
                                </div>
                            ))}
                        </motion.div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <ChefHat size={48} className="text-white/10 mb-4" />
                            <p className="text-muted-foreground">Nog geen recepten</p>
                        </div>
                    )
                ) : (
                    collections.length > 0 ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-0.5 md:gap-1 lg:gap-2"
                        >
                            {collections.map((collection) => (
                                <div key={collection.id} className="w-full">
                                    <CollectionCard collection={collection} />
                                </div>
                            ))}
                        </motion.div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <Folder size={48} className="text-white/10 mb-4" />
                            <p className="text-muted-foreground">Nog geen collecties</p>
                        </div>
                    )
                )}
            </div>
        </div>
    );
}
