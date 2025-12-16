import React, { useState, useEffect, useRef, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { extractRecipeFromImage, extractRecipeFromText } from './lib/gemini';
import { translations as t } from './lib/translations';
import { useAuth } from './context/AuthContext';
import LoginScreen from './components/LoginScreen';
import RecipeList from './components/RecipeList';
import RecipeCard from './components/RecipeCard';
import { ChefHat, Plus, Camera as CameraCaptureIcon, Upload as UploadIcon, Link as LinkIcon, Search, LogOut, X, Play, Info, Settings, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';

function Home() {
  const { user, signOut } = useAuth();
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const navigate = useNavigate();
  const { scrollY } = useScroll();

  const headerBgColor = useTransform(scrollY, [0, 200], ['rgba(9, 9, 11, 0)', 'rgba(9, 9, 11, 0.4)']);
  const headerBlurFilter = useTransform(scrollY, [0, 200], ['blur(0px)', 'blur(8px)']);
  const heroScale = useTransform(scrollY, [0, 500], [1, 1.1]);
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0.3]);

  useEffect(() => {
    if (user) {
      fetchRecipes();
    }
  }, [user]);

  async function fetchRecipes() {
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRecipes(data || []);
    } catch (error) {
      console.error('Error fetching recipes:', error.message);
    } finally {
      setLoading(false);
    }
  }

  // Debounce timer ref for database search
  const searchTimeoutRef = useRef(null);

  // Client-side instant filter (runs immediately on every keystroke)
  const instantFilteredRecipes = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const query = searchQuery.toLowerCase();
    return recipes.filter(recipe => {
      // Check basic text fields
      if (recipe.title?.toLowerCase().includes(query)) return true;
      if (recipe.description?.toLowerCase().includes(query)) return true;
      if (recipe.author?.toLowerCase().includes(query)) return true;
      if (recipe.cuisine?.toLowerCase().includes(query)) return true;

      // Check ingredients array (objects have 'item' property)
      if (Array.isArray(recipe.ingredients)) {
        for (const ing of recipe.ingredients) {
          if (typeof ing === 'string' && ing.toLowerCase().includes(query)) return true;
          if (ing?.item?.toLowerCase().includes(query)) return true;
        }
      }

      // Check tags array
      if (Array.isArray(recipe.tags)) {
        for (const tag of recipe.tags) {
          if (typeof tag === 'string' && tag.toLowerCase().includes(query)) return true;
        }
      }

      return false;
    });
  }, [searchQuery, recipes]);

  async function handleSearch(query) {
    setSearchQuery(query);

    // Clear pending database search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!query.trim()) {
      setSearchResults(null);
      return;
    }

    // Debounce the database search (300ms delay)
    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        // Use full-text search with plainto_tsquery
        const { data, error } = await supabase
          .from('recipes')
          .select('*')
          .textSearch('search_vector', query, {
            type: 'websearch',
            config: 'simple'
          })
          .order('created_at', { ascending: false });

        if (error) {
          // Fallback to simple ILIKE if full-text fails
          console.warn('Full-text search failed, falling back to ILIKE:', error);
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('recipes')
            .select('*')
            .or(`title.ilike.%${query}%,description.ilike.%${query}%,author.ilike.%${query}%`)
            .order('created_at', { ascending: false });

          if (fallbackError) throw fallbackError;
          setSearchResults(fallbackData || []);
        } else {
          setSearchResults(data || []);
        }
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  }

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults(null);
  };

  const saveRecipeToDb = async (recipeData, sourceInfo = {}) => {
    try {
      const {
        title,
        description,
        ingredients,
        instructions,
        servings,
        prepTime,
        cookTime,
        difficulty,
        cuisine,
        author,
        cookbook_name,
        isbn,
        source_language,
        ai_tags
      } = recipeData;

      const { data: newRecipe, error: dbError } = await supabase
        .from('recipes')
        .insert([
          {
            user_id: user.id,
            title,
            description,
            ingredients,
            instructions,
            servings,
            prep_time: prepTime,
            cook_time: cookTime,
            difficulty,
            cuisine,
            author,
            cookbook_name,
            isbn,
            source_url: sourceInfo.url || null,
            source_type: sourceInfo.type || 'manual',
            source_language: source_language || 'en',
            ai_tags: ai_tags || [],
            image_url: null,
            original_image_url: null,
          }
        ])
        .select()
        .single();

      if (dbError) throw dbError;

      setRecipes([newRecipe, ...recipes]);
      setIsProcessing(false);
      navigate(`/recipe/${newRecipe.id}`);
    } catch (e) {
      console.error("DB Save failed:", e);
      alert("Opslaan mislukt: " + e.message);
      setIsProcessing(false);
    }
  };

  const handleCapture = async (file) => {
    setIsProcessing(true);
    try {
      const recipeData = await extractRecipeFromImage(file);
      await saveRecipeToDb(recipeData, { type: 'image' });
    } catch (error) {
      console.error('Error processing recipe:', error);
      alert('Recept verwerken mislukt. Zie console voor details.');
      setIsProcessing(false);
    }
  };

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInputValue, setUrlInputValue] = useState("");

  const handleUploadClick = () => {
    setShowAddMenu(false);
    fileInputRef.current?.click();
  };

  const handleCameraClick = () => {
    setShowAddMenu(false);
    cameraInputRef.current?.click();
  };

  const handleUrlClick = () => {
    setShowAddMenu(false);
    setShowUrlInput(true);
  };

  const processUrl = async (url) => {
    if (!url) return;
    setShowUrlInput(false);
    setIsProcessing(true);

    const fetchWithProxy = async (proxyUrl) => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(proxyUrl, { signal: controller.signal });
      clearTimeout(id);
      if (!res.ok) throw new Error(`Proxy error: ${res.status}`);
      return res.text();
    };

    try {
      let htmlContent = "";

      try {
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
        htmlContent = await fetchWithProxy(proxyUrl);
      } catch (e) {
        console.warn("Primary proxy failed, trying backup...", e);
        const backupProxy = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
        const res = await fetch(backupProxy);
        const data = await res.json();
        if (data.contents) {
          htmlContent = data.contents;
        } else {
          throw new Error("Backup proxy also failed");
        }
      }

      if (!htmlContent) throw new Error("Could not retrieve content from URL");

      const truncatedContent = htmlContent.substring(0, 100000);
      const recipeData = await extractRecipeFromText(truncatedContent);
      await saveRecipeToDb(recipeData, { type: 'url', url });

    } catch (error) {
      console.error("URL processing failed:", error);
      alert(`URL verwerken mislukt: ${error.message}`);
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleCapture(file);
    }
  };

  // Display logic: Prioritize instant filter for immediate feedback
  // If DB search returns empty but instant filter has results, keep the instant results
  const displayRecipes = useMemo(() => {
    if (!searchQuery.trim()) return recipes;

    // If we have instant results
    if (instantFilteredRecipes && instantFilteredRecipes.length > 0) {
      // If DB search completed with results, use those
      if (searchResults && searchResults.length > 0) {
        return searchResults;
      }
      // Otherwise keep showing instant results
      return instantFilteredRecipes;
    }

    // If no instant results but DB has results
    if (searchResults && searchResults.length > 0) {
      return searchResults;
    }

    // No results from either source
    return [];
  }, [searchQuery, instantFilteredRecipes, searchResults, recipes]);

  const heroRecipe = !searchQuery && recipes.length > 0 ? recipes[0] : null;
  const isEmptyState = !loading && recipes.length === 0 && searchResults === null;
  const isNoResults = searchQuery && displayRecipes.length === 0;

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 selection:bg-primary selection:text-white" onClick={() => { setShowAddMenu(false); setShowProfileMenu(false); }}>

      {/* Cinematic Navbar */}
      <header
        className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-between transition-colors duration-500"
      >
        {/* Gradient Blur Background Layer - Extended Height */}
        <motion.div
          style={{
            backgroundColor: headerBgColor,
            backdropFilter: headerBlurFilter,
            WebkitMaskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)',
            maskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)'
          }}
          className="absolute top-0 left-0 right-0 h-32 -z-10 pointer-events-none"
        />
        <div className="flex items-center gap-3">
          <div className="bg-primary/20 backdrop-blur-md border border-primary/50 text-primary p-2 rounded-xl">
            <ChefHat size={24} />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight drop-shadow-md hidden md:block">
            {t.appTitle}
          </h1>
        </div>

        {/* Search Bar & Actions */}
        <div className="flex items-center gap-4 flex-1 justify-end max-w-2xl">
          {/* Search Input */}
          <div className="relative w-full max-w-md hidden md:block group">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground group-hover:text-white transition-colors" />
            <input
              type="text"
              placeholder={t.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full h-11 bg-white/5 hover:bg-white/10 focus:bg-white/15 backdrop-blur-md border border-white/10 focus:border-white/20 rounded-full pl-10 pr-10 text-sm text-white placeholder:text-muted-foreground/60 focus:outline-none transition-all placeholder:font-medium shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Mobile Search Icon */}
          <button className="md:hidden p-2 text-white hover:bg-white/10 rounded-full transition-colors">
            <Search size={22} />
          </button>

          {/* Add Recipe */}
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => {
                setShowAddMenu(!showAddMenu);
                setShowProfileMenu(false);
              }}
              className="h-11 flex items-center gap-2 px-6 bg-white/10 hover:bg-white/20 border border-white/10 backdrop-blur-md text-white font-semibold rounded-full transition-all text-sm group whitespace-nowrap"
            >
              <Plus size={18} className="text-primary group-hover:scale-110 transition-transform" />
              <span className="hidden md:inline">{t.addRecipe}</span>
            </button>

            <AnimatePresence>
              {showAddMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.1 }}
                  className="absolute top-full right-0 mt-2 w-56 bg-[#18181b] border border-white/10 rounded-xl shadow-2xl overflow-hidden py-1.5 z-50 ring-1 ring-black/50"
                >
                  <button
                    onClick={handleCameraClick}
                    className="w-full text-left px-4 py-2.5 hover:bg-white/5 text-gray-200 flex items-center gap-3 transition-colors text-sm font-medium"
                  >
                    <CameraCaptureIcon size={18} />
                    <span>{t.takePhoto}</span>
                  </button>
                  <button
                    onClick={handleUploadClick}
                    className="w-full text-left px-4 py-2.5 hover:bg-white/5 text-gray-200 flex items-center gap-3 transition-colors text-sm font-medium"
                  >
                    <UploadIcon size={18} />
                    <span>{t.uploadImage}</span>
                  </button>
                  <button
                    onClick={handleUrlClick}
                    className="w-full text-left px-4 py-2.5 hover:bg-white/5 text-gray-200 flex items-center gap-3 transition-colors text-sm font-medium"
                  >
                    <LinkIcon size={18} />
                    <span>{t.fromUrl}</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* User Avatar & Dropdown */}
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => {
                setShowProfileMenu(!showProfileMenu);
                setShowAddMenu(false);
              }}
              className="h-11 w-11 shrink-0 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 border border-white/10 flex items-center justify-center text-xs font-bold text-white shadow-inner hover:scale-105 hover:border-primary/50 transition-all"
            >
              {user?.user_metadata?.avatar_url ? (
                <img src={user.user_metadata.avatar_url} className="w-full h-full object-cover rounded-full" alt="Avatar" />
              ) : (
                user?.email?.[0]?.toUpperCase() || '?'
              )}
            </button>

            <AnimatePresence>
              {showProfileMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.1 }}
                  className="absolute top-full right-0 mt-2 w-48 bg-[#18181b] border border-white/10 rounded-xl shadow-2xl overflow-hidden py-1.5 z-50 ring-1 ring-black/50"
                >
                  <button
                    className="w-full text-left px-4 py-2.5 hover:bg-white/5 text-gray-200 flex items-center gap-3 transition-colors text-sm font-medium cursor-default"
                  >
                    <Settings size={16} />
                    <span>{t.settings}</span>
                  </button>
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        await signOut();
                      } catch (error) {
                        console.error('Logout error:', error);
                      }
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-red-500/10 text-red-400 flex items-center gap-3 transition-colors text-sm font-medium"
                  >
                    <LogOut size={16} />
                    <span>{t.logout}</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* URL Input Modal */}
      <AnimatePresence>
        {showUrlInput && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setShowUrlInput(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-[#1c1c1e] w-full max-w-md p-8 rounded-3xl border border-white/10 shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-2xl font-bold text-white mb-2">{t.pasteUrl}</h3>
              <p className="text-muted-foreground text-sm mb-6">Plak een link van je favoriete receptensite.</p>

              <input
                type="url"
                placeholder="https://example.com/lekker-recept"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 text-white mb-6 focus:outline-none focus:ring-2 focus:ring-primary/50 text-lg"
                value={urlInputValue}
                onChange={(e) => setUrlInputValue(e.target.value)}
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setShowUrlInput(false)}
                  className="flex-1 px-4 py-3 rounded-xl hover:bg-white/5 text-white/70 font-medium transition-colors"
                >
                  {t.cancel}
                </button>
                <button
                  onClick={() => processUrl(urlInputValue)}
                  disabled={!urlInputValue}
                  className="flex-1 px-4 py-3 bg-white text-black rounded-xl font-bold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t.analyzeUrl}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*"
      />
      <input
        type="file"
        ref={cameraInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*"
        capture="environment"
      />

      {/* Processing Overlay */}
      <AnimatePresence>
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <div className="bg-[#1c1c1e] border border-white/10 p-10 rounded-3xl flex flex-col items-center max-w-sm w-full shadow-2xl text-center">
              <div className="relative w-20 h-20 mb-8">
                <div className="absolute inset-0 border-4 border-white/10 rounded-full" />
                <div className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">{t.analyzing}</h3>
              <p className="text-muted-foreground">{t.analyzingDesc}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="relative min-h-screen">
        {/* HERO SECTION - Single Featured Item Style */}
        {/* Only show Hero content if NOT searching */}
        {!searchQuery && (
          <div className="relative w-full h-[85vh] md:h-[95vh] overflow-hidden">
            {/* Background */}
            <motion.div style={{ scale: heroScale, opacity: heroOpacity }} className="absolute inset-0">
              {heroRecipe?.image_url ? (
                <img
                  src={heroRecipe.image_url}
                  className="w-full h-full object-cover"
                  alt={heroRecipe.title}
                />
              ) : (
                // Default Gradient if no recipe or image
                <div className="w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/40 via-[#09090b] to-[#09090b]" />
              )}

              {/* Cinematic Vignettes */}
              <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-black/60" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/20 to-transparent" />
            </motion.div>

            {/* Hero Content */}
            <div className="absolute bottom-0 left-0 max-w-4xl p-8 md:p-16 z-30 flex flex-col items-start gap-6 pb-40 md:pb-56">
              {heroRecipe ? (
                <>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="flex flex-wrap gap-3 items-center"
                  >
                    <span className="px-3 py-1 rounded-md bg-white/10 backdrop-blur-md border border-white/10 text-white/90 text-[10px] md:text-xs font-bold uppercase tracking-widest shadow-lg">
                      {t.latestDiscovery}
                    </span>
                    {heroRecipe.cuisine && (
                      <span className="text-white/60 text-sm font-medium border-l border-white/20 pl-3 uppercase tracking-wider">
                        {heroRecipe.cuisine}
                      </span>
                    )}
                  </motion.div>

                  <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-5xl md:text-7xl lg:text-8xl font-black text-white leading-[0.9] drop-shadow-2xl font-display max-w-3xl"
                  >
                    {heroRecipe.title}
                  </motion.h2>

                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-gray-200 text-lg md:text-xl line-clamp-3 max-w-xl drop-shadow-md font-medium leading-relaxed"
                  >
                    {heroRecipe.description || ''}
                  </motion.p>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="flex items-center gap-4 mt-4"
                  >
                    <button
                      onClick={() => navigate(`/recipe/${heroRecipe.id}`)}
                      className="px-8 py-4 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-3 text-lg"
                    >
                      {t.startCooking}
                      <ArrowRight size={20} />
                    </button>

                  </motion.div>
                </>
              ) : (
                <div className="flex flex-col items-start gap-4">
                  <h1 className="text-6xl font-black text-white mb-4 leading-tight">{t.appTitle}</h1>
                  <p className="text-xl text-gray-400 max-w-md">Jouw culinaire reis begint hier. Scan recepten en ontdek nieuwe smaken.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Content Area - Floating above hero bottom */}
        {/* If searching, normalize top margin. If NOT searching, use negative margin to float over hero */}
        <div className={`relative z-20 space-y-12 pb-24 bg-gradient-to-b from-transparent to-background ${searchQuery ? 'pt-32' : '-mt-32 md:-mt-48'}`}>
          <RecipeList
            recipes={displayRecipes}
            isEmptyState={isEmptyState}
            isNoResults={isNoResults}
            searchQuery={searchQuery}
          />
        </div>
      </main>
    </div>
  );
}

function RecipePage() {
  const { user } = useAuth();
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const id = window.location.pathname.split('/').pop();

  useEffect(() => {
    async function fetchRecipe() {
      if (!id || !user) return;
      try {
        const { data, error } = await supabase
          .from('recipes')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        setRecipe(data);
      } catch (error) {
        console.error('Error fetching recipe:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchRecipe();
  }, [id, user]);

  const handleImageUpdate = async (file) => {
    if (!recipe) return;
    setLoading(true);
    try {
      if (recipe.image_url) {
        try {
          const oldFileName = recipe.image_url.split('/').pop();
          if (oldFileName) await supabase.storage.from('recipe-images').remove([oldFileName]);
        } catch (err) { console.warn(err); }
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('recipe-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('recipe-images')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('recipes')
        .update({ image_url: publicUrl })
        .eq('id', recipe.id);

      if (updateError) throw updateError;

      setRecipe(prev => ({ ...prev, image_url: publicUrl }));

    } catch (error) {
      console.error('Error updating image:', error);
      alert(`Afbeelding bijwerken mislukt: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!recipe) return;
    if (!window.confirm(t.deleteConfirm)) return;

    setLoading(true);
    try {
      if (recipe.image_url) {
        try {
          const oldFileName = recipe.image_url.split('/').pop();
          if (oldFileName) await supabase.storage.from('recipe-images').remove([oldFileName]);
        } catch (err) { console.warn(err); }
      }

      const { error } = await supabase.from('recipes').delete().eq('id', recipe.id);
      if (error) throw error;
      navigate('/');

    } catch (error) {
      console.error("Error deleting recipe:", error);
      alert(t.failedDelete);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (updatedFields) => {
    if (!recipe) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from('recipes')
        .update({
          title: updatedFields.title,
          description: updatedFields.description,
          ingredients: updatedFields.ingredients,
          instructions: updatedFields.instructions,
          prep_time: updatedFields.prep_time,
          cook_time: updatedFields.cook_time,
          servings: updatedFields.servings,
          cuisine: updatedFields.cuisine,
          difficulty: updatedFields.difficulty,
          author: updatedFields.author,
          cookbook_name: updatedFields.cookbook_name,
          isbn: updatedFields.isbn,
          source_url: updatedFields.source_url
        })
        .eq('id', recipe.id);

      if (error) throw error;
      setRecipe(prev => ({ ...prev, ...updatedFields }));

    } catch (error) {
      console.error("Update failed:", error);
      alert("Wijzigingen opslaan mislukt: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        {t.recipeNotFound}
      </div>
    );
  }

  return (
    <RecipeCard
      recipe={recipe}
      onImageUpdate={handleImageUpdate}
      onDelete={handleDelete}
      onUpdate={handleUpdate}
    />
  );
}

function AuthenticatedApp() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/recipe/:id" element={<RecipePage />} />
      </Routes>
    </Router>
  );
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return <AuthenticatedApp />;
}
