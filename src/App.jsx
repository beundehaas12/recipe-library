import React, { useState, useEffect, useRef, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { supabase, uploadTempImage, uploadSourceImage, deleteImageByUrl, isInviteFlow } from './lib/supabase';
import { analyzeRecipeImage } from './lib/xai';
import { translations as t } from './lib/translations';
import { useAuth } from './context/AuthContext';
import LoginScreen from './components/LoginScreen';
import CompleteAccountScreen from './components/CompleteAccountScreen';
import RecipeList from './components/RecipeList';
import RecipeCard from './components/RecipeCard';
import PlanningPage from './components/PlanningPage';
import ShoppingListPage from './components/ShoppingListPage';
import FavoritesPage from './components/FavoritesPage';
import DashboardLayout from './components/dashboard/DashboardLayout';
import DashboardPage from './components/dashboard/DashboardPage';
import UserManagementPage from './components/dashboard/UserManagementPage';
import AccountSettingsPage from './components/dashboard/AccountSettingsPage';
import AuthorProfilePage from './components/dashboard/AuthorProfilePage';
import CollectionPage from './components/CollectionPage';
import FloatingMenu from './components/FloatingMenu';
import AppHeader from './components/AppHeader';
import { ChefHat, Plus, Camera as CameraCaptureIcon, Upload as UploadIcon, Search, LogOut, X, Play, Info, Settings, ArrowRight, CheckCircle2, AlertCircle, Loader2, ExternalLink, ChevronDown, ChevronUp, Check, Menu, Compass, Calendar, ShoppingBasket, Heart, Clock } from 'lucide-react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { NavLink } from 'react-router-dom';


function Home({ activeTasks, setActiveTasks, searchQuery, recipes, collections, loading, searchResults, instantFilteredRecipes, scrolled, isSearching }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  // Display logic: Prioritize instant filter for immediate feedback
  const displayRecipes = useMemo(() => {
    if (!searchQuery.trim()) return recipes;
    if (instantFilteredRecipes && instantFilteredRecipes.length > 0) {
      if (searchResults && searchResults.length > 0) return searchResults;
      return instantFilteredRecipes;
    }
    if (searchResults && searchResults.length > 0) return searchResults;
    return [];
  }, [searchQuery, instantFilteredRecipes, searchResults, recipes]);

  const heroRecipe = !searchQuery && recipes.length > 0 ? recipes[0] : null;
  const isEmptyState = !loading && recipes.length === 0 && searchResults === null;
  const isNoResults = searchQuery && displayRecipes.length === 0;

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 selection:bg-primary selection:text-white">

      {/* Helper Badge for Searching State Only */}
      <AnimatePresence>
        {isSearching && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 flex items-center gap-2"
          >
            <Loader2 className="animate-spin text-primary" size={16} />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Zoeken...
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="relative min-h-screen">
        {/* Hide Hero when searching */}
        {!searchQuery && (
          <div className="relative w-full h-[75vh] md:h-[85vh] overflow-hidden">
            {/* Background */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1 }}
              className="absolute inset-0 z-0"
              style={{ willChange: 'opacity' }}
            >
              {heroRecipe?.image_url ? (
                <img
                  src={heroRecipe.image_url}
                  className="w-full h-full object-cover"
                  alt={heroRecipe.title}
                  loading="eager"
                  decoding="async"
                />
              ) : (
                // Default Gradient if no recipe or image
                <div className="w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/40 via-[#000000] to-[#000000]" />
              )}

              {/* Cinematic Vignettes */}
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent z-10" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/20 to-transparent z-10" />
            </motion.div>

            {/* Hero Content - Anchored to bottom like Detail Page */}
            <div className="absolute bottom-0 left-0 right-0 z-20 pb-12 pointer-events-none">
              <div className="max-w-[1600px] mx-auto px-4 lg:px-20 w-full flex flex-col items-start gap-4">
                {heroRecipe ? (
                  <>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="flex flex-wrap gap-3 items-center pointer-events-auto"
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
                      className="text-5xl md:text-7xl lg:text-9xl font-black text-white leading-[0.85] drop-shadow-2xl font-display max-w-4xl pointer-events-auto"
                    >
                      {heroRecipe.title}
                    </motion.h2>

                    <motion.p
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="text-gray-200 text-lg md:text-xl line-clamp-3 max-w-2xl drop-shadow-md font-medium leading-relaxed pointer-events-auto"
                    >
                      {heroRecipe.description || ''}
                    </motion.p>

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      className="flex items-center gap-4 mt-2 pointer-events-auto"
                    >
                      <button
                        onClick={() => navigate(`/recipe/${heroRecipe.id}`)}
                        className="btn-primary !px-10 !py-5 !text-black font-black uppercase tracking-widest flex items-center gap-4 text-sm group/btn shadow-2xl shadow-primary/20 active:scale-95"
                      >
                        <span>{t.startCooking}</span>
                        <ArrowRight size={20} className="group-hover/btn:translate-x-1 transition-transform" />
                      </button>
                    </motion.div>
                  </>
                ) : (
                  <div className="flex flex-col items-start gap-4 pointer-events-auto">
                    <h1 className="text-6xl font-black text-white mb-4 leading-tight">{t.appTitle}</h1>
                    <p className="text-xl text-gray-400 max-w-md">Jouw culinaire reis begint hier. Scan recepten en ontdek nieuwe smaken.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Content Area - No negative margins for better mobile stability */}
        <div className={`relative z-20 space-y-12 pb-24 bg-background max-w-[1600px] mx-auto ${searchQuery ? 'pt-32' : 'pt-6'}`}>
          {isEmptyState ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <div className="w-32 h-32 bg-gradient-to-tr from-gray-800 to-gray-900 rounded-[2rem] flex items-center justify-center mb-8 shadow-2xl border border-white/5 transform rotate-3">
                <ChefHat size={64} className="text-white/20" />
              </div>
              <h2 className="text-4xl font-black text-white mb-4 tracking-tight">{t.welcome}</h2>
              <p className="text-lg text-muted-foreground max-w-md mx-auto leading-relaxed mb-8">
                {t.startAdding}
              </p>
              <p className="text-sm text-white/30 uppercase tracking-widest font-bold">
                Klik op + om te beginnen
              </p>
            </motion.div>
          ) : isNoResults ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6">
                <Search size={40} className="text-white/20" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">{t.noResults}</h3>
              <p className="text-muted-foreground">{t.tryDifferentTerm}</p>
            </motion.div>
          ) : (
            <>
              {searchQuery && (
                <motion.h3
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-2xl font-bold text-white mb-8 flex items-center gap-3 px-4"
                >
                  Zoekresultaten
                  <span className="text-primary bg-primary/10 px-3 py-1 rounded-full text-sm">
                    {displayRecipes.length}
                  </span>
                </motion.h3>
              )}
              <RecipeList
                recipes={searchQuery ? displayRecipes : recipes.slice(1)}
                collections={!searchQuery ? collections : []}
              />
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function RecipePage({ activeTasks, setActiveTasks }) {
  const { user } = useAuth();
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const id = window.location.pathname.split('/').pop();

  useEffect(() => {
    async function fetchRecipe() {
      if (!id || !user) return;
      try {
        // Use recipeService for joined data from normalized tables
        const { fetchRecipeWithDetails } = await import('./lib/recipeService');
        const data = await fetchRecipeWithDetails(id);
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
      // Cleanup associated images
      if (recipe.image_url) await deleteImageByUrl(recipe.image_url);
      if (recipe.original_image_url) await deleteImageByUrl(recipe.original_image_url);

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
      const { updateRecipe } = await import('./lib/recipeService');
      const updatedRecipe = await updateRecipe(recipe.id, updatedFields);
      setRecipe(prev => ({ ...prev, ...updatedFields, ...updatedRecipe }));

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
    <div className="min-h-screen bg-background">
      <RecipeCard
        recipe={recipe}
        onImageUpdate={handleImageUpdate}
        onDelete={handleDelete}
        onUpdate={handleUpdate}
      />
    </div>
  );
}

function AuthenticatedApp() {
  const { user, signOut } = useAuth();
  const [activeTasks, setActiveTasks] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Lifted state from Home
  const [recipes, setRecipes] = useState([]);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [tokenUsage, setTokenUsage] = useState(null);
  const [scrolled, setScrolled] = useState(false);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  // Scroll handler
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch recipes
  useEffect(() => {
    if (user) {
      fetchRecipes();
    }
  }, [user]);

  // React to search query changes
  useEffect(() => {
    if (searchQuery !== undefined) {
      handleSearch(searchQuery);
    }
  }, [searchQuery]);

  async function fetchRecipes() {
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .order('created_at', { ascending: false });

      const { data: colsData, error: colsError } = await supabase
        .from('collections')
        .select(`
          *,
          recipe_collections (
            recipe:recipes (
              id,
              image_url
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (colsError) throw colsError;

      // --- Fetch Author Profiles ---
      const userIds = new Set([
        ...(data || []).map(r => r.user_id),
        ...(colsData || []).map(c => c.user_id)
      ].filter(Boolean));

      let profileMap = {};
      if (userIds.size > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('author_profiles')
          .select('user_id, first_name, last_name, avatar_url')
          .in('user_id', Array.from(userIds));

        if (!profilesError && profiles) {
          profileMap = profiles.reduce((acc, p) => {
            acc[p.user_id] = p;
            return acc;
          }, {});
        }
      }

      // Merge profiles into recipes
      const recipesWithAuthors = (data || []).map(r => ({
        ...r,
        author_profile: profileMap[r.user_id] || null
      }));

      // Merge profiles into collections
      const collectionsWithAuthors = (colsData || []).map(c => {
        // Filter out null recipes (deleted ones)
        const validRecipes = c.recipe_collections
          ?.map(rc => rc.recipe)
          .filter(r => r) || [];

        return {
          ...c,
          author_profile: profileMap[c.user_id] || null,
          recipe_count: validRecipes.length,
          // Extract limit 4 images
          preview_images: validRecipes
            .map(r => r.image_url)
            .filter(url => url)
            .slice(0, 4)
        };
      });

      setRecipes(recipesWithAuthors);
      setCollections(collectionsWithAuthors);

    } catch (error) {
      console.error('Error fetching recipes:', error.message);
    } finally {
      setLoading(false);
    }
  }

  // Subscribe to real-time changes
  useEffect(() => {
    const channel = supabase
      .channel('recipes_updates')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'recipes' },
        (payload) => {
          console.log('New recipe added!', payload.new);
          setRecipes(current => [payload.new, ...current]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Search Logic
  const searchTimeoutRef = useRef(null);

  const instantFilteredRecipes = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const query = searchQuery.toLowerCase();
    return recipes.filter(recipe => {
      if (recipe.title?.toLowerCase().includes(query)) return true;
      if (recipe.description?.toLowerCase().includes(query)) return true;
      if (recipe.author?.toLowerCase().includes(query)) return true;
      if (recipe.cuisine?.toLowerCase().includes(query)) return true;
      if (Array.isArray(recipe.ingredients)) {
        for (const ing of recipe.ingredients) {
          if (typeof ing === 'string' && ing.toLowerCase().includes(query)) return true;
          if (ing?.item?.toLowerCase().includes(query)) return true;
        }
      }
      if (Array.isArray(recipe.tags)) {
        for (const tag of recipe.tags) {
          if (typeof tag === 'string' && tag.toLowerCase().includes(query)) return true;
        }
      }
      return false;
    });
  }, [searchQuery, recipes]);

  async function handleSearch(query) {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!query.trim()) {
      setSearchResults(null);
      return;
    }
    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const { data, error } = await supabase
          .from('recipes')
          .select('*')
          .textSearch('search_vector', query, { type: 'websearch', config: 'simple' })
          .order('created_at', { ascending: false });

        if (error) {
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

  // Task Helpers
  const updateTask = (id, updates) => {
    setActiveTasks(prev => prev.map(task => task.id === id ? { ...task, ...updates } : task));
  };

  const addTaskStep = (id, stepMessage) => {
    setActiveTasks(prev => prev.map(task => {
      if (task.id !== id) return task;
      const steps = [...(task.steps || [])];
      if (steps.length > 0) steps[steps.length - 1] = { ...steps[steps.length - 1], done: true };
      steps.push({ message: stepMessage, done: false });
      return { ...task, steps };
    }));
  };

  const completeTaskSteps = (id) => {
    setActiveTasks(prev => prev.map(task => {
      if (task.id !== id) return task;
      const steps = (task.steps || []).map(s => ({ ...s, done: true }));
      return { ...task, steps };
    }));
  };

  const saveRecipeToDb = async (recipeData, sourceInfo = {}, extractionHistory = null, taskId = null) => {
    try {
      const { saveRecipe } = await import('./lib/recipeService');
      const newRecipe = await saveRecipe(user.id, recipeData, sourceInfo, extractionHistory);
      setRecipes([newRecipe, ...recipes]);
      if (taskId) updateTask(taskId, { status: 'done', resultId: newRecipe.id });
    } catch (e) {
      console.error("DB Save failed:", e);
      if (taskId) updateTask(taskId, { status: 'error', error: e.message });
      else alert("Opslaan mislukt: " + e.message);
    }
  };

  // Recipe Capture Logic
  const handleCapture = async (file) => {
    const taskId = Date.now().toString();
    const taskName = file.name.substring(0, 20);

    setActiveTasks(prev => [{
      id: taskId, type: 'image', name: taskName, status: 'processing',
      steps: [{ message: 'Foto uploaden...', done: false }]
    }, ...prev]);

    try {
      addTaskStep(taskId, 'Opslaan in cloud...');
      const { path, publicUrl, signedUrl } = await uploadSourceImage(file, user.id);

      addTaskStep(taskId, 'AI analyseert foto...');
      const result = await analyzeRecipeImage(signedUrl);

      if (!result.recipe || !result.recipe.title) throw new Error('AI kon geen recept herkennen in de foto');

      const recipeData = { ...result.recipe, ai_tags: ['📷 foto', ...(result.recipe.ai_tags || [])] };
      addTaskStep(taskId, 'Recept opslaan...');

      const extractionHistory = {
        timestamp: new Date().toISOString(), source_type: 'image', ai_model: 'gemini-3-flash-preview', tokens: result.usage
      };

      await saveRecipeToDb(recipeData, { type: 'image', original_image_url: publicUrl, raw_extracted_data: result.raw_extracted_data }, extractionHistory, taskId);
      completeTaskSteps(taskId);
    } catch (error) {
      console.error('Error processing recipe:', error);
      updateTask(taskId, { status: 'error', error: error.message });
    }
  };
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) handleCapture(file);
  };

  // --- Background Tasks UI Component (Thinking Box) ---
  const BackgroundTaskBar = () => {
    const navigate = useNavigate();
    const [expandedTasks, setExpandedTasks] = useState({});
    if (activeTasks.length === 0) return null;

    const toggleExpand = (taskId) => {
      setExpandedTasks(prev => ({ ...prev, [taskId]: !prev[taskId] }));
    };

    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-3 pointer-events-none w-full max-w-md px-4">
        <AnimatePresence>
          {activeTasks.map((task) => {
            const isExpanded = expandedTasks[task.id];
            const hasSteps = task.steps && task.steps.length > 0;

            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                layout
                className={`pointer-events-auto bg-black/90 backdrop-blur-2xl border border-white/10 shadow-2xl w-full overflow-hidden ${isExpanded ? 'rounded-2xl' : 'rounded-full'
                  } ${task.status === 'error' ? 'border-red-500/30' : task.status === 'done' ? 'border-primary/30' : ''}`}
              >
                {/* Main row */}
                <div className="flex items-center gap-4 p-2 pl-4 pr-3">
                  <div className="relative flex-shrink-0">
                    {task.status === 'processing' && (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="text-primary"
                      >
                        <Loader2 size={22} />
                      </motion.div>
                    )}
                    {task.status === 'done' && (
                      <div className="text-primary bg-primary/10 p-2 rounded-full">
                        <CheckCircle2 size={16} />
                      </div>
                    )}
                    {task.status === 'error' && (
                      <div className="text-red-500 bg-red-500/10 p-2 rounded-full">
                        <AlertCircle size={16} />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 pr-2">
                    <p className="text-white font-bold truncate text-sm">
                      {task.status === 'processing'
                        ? (task.type === 'image' ? 'AI denkt na...' : 'URL wordt onderzocht...')
                        : task.status === 'done' ? 'Recept is klaar!' : 'Er ging iets mis'}
                    </p>
                    <p className="text-[10px] text-white/40 uppercase tracking-widest font-black truncate">
                      {task.name}
                    </p>
                    {task.status === 'error' && (
                      <p className="text-[10px] text-red-400 mt-0.5 line-clamp-1">{task.error}</p>
                    )}
                  </div>

                  {/* Show details button */}
                  {hasSteps && task.status === 'processing' && (
                    <button
                      onClick={() => toggleExpand(task.id)}
                      className="text-white/40 hover:text-white/80 p-2 hover:bg-white/5 rounded-full transition-colors"
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  )}

                  {task.status === 'done' && task.resultId && (
                    <button
                      onClick={() => {
                        navigate(`/recipe/${task.resultId}`);
                        setActiveTasks(prev => prev.filter(t => t.id !== task.id));
                      }}
                      className="bg-primary hover:bg-primary/90 text-black p-2 rounded-full transition-all active:scale-90 flex items-center gap-2 px-4 shadow-lg shadow-primary/20"
                    >
                      <span className="text-[10px] font-black uppercase tracking-wider">Bekijk</span>
                      <ArrowRight size={14} />
                    </button>
                  )}

                  {task.status !== 'processing' && (
                    <button
                      onClick={() => setActiveTasks(prev => prev.filter(t => t.id !== task.id))}
                      className="text-white/20 hover:text-white/60 p-2 hover:bg-white/5 rounded-full transition-colors"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Expandable steps section */}
                <AnimatePresence>
                  {isExpanded && hasSteps && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-white/5 px-4 py-3 space-y-2">
                        {task.steps.map((step, idx) => (
                          <div key={idx} className="flex items-center gap-3 text-xs">
                            {step.done ? (
                              <Check size={12} className="text-primary flex-shrink-0" />
                            ) : (
                              <motion.div
                                animate={{ opacity: [0.3, 1, 0.3] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                                className="w-3 h-3 flex items-center justify-center"
                              >
                                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                              </motion.div>
                            )}
                            <span className={step.done ? 'text-white/50' : 'text-white font-medium'}>
                              {step.message}
                            </span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home
          activeTasks={activeTasks}
          setActiveTasks={setActiveTasks}
          searchQuery={searchQuery}
          recipes={recipes}
          collections={collections}
          loading={loading}
          searchResults={searchResults}
          instantFilteredRecipes={instantFilteredRecipes}
          scrolled={scrolled}
          isSearching={isSearching}
        />} />
        <Route path="/recipe/:id" element={<RecipePage activeTasks={activeTasks} setActiveTasks={setActiveTasks} />} />
        <Route path="/collection/:id" element={<CollectionPage />} />
        <Route path="/planning" element={<PlanningPage />} />
        <Route path="/shopping" element={<ShoppingListPage />} />
        <Route path="/favorites" element={<FavoritesPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/dashboard/users" element={<UserManagementPage />} />
        <Route path="/dashboard/profile" element={<AuthorProfilePage />} />
        <Route path="/settings" element={<AccountSettingsPage />} />
      </Routes>

      <AppHeader
        user={user}
        signOut={signOut}
        t={t}
        searchQuery={searchQuery}
        handleSearch={setSearchQuery} // Updates state
        clearSearch={() => setSearchQuery('')}
        instantFilteredRecipes={instantFilteredRecipes}
        searchResults={searchResults}
      />
      <FloatingMenu onSearch={setSearchQuery} />
      <BackgroundTaskBar />

      <input
        type="file"
        id="cameraInput"
        ref={cameraInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*"
      />

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*"
      />
    </Router>
  );
}

export default function App() {
  const { user, loading } = useAuth();

  // Use isInviteFlow captured at module load time (before Supabase cleared the hash)
  const [showProfileSetup, setShowProfileSetup] = useState(isInviteFlow);

  // Check for account completion token (our custom flow)
  const urlParams = new URLSearchParams(window.location.search);
  const completeToken = urlParams.get('complete');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Show account completion screen if token present (our custom flow)
  if (completeToken) {
    return (
      <CompleteAccountScreen
        token={completeToken}
        onComplete={() => {
          window.history.replaceState({}, document.title, window.location.pathname);
          window.location.reload();
        }}
      />
    );
  }

  // Show profile setup for invited users (show even without user - component handles polling)
  if (showProfileSetup) {
    return (
      <CompleteAccountScreen
        isInvitedUser={true}
        userEmail={user?.email}
        onComplete={() => {
          // Clear hash and reload
          window.history.replaceState({}, document.title, window.location.pathname);
          setShowProfileSetup(false);
        }}
      />
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return <AuthenticatedApp />;
}

