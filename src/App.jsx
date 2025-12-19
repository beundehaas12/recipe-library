import React, { useState, useEffect, useRef, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { supabase, uploadTempImage, uploadSourceImage, deleteImageByUrl } from './lib/supabase';
import { extractRecipeFromImage, extractRecipeFromText } from './lib/xai';
import { processHtmlForRecipe } from './lib/htmlParser';
import { translations as t } from './lib/translations';
import { useAuth } from './context/AuthContext';
import LoginScreen from './components/LoginScreen';
import RecipeList from './components/RecipeList';
import RecipeCard from './components/RecipeCard';
import { ChefHat, Plus, Camera as CameraCaptureIcon, Upload as UploadIcon, Link as LinkIcon, Search, LogOut, X, Play, Info, Settings, ArrowRight, CheckCircle2, AlertCircle, Loader2, ExternalLink, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';

export default function App() {
  const { user, loading: authLoading, signOut } = useAuth();

  // State
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true); // Recipe loading
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [heroRecipe, setHeroRecipe] = useState(null);
  const [activeTasks, setActiveTasks] = useState([]);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInputValue, setUrlInputValue] = useState("");
  const [tokenUsage, setTokenUsage] = useState(null);
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  // Refs
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  // --- Effects ---

  useEffect(() => {
    if (!user) return;

    const loadRecipes = async () => {
      setLoading(true);
      try {
        const { fetchRecipesList } = await import('./lib/recipeService');
        const fetchedRecipes = await fetchRecipesList(user.id);
        setRecipes(fetchedRecipes || []);
        if (fetchedRecipes && fetchedRecipes.length > 0) {
          setHeroRecipe(fetchedRecipes[Math.floor(Math.random() * fetchedRecipes.length)]);
        }
      } catch (error) {
        console.error("Error fetching recipes:", error);
      } finally {
        setLoading(false);
      }
    };

    loadRecipes();

    // Subscribe to changes
    const channel = supabase
      .channel('recipes_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'recipes' }, payload => {
        console.log('Change received!', payload);
        loadRecipes();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // --- Search Logic ---

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
      return false;
    });
  }, [searchQuery, recipes]);

  const handleSearch = (query) => {
    setSearchQuery(query);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (!query.trim()) {
      setSearchResults(null);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      // Here we could do DB search if we wanted, but local filter is often enough for small lists
      // For now relying on instantFilteredRecipes
    }, 300);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults(null);
  };

  // --- Task Helpers ---

  const updateTask = (id, updates) => {
    setActiveTasks(prev => prev.map(task =>
      task.id === id ? { ...task, ...updates } : task
    ));
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

  // --- Core Recipe Logic ---

  const saveRecipeToDb = async (recipeData, sourceInfo = {}, extractionHistory = null, taskId = null) => {
    try {
      const { saveRecipe } = await import('./lib/recipeService');
      console.log('Saving recipe...', recipeData.title);
      // Pass raw recipeData. saveRecipe handles normalization
      const newRecipe = await saveRecipe(user.id, recipeData, sourceInfo, extractionHistory);

      // Update local state (though subscription might also do it)
      setRecipes(prev => [newRecipe, ...prev]);

      if (taskId) {
        updateTask(taskId, { status: 'done', resultId: newRecipe.id });
      }
      return newRecipe;
    } catch (e) {
      console.error("DB Save failed:", e);
      if (taskId) {
        updateTask(taskId, { status: 'error', error: e.message });
      } else {
        alert("Opslaan mislukt: " + e.message);
      }
      throw e;
    }
  };

  const handleCapture = async (file) => {
    const taskId = Date.now().toString();
    const taskName = file.name.substring(0, 20) + (file.name.length > 20 ? '...' : '');

    setActiveTasks(prev => [{
      id: taskId,
      type: 'image',
      name: taskName,
      status: 'processing',
      steps: [{ message: 'Preparing image...', done: false }]
    }, ...prev]);

    const startTime = Date.now();
    const extractionHistory = {
      timestamp: new Date().toISOString(),
      source_type: 'image',
      source_url: null,
      extraction_method: 'grok',
      schema_used: false,
      ai_used: true,
      ai_model: 'grok-4-1-fast-reasoning',
      tokens: null,
      estimated_cost_eur: null,
      processing_time_ms: null,
      notes: []
    };

    try {
      addTaskStep(taskId, 'Uploading to cloud...');
      const { path, publicUrl, signedUrl } = await uploadSourceImage(file, user.id);
      extractionHistory.notes.push(`Image uploaded: ${path}`);
      extractionHistory.source_url = publicUrl;

      addTaskStep(taskId, 'AI is analyzing image...');
      // DEBUG: Log what we get from AI
      const response = await extractRecipeFromImage(signedUrl);
      console.log('🤖 AI Response:', response);

      const { recipe, usage, raw_response, raw_ocr, reasoning } = response;
      setTokenUsage(usage);

      addTaskStep(taskId, 'Extracting recipe details...');
      extractionHistory.tokens = { prompt: usage.prompt_tokens, completion: usage.completion_tokens, total: usage.total_tokens };
      extractionHistory.estimated_cost_eur = (usage.prompt_tokens * 0.0003 + usage.completion_tokens * 0.0015) / 1000;
      extractionHistory.raw_response = raw_response;
      extractionHistory.raw_ocr = raw_ocr;
      extractionHistory.reasoning = reasoning;

      recipe.ai_tags = ['🤖 grok', ...(recipe.ai_tags || [])];

      addTaskStep(taskId, 'Saving recipe...');
      await saveRecipeToDb(recipe, { type: 'image', original_image_url: publicUrl }, extractionHistory, taskId);
      completeTaskSteps(taskId);

    } catch (error) {
      console.error('Error processing recipe:', error);
      updateTask(taskId, { status: 'error', error: error.message });
    }
  };

  const processUrl = async (url) => {
    if (!url) return;
    setShowUrlInput(false);
    const taskId = Date.now().toString();
    const taskName = url.replace(/^https?:\/\/(www\.)?/, '').substring(0, 20) + '...';

    setActiveTasks(prev => [{
      id: taskId,
      type: 'url',
      name: taskName,
      status: 'processing',
      steps: [{ message: 'Fetching page...', done: false }]
    }, ...prev]);

    const startTime = Date.now();
    const extractionHistory = {
      timestamp: new Date().toISOString(),
      source_type: 'url',
      source_url: url,
      extraction_method: null,
      notes: []
    };

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
        extractionHistory.notes.push('Fetched via corsproxy.io');
      } catch (e) {
        console.warn("Primary proxy failed, using backup...", e);
        const backupProxy = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
        const res = await fetch(backupProxy);
        const data = await res.json();
        if (data.contents) htmlContent = data.contents;
        else throw new Error("Backup proxy failed");
      }

      if (!htmlContent) throw new Error("Could not retrieve content");

      addTaskStep(taskId, 'Parsing content...');
      const processed = processHtmlForRecipe(htmlContent);
      let recipe;
      let usage = null;

      if (processed.type === 'schema') {
        addTaskStep(taskId, 'Recipe data found!');
        recipe = processed.data;
        extractionHistory.extraction_method = 'schema';
        recipe.ai_tags = ['📊 schema', ...(recipe.ai_tags || [])];
      } else {
        addTaskStep(taskId, 'AI is analyzing...');
        const result = await extractRecipeFromText(processed.data);
        recipe = result.recipe;
        usage = result.usage;
        setTokenUsage(usage);
        extractionHistory.extraction_method = 'grok';
        recipe.ai_tags = ['🤖 grok', ...(recipe.ai_tags || [])];
      }

      if (!recipe || !recipe.title) throw new Error('No recipe title found');

      addTaskStep(taskId, 'Saving recipe...');
      await saveRecipeToDb(recipe, { type: 'url', url }, extractionHistory, taskId);
      completeTaskSteps(taskId);

    } catch (error) {
      console.error("URL processing failed:", error);
      updateTask(taskId, { status: 'error', error: error.message });
    }
  };

  const handleSelectRecipe = async (recipe) => {
    if (!recipe) {
      setSelectedRecipe(null);
      return;
    }
    // Optimistic set
    setSelectedRecipe(recipe);
    try {
      const { fetchRecipeWithDetails } = await import('./lib/recipeService');
      const fullRecipe = await fetchRecipeWithDetails(recipe.id);
      setSelectedRecipe(fullRecipe);
    } catch (e) {
      console.error("Failed to load details:", e);
    }
  };

  const handleUpdate = async (updatedData) => {
    // In a real app we'd call updateRecipe here
    // For now the RecipeCard calls onUpdate prop but we need to implement the service call wrapper if needed
    // Actually RecipeCard calls onUpdate which usually updates local state or refetches
    // Let's assume RecipeCard handles the service call internally or we pass a handler?
    // Checking RecipeCard: it calls onUpdate(editForm).
    // It does NOT call service itself. We must handle it.

    if (!selectedRecipe) return;
    try {
      const { updateRecipe } = await import('./lib/recipeService');
      await updateRecipe(selectedRecipe.id, updatedData);
      // Refresh
      const { fetchRecipeWithDetails } = await import('./lib/recipeService');
      const refreshed = await fetchRecipeWithDetails(selectedRecipe.id);
      setSelectedRecipe(refreshed);

      // Update list
      setRecipes(prev => prev.map(r => r.id === refreshed.id ? refreshed : r));
    } catch (e) {
      console.error("Update failed:", e);
      alert("Update failed: " + e.message);
    }
  };

  const handleDelete = async () => {
    if (!selectedRecipe) return;
    try {
      const { deleteRecipe } = await import('./lib/recipeService');
      await deleteRecipe(selectedRecipe.id);
      setSelectedRecipe(null);
      setRecipes(prev => prev.filter(r => r.id !== selectedRecipe.id));
    } catch (e) {
      console.error("Delete failed:", e);
    }
  };

  // --- Handlers ---
  const handleUrlClick = () => { setShowAddMenu(false); setShowUrlInput(true); };
  const handleCameraClick = () => { setShowAddMenu(false); cameraInputRef.current?.click(); };
  const handleUploadClick = () => { setShowAddMenu(false); fileInputRef.current?.click(); };

  // --- Render ---

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <Router>
      <div className="min-h-screen bg-black text-white selection:bg-primary/30 font-sans">
        <Routes>
          <Route path="/" element={
            <main className="relative min-h-screen">
              <div className="fixed inset-0 bg-background z-0" />

              {/* Hero Background */}
              {!searchQuery && (
                <div className="fixed top-0 left-0 right-0 h-[75vh] md:h-[85vh] overflow-hidden z-0 pointer-events-none">
                  <motion.div
                    key={heroRecipe ? heroRecipe.id : 'empty'}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1 }}
                    className="absolute inset-0"
                  >
                    {heroRecipe?.image_url ? (
                      <div className="relative w-full h-full">
                        <img
                          src={heroRecipe.image_url}
                          className="w-full h-full object-cover opacity-60"
                          alt="Background"
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/20 to-black" />
                      </div>
                    ) : (
                      <div className="w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-black to-black" />
                    )}
                  </motion.div>
                </div>
              )}


              <div className="relative z-10 p-4 pb-24 md:p-8 max-w-7xl mx-auto">

                {/* Header & Search */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                  <div>
                    <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-2 bg-gradient-to-r from-white via-white to-white/50 bg-clip-text text-transparent">
                      {t.title}
                    </h1>
                    <p className="text-muted-foreground text-lg">{t.subtitle}</p>
                  </div>

                  <div className="flex items-center gap-4 w-full md:w-auto">
                    {/* Search Bar */}
                    <div className="relative flex-1 md:w-80 group">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={20} />
                      <input
                        type="text"
                        placeholder={t.searchPlaceholder}
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="w-full bg-zinc-900/50 backdrop-blur-md border border-white/10 rounded-xl py-3 pl-10 pr-10 text-white placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium"
                      />
                      {searchQuery && (
                        <button
                          onClick={clearSearch}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>

                    {/* Profile Trigger */}
                    <div className="relative">
                      <button
                        onClick={() => setShowProfileMenu(!showProfileMenu)}
                        className="w-12 h-12 rounded-xl bg-zinc-900/50 border border-white/10 flex items-center justify-center hover:bg-zinc-800 transition-colors"
                      >
                        <Settings size={20} className="text-muted-foreground" />
                      </button>

                      <AnimatePresence>
                        {showProfileMenu && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: 10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: 10 }}
                              className="absolute right-0 top-full mt-2 w-56 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 p-2"
                            >
                              <div className="p-3 border-b border-white/5 mb-2">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Signed in as</p>
                                <p className="text-sm font-medium truncate">{user.email}</p>
                              </div>
                              <button
                                onClick={signOut}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                              >
                                <LogOut size={16} />
                                Sign Out
                              </button>
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </header>

                {/* Active Tasks / Progress */}
                <AnimatePresence>
                  {activeTasks.map(task => (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, y: -20, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: 'auto' }}
                      exit={{ opacity: 0, y: -20, height: 0 }}
                      className="mb-8 overflow-hidden"
                    >
                      <div className={`p-4 rounded-2xl border ${task.status === 'error' ? 'bg-red-500/10 border-red-500/20' :
                          task.status === 'done' ? 'bg-green-500/10 border-green-500/20' :
                            'bg-primary/10 border-primary/20'
                        } bg-zinc-900/80 backdrop-blur-md`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            {task.status === 'processing' && <Loader2 className="animate-spin text-primary" size={20} />}
                            {task.status === 'done' && <CheckCircle2 className="text-green-400" size={20} />}
                            {task.status === 'error' && <AlertCircle className="text-red-400" size={20} />}
                            <span className="font-semibold text-lg">{task.name}</span>
                          </div>
                          {task.status === 'done' && (
                            <button
                              onClick={() => {
                                const newRecipe = recipes.find(r => r.id === task.resultId);
                                if (newRecipe) handleSelectRecipe(newRecipe);
                                setActiveTasks(prev => prev.filter(t => t.id !== task.id));
                              }}
                              className="text-sm font-medium bg-green-500/20 text-green-400 px-3 py-1.5 rounded-lg hover:bg-green-500/30 transition-colors"
                            >
                              Open Recipe
                            </button>
                          )}
                          {task.status === 'error' && (
                            <button
                              onClick={() => setActiveTasks(prev => prev.filter(t => t.id !== task.id))}
                              className="text-sm font-medium bg-red-500/20 text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-500/30 transition-colors"
                            >
                              Dismiss
                            </button>
                          )}
                        </div>

                        <div className="space-y-2">
                          {task.steps?.map((step, idx) => (
                            <div key={idx} className="flex items-center gap-3 text-sm">
                              <div className={`w-1.5 h-1.5 rounded-full ${step.done ? 'bg-green-400' : 'bg-primary/50'}`} />
                              <span className={step.done ? 'text-gray-400 line-through' : 'text-gray-200'}>
                                {step.message}
                              </span>
                            </div>
                          ))}
                        </div>

                        {task.error && (
                          <div className="mt-4 p-3 bg-red-950/30 rounded-xl border border-red-900/50 text-red-200 text-sm font-mono whitespace-pre-wrap">
                            {task.error}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Recipe Grid */}
                <RecipeList
                  recipes={instantFilteredRecipes || recipes}
                  isEmptyState={recipes.length === 0 && !loading && !searchQuery}
                  isNoResults={searchQuery && searchResults?.length === 0}
                  searchQuery={searchQuery}
                  onSelectRecipe={handleSelectRecipe}
                />

              </div>

              {/* Mobile FAB */}
              <div className="fixed bottom-6 right-6 z-40 md:hidden">
                <button
                  onClick={() => setShowAddMenu(true)}
                  className="w-14 h-14 bg-primary text-black rounded-full shadow-lg shadow-primary/25 flex items-center justify-center transform active:scale-95 transition-transform"
                >
                  <Plus size={28} strokeWidth={2.5} />
                </button>
              </div>

              {/* Desktop Add Button */}
              <div className="fixed bottom-8 right-8 z-40 hidden md:block">
                <button
                  onClick={() => setShowAddMenu(true)}
                  className="group flex items-center gap-3 px-6 py-4 bg-primary text-black rounded-2xl shadow-xl shadow-primary/20 hover:scale-105 hover:shadow-2xl hover:shadow-primary/30 transition-all font-bold text-lg"
                >
                  <Plus size={24} strokeWidth={3} className="group-hover:rotate-90 transition-transform duration-300" />
                  {t.addRecipe}
                </button>
              </div>

              {/* Add Options Modal */}
              <AnimatePresence>
                {showAddMenu && (
                  <>
                    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center pointer-events-none">
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto"
                        onClick={() => setShowAddMenu(false)}
                      />

                      <motion.div
                        initial={{ y: 100, opacity: 0, scale: 0.9 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: 100, opacity: 0, scale: 0.9 }}
                        className="relative z-50 w-full md:w-[600px] bg-zinc-900 border border-white/10 md:rounded-3xl rounded-t-3xl p-6 md:p-8 shadow-2xl pointer-events-auto mb-0 md:mb-8 mx-4"
                      >
                        <div className="flex items-center justify-between mb-8">
                          <h3 className="text-2xl font-bold">{t.addRecipeTitle}</h3>
                          <button onClick={() => setShowAddMenu(false)} className="p-2 hover:bg-white/10 rounded-full">
                            <X size={24} />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <button
                            onClick={handleCameraClick}
                            className="flex flex-col items-center gap-4 p-6 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-primary/50 rounded-2xl transition-all group"
                          >
                            <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                              <CameraCaptureIcon size={32} className="text-primary" />
                            </div>
                            <div className="text-center">
                              <span className="block text-lg font-bold mb-1">{t.takePhoto}</span>
                              <span className="text-sm text-muted-foreground">{t.takePhotoDesc}</span>
                            </div>
                          </button>

                          <button
                            onClick={handleUploadClick}
                            className="flex flex-col items-center gap-4 p-6 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-primary/50 rounded-2xl transition-all group"
                          >
                            <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                              <UploadIcon size={32} className="text-blue-400" />
                            </div>
                            <div className="text-center">
                              <span className="block text-lg font-bold mb-1">{t.uploadPhoto}</span>
                              <span className="text-sm text-muted-foreground">{t.uploadPhotoDesc}</span>
                            </div>
                          </button>


                          <button
                            onClick={handleUrlClick}
                            className="flex flex-col items-center gap-4 p-6 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-primary/50 rounded-2xl transition-all group md:col-span-2"
                          >
                            <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                              <LinkIcon size={32} className="text-purple-400" />
                            </div>
                            <div className="text-center">
                              <span className="block text-lg font-bold mb-1">{t.pasteUrl}</span>
                              <span className="text-sm text-muted-foreground">{t.pasteUrlDesc}</span>
                            </div>
                          </button>
                        </div>
                      </motion.div>
                    </div>
                  </>
                )}
              </AnimatePresence>

              {/* URL Input Modal */}
              <AnimatePresence>
                {showUrlInput && (
                  <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                      onClick={() => setShowUrlInput(false)}
                    />
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      className="relative bg-zinc-900 border border-white/10 p-6 rounded-2xl w-full max-w-lg shadow-2xl"
                    >
                      <h3 className="text-xl font-bold mb-4">{t.enterUrl}</h3>
                      <input
                        type="url"
                        placeholder="https://..."
                        value={urlInputValue}
                        onChange={(e) => setUrlInputValue(e.target.value)}
                        className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-white mb-6 focus:outline-none focus:border-primary transition-colors"
                        autoFocus
                      />
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={() => setShowUrlInput(false)}
                          className="px-4 py-2 text-sm font-medium hover:bg-white/10 rounded-lg transition-colors"
                        >
                          {t.cancel}
                        </button>
                        <button
                          onClick={() => processUrl(urlInputValue)}
                          disabled={!urlInputValue}
                          className="px-6 py-2 bg-primary text-black font-bold rounded-lg hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                          {t.analyze}
                        </button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>

              {/* Recipe Card Modal */}
              <AnimatePresence>
                {selectedRecipe && (
                  <RecipeCard
                    recipe={selectedRecipe}
                    onClose={() => setSelectedRecipe(null)}
                    onUpdate={handleUpdate}
                    onDelete={handleDelete}
                    t={t}
                  />
                )}
              </AnimatePresence>

              {/* Hidden File Inputs */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleCapture(file);
                  e.target.value = '';
                }}
                accept="image/*"
                className="hidden"
              />
              <input
                type="file"
                ref={cameraInputRef}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleCapture(file);
                  e.target.value = '';
                }}
                accept="image/*"
                capture="environment"
                className="hidden"
              />

            </main>
          } />
        </Routes>
      </div>
    </Router>
  );
}
