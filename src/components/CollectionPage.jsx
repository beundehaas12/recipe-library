import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { translations as t } from '../lib/translations';
import { supabase } from '../lib/supabase';
import BackButton from './BackButton';
import RecipeThumbnail from './RecipeThumbnail';
import { ChefHat } from 'lucide-react';

export default function CollectionPage() {
    const { id } = useParams();
    const [collection, setCollection] = useState(null);
    const [recipes, setRecipes] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchCollection() {
            if (!id) return;
            try {
                // Fetch collection details
                const { data: collectionData, error: collectionError } = await supabase
                    .from('collections')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (collectionError) throw collectionError;

                // Fetch author profile for the collection
                if (collectionData.user_id) {
                    const { data: authorProfile } = await supabase
                        .from('author_profiles')
                        .select('avatar_url, first_name, last_name')
                        .eq('user_id', collectionData.user_id)
                        .single();

                    if (authorProfile) {
                        collectionData.author_profile = authorProfile;
                    }
                }

                setCollection(collectionData);

                // Fetch recipes in this collection
                const { data: relations, error: relationsError } = await supabase
                    .from('recipe_collections')
                    .select('recipe_id')
                    .eq('collection_id', id);

                if (relationsError) throw relationsError;

                // Also fetch author profiles for the recipes in the collection
                const recipeIds = relations.map(r => r.recipe_id);
                // ... (existing logic) ...

                if (recipeIds.length > 0) {
                    const { data: recipesData, error: recipesError } = await supabase
                        .from('recipes')
                        .select('*')
                        .in('id', recipeIds)
                        .order('created_at', { ascending: false });

                    if (recipesError) throw recipesError;

                    // Fetch authors for these recipes for the thumbnails
                    const userIds = [...new Set(recipesData.map(r => r.user_id).filter(Boolean))];
                    let profileMap = {};
                    if (userIds.length > 0) {
                        const { data: profiles } = await supabase
                            .from('author_profiles')
                            .select('user_id, first_name, last_name, avatar_url')
                            .in('user_id', userIds);

                        if (profiles) {
                            profileMap = profiles.reduce((acc, p) => { acc[p.user_id] = p; return acc; }, {});
                        }
                    }

                    const recipesWithAuthors = recipesData.map(r => ({
                        ...r,
                        author_profile: profileMap[r.user_id]
                    }));

                    setRecipes(recipesWithAuthors || []);
                }
            } catch (error) {
                console.error('Error fetching collection:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchCollection();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
        );
    }

    if (!collection) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
                Collection niet gevonden
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pb-20">
            {/* Header - Same structure as RecipeCard */}
            <header className="fixed top-0 left-0 right-0 z-50 pointer-events-none px-4 lg:px-20 py-4">
                <div className="max-w-[1600px] mx-auto w-full flex justify-between items-center px-0">
                    <BackButton />
                </div>
            </header>

            {/* Hero Title Section - Same container structure as RecipeCard */}
            <div className="max-w-[1600px] mx-auto px-4 lg:px-20 pt-32 mb-12">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-4xl space-y-4"
                >
                    <div className="flex items-center gap-3">
                        <span className="px-3 py-1 bg-white/10 backdrop-blur-md text-white/90 text-[10px] font-bold uppercase tracking-widest rounded-md border border-white/10">
                            {t.collection}
                        </span>
                        <span className="px-3 py-1 bg-white/5 backdrop-blur-md text-white/70 text-[10px] font-bold uppercase tracking-widest rounded-md border border-white/5">
                            {recipes.length} recept{recipes.length !== 1 ? 'en' : ''}
                        </span>
                    </div>

                    <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white leading-[0.85] drop-shadow-2xl font-display uppercase">
                        {collection.name}
                    </h1>

                    {collection.author_profile && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="flex items-center gap-3 mt-4 mb-2"
                        >
                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full overflow-hidden border border-white/20 bg-white/10 shadow-lg">
                                {collection.author_profile.avatar_url ? (
                                    <img
                                        src={collection.author_profile.avatar_url}
                                        alt=""
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white/50">
                                        {collection.author_profile.first_name?.[0]}{collection.author_profile.last_name?.[0]}
                                    </div>
                                )}
                            </div>
                            <span className="text-white/90 font-bold text-lg md:text-xl drop-shadow-md">
                                {collection.author_profile.first_name} {collection.author_profile.last_name}
                            </span>
                        </motion.div>
                    )}
                </motion.div>
            </div>

            {/* Recipe Grid - Same container structure as RecipeCard */}
            <div className="max-w-[1600px] mx-auto px-0 md:px-4 lg:px-20">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-0.5 md:gap-1 lg:gap-2">
                    {recipes.map(recipe => (
                        <div key={recipe.id} className="w-full">
                            <RecipeThumbnail recipe={recipe} t={t} />
                        </div>
                    ))}
                    {recipes.length === 0 && (
                        <div className="col-span-full py-20 text-center text-muted-foreground flex flex-col items-center gap-4">
                            <ChefHat size={48} className="text-white/10" />
                            <p>{t.noRecipesInCollection || "Geen recepten in deze collectie"}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
