import React, { useState, useEffect, useRef, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { supabase, uploadTempImage, deleteTempImage } from './lib/supabase';
import { extractRecipeFromImage, extractRecipeFromText } from './lib/xai';
import { processHtmlForRecipe } from './lib/htmlParser';
import { translations as t } from './lib/translations';
import { useAuth } from './context/AuthContext';
import LoginScreen from './components/LoginScreen';
import RecipeList from './components/RecipeList';
import RecipeCard from './components/RecipeCard';
import { ChefHat, Plus, Camera as CameraCaptureIcon, Upload as UploadIcon, Link as LinkIcon, Search, LogOut, X, Play, Info, Settings, ArrowRight, CheckCircle2, AlertCircle, Loader2, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';

function Home({ activeTasks, setActiveTasks }) {
  const { user, signOut } = useAuth();
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [tokenUsage, setTokenUsage] = useState(null);
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

  // Helper to update background task status
  const updateTask = (id, updates) => {
    setActiveTasks(prev => prev.map(task =>
      task.id === id ? { ...task, ...updates } : task
    ));
  };

  const saveRecipeToDb = async (recipeData, sourceInfo = {}, extractionHistory = null, taskId = null) => {
    try {
      const {
        title,
        description,
        ingredients,
        instructions,
        servings,
        prep_time,
        cook_time,
        difficulty,
        cuisine,
        author,
        cookbook_name,
        isbn,
        source_language,
        ai_tags
      } = recipeData;

      const insertData = {
        user_id: user.id,
        title,
        description,
        ingredients,
        instructions,
        servings,
        prep_time,
        cook_time,
        difficulty,
        cuisine,
        author,
        cookbook_name,
        isbn,
        source_url: sourceInfo.url || null,
        source_type: sourceInfo.type || 'manual',
        source_language: source_language || 'en',
        ai_tags: ai_tags || [],
        extraction_history: extractionHistory,
        image_url: null,
        original_image_url: null,
      };

      console.log('Inserting recipe data:', insertData);

      const { data: newRecipe, error: dbError } = await supabase
        .from('recipes')
        .insert([insertData])
        .select()
        .single();

      if (dbError) throw dbError;

      setRecipes([newRecipe, ...recipes]);

      if (taskId) {
        updateTask(taskId, { status: 'done', resultId: newRecipe.id });
      }
    } catch (e) {
      console.error("DB Save failed:", e);
      if (taskId) {
        updateTask(taskId, { status: 'error', error: e.message });
      } else {
        alert("Opslaan mislukt: " + e.message);
      }
    }
  };

  // =============================================================================
  // RECIPE CAPTURE FLOW (xAI + Supabase Storage)
  // =============================================================================
  // 1. Upload image to Supabase Storage (temp folder)
  // 2. Generate signed URL (2 min expiry)
  // 3. Call Edge Function with signed URL (secure - no API key in browser)
  // 4. Delete temp image on success
  // 5. Save recipe to database
  // =============================================================================
  const handleCapture = async (file) => {
    const taskId = Date.now().toString();
    const taskName = file.name.substring(0, 20) + (file.name.length > 20 ? '...' : '');

    // Add to background tasks
    setActiveTasks(prev => [{
      id: taskId,
      type: 'image',
      name: taskName,
      status: 'processing'
    }, ...prev]);

    let imagePath = null;
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
      console.log('Uploading image to Supabase Storage...');
      const { path, signedUrl } = await uploadTempImage(file, user.id);
      imagePath = path;
      extractionHistory.notes.push('Image uploaded to Supabase Storage');

      console.log('Calling xAI via Edge Function...');
      const { recipe, usage, raw_response, raw_ocr, reasoning } = await extractRecipeFromImage(signedUrl);
      setTokenUsage(usage);

      extractionHistory.tokens = { prompt: usage.prompt_tokens, completion: usage.completion_tokens, total: usage.total_tokens };
      extractionHistory.estimated_cost_eur = (usage.prompt_tokens * 0.0003 + usage.completion_tokens * 0.0015) / 1000;
      extractionHistory.raw_response = raw_response;
      extractionHistory.raw_ocr = raw_ocr;
      extractionHistory.reasoning = reasoning;
      extractionHistory.notes.push('AI extracted recipe from image (OCR + Reasoning + JSON)');

      console.log('DEBUG: Keeping temp image for inspection:', imagePath);
      extractionHistory.notes.push(`DEBUG: Image kept at ${imagePath}`);
      extractionHistory.processing_time_ms = Date.now() - startTime;
      recipe.ai_tags = ['🤖 grok', ...(recipe.ai_tags || [])];

      await saveRecipeToDb(recipe, { type: 'image' }, extractionHistory, taskId);

    } catch (error) {
      console.error('Error processing recipe:', error);
      updateTask(taskId, { status: 'error', error: error.message });
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
    const taskId = Date.now().toString();
    const taskName = url.replace(/^https?:\/\/(www\.)?/, '').substring(0, 20) + '...';

    setActiveTasks(prev => [{
      id: taskId,
      type: 'url',
      name: taskName,
      status: 'processing'
    }, ...prev]);

    const startTime = Date.now();
    const extractionHistory = {
      timestamp: new Date().toISOString(),
      source_type: 'url',
      source_url: url,
      extraction_method: null,
      schema_used: false,
      ai_used: false,
      ai_model: null,
      tokens: null,
      estimated_cost_eur: null,
      processing_time_ms: null,
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
        console.warn("Primary proxy failed, trying backup...", e);
        extractionHistory.notes.push('Primary proxy failed, using backup');
        const backupProxy = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
        const res = await fetch(backupProxy);
        const data = await res.json();
        if (data.contents) {
          htmlContent = data.contents;
          extractionHistory.notes.push('Fetched via allorigins.win');
        } else {
          throw new Error("Backup proxy also failed");
        }
      }

      if (!htmlContent) throw new Error("Could not retrieve content from URL");

      const processed = processHtmlForRecipe(htmlContent);
      let recipe;
      let usage = null;

      if (processed.type === 'schema') {
        recipe = processed.data;
        extractionHistory.extraction_method = 'schema';
        extractionHistory.schema_used = true;
        extractionHistory.notes.push('Schema.org JSON-LD data found');
        recipe.ai_tags = ['📊 schema', ...(recipe.ai_tags || [])];
      } else {
        const result = await extractRecipeFromText(processed.data);
        recipe = result.recipe;
        usage = result.usage;
        setTokenUsage(usage);
        extractionHistory.extraction_method = processed.schemaRecipe ? 'schema+grok' : 'grok';
        extractionHistory.schema_used = !!processed.schemaRecipe;
        extractionHistory.ai_used = true;
        extractionHistory.ai_model = 'grok-4-1-fast-reasoning';
        extractionHistory.tokens = { prompt: usage.prompt_tokens, completion: usage.completion_tokens, total: usage.total_tokens };
        extractionHistory.estimated_cost_eur = (usage.prompt_tokens * 0.0003 + usage.completion_tokens * 0.0015) / 1000;
        extractionHistory.reasoning = result.reasoning;
        extractionHistory.notes.push('AI extracted recipe from cleaned HTML (Reasoning active)');
        recipe.ai_tags = ['🤖 grok', ...(recipe.ai_tags || [])];
      }

      extractionHistory.processing_time_ms = Date.now() - startTime;
      if (!recipe || !recipe.title) throw new Error('Kon geen recepttitel vinden op deze pagina');

      await saveRecipeToDb(recipe, { type: 'url', url }, extractionHistory, taskId);

    } catch (error) {
      console.error("URL processing failed:", error);
      updateTask(taskId, { status: 'error', error: error.message });
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleCapture(file);
    }
  };

  // --- Background Tasks UI Component ---
  const BackgroundTaskBar = () => {
    if (activeTasks.length === 0) return null;

    return (
      <div className="fixed bottom-24 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {activeTasks.map((task) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.9 }}
              className={`pointer-events-auto flex items-center gap-4 bg-[#18181b]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl min-w-[300px] max-w-sm ${task.status === 'error' ? 'border-red-500/30' :
                task.status === 'done' ? 'border-primary/30' : ''
                }`}
            >
              <div className="relative">
                {task.status === 'processing' && (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="text-primary"
                  >
                    <Loader2 size={24} />
                  </motion.div>
                )}
                {task.status === 'done' && (
                  <div className="text-primary">
                    <CheckCircle2 size={24} />
                  </div>
                )}
                {task.status === 'error' && (
                  <div className="text-red-500">
                    <AlertCircle size={24} />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-xs text-white/40 uppercase tracking-widest font-black mb-0.5">
                  {task.type === 'image' ? 'Beeld Analyse' : 'URL Analyse'}
                </p>
                <p className="text-white font-bold truncate text-sm">
                  {task.name}
                </p>
                {task.status === 'error' && (
                  <p className="text-[10px] text-red-400 mt-1 line-clamp-1">{task.error}</p>
                )}
              </div>

              {task.status === 'done' && task.resultId && (
                <button
                  onClick={() => {
                    navigate(`/recipe/${task.resultId}`);
                    setActiveTasks(prev => prev.filter(t => t.id !== task.id));
                  }}
                  className="bg-primary/20 hover:bg-primary/30 text-primary p-2 rounded-xl transition-colors"
                  title="Bekijk recept"
                >
                  <ArrowRight size={18} />
                </button>
              )}

              {task.status !== 'processing' && (
                <button
                  onClick={() => setActiveTasks(prev => prev.filter(t => t.id !== task.id))}
                  className="text-white/20 hover:text-white/60 p-1"
                >
                  <X size={14} />
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    );
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
        className={`fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-between transition-all duration-500 ${scrolled ? 'bg-background/80 backdrop-blur-xl border-b border-white/5 shadow-lg' : 'bg-transparent'
          }`}
      >
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
              className="input-standard !rounded-full pl-10 h-11"
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
          {/* Mobile Search Icon */}
          <button
            onClick={() => setShowMobileSearch(true)}
            className="md:hidden p-2 text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <Search size={22} />
          </button>

          {/* Add Recipe */}
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => {
                setShowAddMenu(!showAddMenu);
                setShowProfileMenu(false);
              }}
              className="h-11 px-4 rounded-full bg-white/5 border border-white/10 backdrop-blur-md hover:bg-white/10 transition-all flex items-center gap-2.5 whitespace-nowrap active:scale-95 group shadow-xl"
            >
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
                <Plus size={14} className="text-primary" />
              </div>
              <span className="hidden md:inline text-sm font-bold text-white tracking-tight">
                {t.addRecipe}
              </span>
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
                    className="w-full text-left px-4 py-2.5 hover:bg-white/5 text-gray-200 flex items-center gap-3 transition-colors text-sm font-semibold group/item"
                  >
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover/item:bg-primary/20 group-hover/item:text-primary transition-colors">
                      <CameraCaptureIcon size={16} />
                    </div>
                    <span>{t.takePhoto}</span>
                  </button>
                  <button
                    onClick={handleUploadClick}
                    className="w-full text-left px-4 py-2.5 hover:bg-white/5 text-gray-200 flex items-center gap-3 transition-colors text-sm font-semibold group/item"
                  >
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover/item:bg-primary/20 group-hover/item:text-primary transition-colors">
                      <UploadIcon size={16} />
                    </div>
                    <span>{t.uploadImage}</span>
                  </button>
                  <button
                    onClick={handleUrlClick}
                    className="w-full text-left px-4 py-2.5 hover:bg-white/5 text-gray-200 flex items-center gap-3 transition-colors text-sm font-semibold group/item"
                  >
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover/item:bg-primary/20 group-hover/item:text-primary transition-colors">
                      <LinkIcon size={16} />
                    </div>
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
              className="h-11 w-11 shrink-0 rounded-full bg-card border border-white/10 flex items-center justify-center text-xs font-bold text-white shadow-xl hover:scale-105 hover:border-primary/50 transition-all overflow-hidden"
            >
              {user?.user_metadata?.avatar_url ? (
                <img src={user.user_metadata.avatar_url} className="w-full h-full object-cover" alt="Avatar" />
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
              className="glass-panel w-full max-w-md p-8 rounded-[var(--radius)] shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-2xl font-bold text-white mb-2">{t.pasteUrl}</h3>
              <p className="text-muted-foreground text-sm mb-6">Plak een link van je favoriete receptensite.</p>

              <input
                type="url"
                placeholder="https://example.com/lekker-recept"
                className="input-standard mb-6 !py-4 text-lg"
                value={urlInputValue}
                onChange={(e) => setUrlInputValue(e.target.value)}
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setShowUrlInput(false)}
                  className="btn-secondary flex-1"
                >
                  {t.cancel}
                </button>
                <button
                  onClick={() => processUrl(urlInputValue)}
                  disabled={!urlInputValue}
                  className="btn-primary flex-1 !text-black"
                >
                  {t.analyzeUrl}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Search Overlay */}
      <AnimatePresence>
        {showMobileSearch && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[70] bg-[#09090b] flex flex-col pt-safe"
          >
            <div className="flex items-center gap-4 px-6 py-4 border-b border-white/10 mt-safe-top glass-panel !border-none">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <input
                  autoFocus
                  type="text"
                  placeholder={t.searchPlaceholder}
                  className="input-standard !rounded-full pl-10 py-3"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                />
                {searchQuery && (
                  <button
                    onClick={clearSearch}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              <button
                onClick={() => {
                  setShowMobileSearch(false);
                  if (!searchQuery) clearSearch();
                }}
                className="text-white font-medium px-2"
              >
                {t.cancel}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {/* Mobile Search Results */}
              {(instantFilteredRecipes || searchResults) && searchQuery && (
                <div className="space-y-4 pb-20">
                  {(instantFilteredRecipes || searchResults).length > 0 ? (
                    (instantFilteredRecipes || searchResults).map(recipe => (
                      <div
                        key={recipe.id}
                        onClick={() => {
                          navigate(`/recipe/${recipe.id}`);
                          setShowMobileSearch(false);
                        }}
                        className="flex items-center gap-4 p-3 glass-card rounded-[var(--radius-btn)] active:bg-white/10"
                      >
                        {recipe.image_url ? (
                          <img src={recipe.image_url} alt={recipe.title} className="w-16 h-16 rounded-[var(--radius-btn)] object-cover" />
                        ) : (
                          <div className="w-16 h-16 rounded-[var(--radius-btn)] bg-white/10 flex items-center justify-center">
                            <ChefHat size={24} className="text-white/20" />
                          </div>
                        )}
                        <div>
                          <h4 className="font-bold text-white line-clamp-1">{recipe.title}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            {recipe.cuisine && <span className="text-xs text-muted-foreground uppercase">{recipe.cuisine}</span>}
                            {recipe.cook_time && <span className="text-xs text-muted-foreground">• {recipe.cook_time}</span>}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-muted-foreground py-10">
                      {t.noResults} <span className="text-primary">"{searchQuery}"</span>
                    </div>
                  )}
                </div>
              )}
            </div>
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

      {/* Background Tasks Progress Bar */}
      <BackgroundTaskBar />

      <main className="relative min-h-screen">
        {!searchQuery && (
          <div className="relative w-full h-[75vh] md:h-[85vh] overflow-hidden">
            {/* Background */}
            <motion.div
              layoutId={heroRecipe ? `image-${heroRecipe.id}` : 'hero-bg'}
              className="absolute inset-0 z-0"
            >
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
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent z-10" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/20 to-transparent z-10" />
            </motion.div>

            {/* Hero Content - Anchored to bottom like Detail Page */}
            <div className="absolute bottom-0 left-0 right-0 z-20 pb-12 pointer-events-none">
              <div className="max-w-7xl mx-auto px-6 md:px-12 w-full flex flex-col items-start gap-4">
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
                      layoutId={`title-${heroRecipe.id}`}
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
        <div className={`relative z-20 space-y-12 pb-24 bg-background ${searchQuery ? 'pt-32' : 'pt-12'}`}>
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
  const [activeTasks, setActiveTasks] = useState([]);

  // --- Background Tasks UI Component ---
  const BackgroundTaskBar = () => {
    const navigate = useNavigate();
    if (activeTasks.length === 0) return null;

    return (
      <div className="fixed bottom-28 left-0 right-0 md:left-auto md:right-6 md:bottom-24 z-[100] flex flex-col items-center md:items-end px-6 gap-3 pointer-events-none">
        <AnimatePresence>
          {activeTasks.map((task) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, x: 20 }}
              className={`pointer-events-auto flex items-center gap-4 bg-[#1c1c1f] border border-white/10 rounded-full p-2 pl-4 pr-3 shadow-2xl w-full max-w-sm ${task.status === 'error' ? 'border-red-500/30' :
                task.status === 'done' ? 'border-primary/30' : ''
                }`}
            >
              <div className="relative flex-shrink-0">
                {task.status === 'processing' && (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="text-primary"
                  >
                    <Loader2 size={24} />
                  </motion.div>
                )}
                {task.status === 'done' && (
                  <div className="text-primary bg-primary/10 p-2 rounded-full">
                    <CheckCircle2 size={18} />
                  </div>
                )}
                {task.status === 'error' && (
                  <div className="text-red-500 bg-red-500/10 p-2 rounded-full">
                    <AlertCircle size={18} />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0 pr-2">
                <p className="text-white font-bold truncate text-sm">
                  {task.status === 'processing'
                    ? (task.type === 'image' ? 'Recept wordt geanalyseerd...' : 'URL wordt onderzocht...')
                    : task.status === 'done' ? 'Recept is klaar!' : 'Er ging iets mis'}
                </p>
                <p className="text-[10px] text-white/40 uppercase tracking-widest font-black truncate">
                  {task.name}
                </p>
                {task.status === 'error' && (
                  <p className="text-[10px] text-red-400 mt-0.5 line-clamp-1">{task.error}</p>
                )}
              </div>

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
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home activeTasks={activeTasks} setActiveTasks={setActiveTasks} />} />
        <Route path="/recipe/:id" element={<RecipePage activeTasks={activeTasks} setActiveTasks={setActiveTasks} />} />
      </Routes>
      <BackgroundTaskBar />
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
