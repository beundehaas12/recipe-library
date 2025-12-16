import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { extractRecipeFromImage, extractRecipeFromText, translateRecipe } from './lib/gemini';
import { translations } from './lib/translations';
import CameraCapture from './components/CameraCapture';
import RecipeList from './components/RecipeList';
import RecipeCard from './components/RecipeCard';
import { ChefHat, Plus, Camera as CameraCaptureIcon, Upload as UploadIcon, Link as LinkIcon, Globe } from 'lucide-react'; // Added Globe
import { motion, AnimatePresence } from 'framer-motion';

function Home({ language, setLanguage, t }) {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchRecipes();
  }, []);

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
        isbn
      } = recipeData;

      const { data: newRecipe, error: dbError } = await supabase
        .from('recipes')
        .insert([
          {
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
      alert("Failed to save recipe: " + e.message);
      setIsProcessing(false);
    }
  };

  const handleCapture = async (file) => {
    setIsProcessing(true);
    try {
      // 1. Extract data with Gemini (Directly from file)
      const recipeData = await extractRecipeFromImage(file);

      // 2. Save via helper
      await saveRecipeToDb(recipeData, { type: 'image' });

    } catch (error) {
      console.error('Error processing recipe:', error);
      alert('Failed to process recipe. See console for details.');
      setIsProcessing(false);
    }
  };

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
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

    // Helper to fetch text with timeout
    const fetchWithProxy = async (proxyUrl) => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 10000); // 10s timeout
      const res = await fetch(proxyUrl, { signal: controller.signal });
      clearTimeout(id);
      if (!res.ok) throw new Error(`Proxy error: ${res.status}`);
      return res.text();
    };

    try {
      let htmlContent = "";

      // Try Primary Proxy (corsproxy.io)
      try {
        // direct fetch of the page content via proxy
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
        htmlContent = await fetchWithProxy(proxyUrl);
      } catch (e) {
        console.warn("Primary proxy failed, trying backup...", e);

        // Try Backup Proxy (allorigins)
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

      // Limit content size to avoid overloading Gemini context window (approx 100k chars)
      const truncatedContent = htmlContent.substring(0, 100000);

      const recipeData = await extractRecipeFromText(truncatedContent);
      await saveRecipeToDb(recipeData, { type: 'url', url });

    } catch (error) {
      console.error("URL processing failed:", error);
      alert(`Failed to extract from URL: ${error.message}`);
      setIsProcessing(false);
    }
  };


  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleCapture(file);
    }
  };


  // Hero Selection (Latest Recipe)
  const heroRecipe = recipes.length > 0 ? recipes[0] : null;

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 selection:bg-primary selection:text-white" onClick={() => setShowAddMenu(false)}>
      {/* Navbar Overlay */}
      <header className="fixed top-0 left-0 right-0 z-50 p-6 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="bg-primary/20 backdrop-blur-md border border-primary/50 text-primary p-2 rounded-xl">
            <ChefHat size={24} />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight drop-shadow-md">
            {t.appTitle}
          </h1>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-4 pointer-events-auto relative">

          {/* Language Toggle */}
          <button
            onClick={() => setLanguage(language === 'en' ? 'nl' : 'en')}
            className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 rounded-full text-white font-medium transition-all text-xs"
          >
            <Globe size={14} />
            {language.toUpperCase()}
          </button>

          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowAddMenu(!showAddMenu)}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 rounded-full text-white font-medium transition-all"
            >
              <Plus size={18} />
              <span className="hidden md:inline">{t.addRecipe}</span>
              <span className="md:hidden">Add</span>
            </button>

            <AnimatePresence>
              {showAddMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.1 }}
                  className="absolute top-full right-0 mt-2 w-48 bg-card/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden py-1 z-50"
                >
                  <button
                    onClick={handleCameraClick}
                    className="w-full text-left px-4 py-3 hover:bg-white/10 text-white flex items-center gap-3 transition-colors"
                  >
                    <CameraCaptureIcon size={18} />
                    <span>{t.takePhoto}</span>
                  </button>
                  <button
                    onClick={handleUploadClick}
                    className="w-full text-left px-4 py-3 hover:bg-white/10 text-white flex items-center gap-3 transition-colors"
                  >
                    <UploadIcon size={18} />
                    <span>{t.uploadImage}</span>
                  </button>
                  <button
                    onClick={handleUrlClick}
                    className="w-full text-left px-4 py-3 hover:bg-white/10 text-white flex items-center gap-3 transition-colors"
                  >
                    <LinkIcon size={18} />
                    <span>{t.fromUrl}</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 backdrop-blur-md" />
        </div>
      </header>

      {/* URL Input Modal */}
      <AnimatePresence>
        {showUrlInput && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowUrlInput(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-card w-full max-w-md p-6 rounded-3xl border border-white/10 shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-white mb-4">{t.pasteUrl}</h3>
              <input
                type="url"
                placeholder="https://example.com/yummy-recipe"
                className="w-full bg-muted/50 border border-white/10 rounded-xl px-4 py-3 text-white mb-6 focus:outline-none focus:ring-2 focus:ring-primary/50"
                value={urlInputValue}
                onChange={(e) => setUrlInputValue(e.target.value)}
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setShowUrlInput(false)}
                  className="flex-1 px-4 py-3 rounded-xl hover:bg-white/5 text-white/70 font-medium transition-colors translation-text"
                >
                  {t.cancel}
                </button>
                <button
                  onClick={() => processUrl(urlInputValue)}
                  disabled={!urlInputValue}
                  className="flex-1 px-4 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t.analyzeUrl}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden Global Inputs */}
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

      {/* Global Processing Overlay */}
      <AnimatePresence>
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <div className="bg-card border border-white/10 p-8 rounded-3xl flex flex-col items-center max-w-sm w-full shadow-2xl">
              <div className="relative w-16 h-16 mb-6">
                <div className="absolute inset-0 border-4 border-muted rounded-full" />
                <div className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{t.analyzing}</h3>
              <p className="text-muted-foreground text-center">{t.analyzingDesc}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="relative">
        {/* HERO SECTION */}
        {heroRecipe && (
          <div className="relative w-full h-[85vh] overflow-hidden">
            {/* Background Image */}
            <div className="absolute inset-0">
              {heroRecipe.image_url ? (
                <img
                  src={heroRecipe.image_url}
                  className="w-full h-full object-cover"
                  alt={heroRecipe.title}
                />
              ) : (
                <div className="w-full h-full bg-zinc-900" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/20 to-transparent" />
            </div>

            {/* Hero Content */}
            <div className="absolute bottom-0 left-0 max-w-2xl p-8 pb-16 z-10 flex flex-col items-start gap-4">
              <span className="px-3 py-1 rounded-full bg-primary text-white text-xs font-bold uppercase tracking-widest mb-2 shadow-lg shadow-primary/40">
                {t.latestDiscovery}
              </span>
              <h2 className="text-5xl md:text-7xl font-playfair font-black text-white leading-[0.9] drop-shadow-2xl">
                {heroRecipe.title}
              </h2>
              <p className="text-gray-200 text-lg line-clamp-2 max-w-lg drop-shadow-md font-medium">
                {heroRecipe.description || t.descriptionPlaceholder}
              </p>

              <div className="flex items-center gap-4 mt-6">
                <button
                  onClick={() => navigate(`/recipe/${heroRecipe.id}`)}
                  className="px-8 py-3 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
                >
                  <ChefHat size={20} />
                  {t.startCooking}
                </button>
                <button className="px-8 py-3 bg-white/20 backdrop-blur-md border border-white/30 text-white font-bold rounded-lg hover:bg-white/30 transition-colors">
                  {t.moreInfo}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Content Rows */}
        <div className="relative z-20 -mt-10 space-y-12 pb-24">
          {/* Row 1: Recipes */}
          <div className="min-h-[50vh] bg-gradient-to-b from-transparent via-background/80 to-background pt-10">
            {loading ? (
              <div className="flex gap-4 px-4 overflow-x-hidden">
                {[1, 2, 3].map(i => (
                  <div key={i} className="w-72 h-[420px] bg-muted rounded-2xl animate-pulse shrink-0" />
                ))}
              </div>
            ) : (
              <RecipeList recipes={recipes} t={t} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function RecipePage({ language, t }) {
  const [recipe, setRecipe] = useState(null);
  const [translatedRecipe, setTranslatedRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [translating, setTranslating] = useState(false);
  const navigate = useNavigate();
  // We need to parse the ID from the URL manually if we don't use useParams (wrapper needed)
  // But let's verify routing structure first.
  // Actually, useParams is cleaner.

  // NOTE: In a real routing setup we use useParams. 
  // Since I can't easily import useParams inside this function without the hook context 
  // (which is present because it's a child of Router), I will use it.

  const id = window.location.pathname.split('/').pop(); // Simple fallback

  // 1. Fetch Original Recipe
  useEffect(() => {
    async function fetchRecipe() {
      if (!id) return;
      try {
        const { data, error } = await supabase
          .from('recipes')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        setRecipe(data);
        setTranslatedRecipe(data); // Default to original
      } catch (error) {
        console.error('Error fetching recipe:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchRecipe();
  }, [id]);

  // 2. Handle Auto-Translation with Persistence
  useEffect(() => {
    async function doTranslation() {
      if (!recipe || !language) return;

      // A. If language is English (default), show Original
      if (language === 'en') {
        setTranslatedRecipe({ ...recipe });
        return;
      }

      // B. Check if we already have this translation in the DB
      if (recipe.translations && recipe.translations[language]) {
        // Found cached translation!
        const cached = recipe.translations[language];
        setTranslatedRecipe({
          ...cached,
          id: recipe.id,
          image_url: recipe.image_url,
          created_at: recipe.created_at,
          translations: recipe.translations
        });
        return;
      }

      // C. If not found, generate it
      setTranslating(true);
      try {
        const translatedData = await translateRecipe(recipe, language);

        // D. Save to DB (Persistence)
        const newTranslations = {
          ...(recipe.translations || {}),
          [language]: translatedData
        };

        const { error } = await supabase
          .from('recipes')
          .update({ translations: newTranslations })
          .eq('id', recipe.id);

        if (error) {
          console.warn("Failed to save translation to DB:", error);
          // Continue anyway to show result to user
        } else {
          // Update local recipe state with new translation map so we don't fetch again
          setRecipe(prev => ({ ...prev, translations: newTranslations }));
        }

        // Show result
        setTranslatedRecipe({
          ...translatedData,
          id: recipe.id,
          image_url: recipe.image_url,
          created_at: recipe.created_at,
          translations: newTranslations
        });

      } catch (e) {
        console.warn("Translation failed", e);
        setTranslatedRecipe(recipe);
      } finally {
        setTranslating(false);
      }
    }

    doTranslation();
  }, [language, recipe]);


  const handleImageUpdate = async (file) => {
    if (!recipe) return;
    setLoading(true);
    try {
      // DELETE OLD IMAGE IF EXISTS (Same logic as before)
      if (recipe.image_url) {
        try {
          const oldUrl = recipe.image_url;
          const oldFileName = oldUrl.split('/').pop();
          if (oldFileName) await supabase.storage.from('recipe-images').remove([oldFileName]);
        } catch (err) { console.warn(err); }
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('recipe-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('recipe-images')
        .getPublicUrl(filePath);

      const { data: updatedRows, error: updateError } = await supabase
        .from('recipes')
        .update({ image_url: publicUrl })
        .eq('id', recipe.id)
        .select();

      if (updateError) throw updateError;
      if (!updatedRows || updatedRows.length === 0) throw new Error("Update failed");

      setRecipe(prev => ({ ...prev, image_url: publicUrl }));
      setTranslatedRecipe(prev => ({ ...prev, image_url: publicUrl }));

    } catch (error) {
      console.error('Error updating image:', error);
      alert(`Failed to update image: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!recipe) return;
    if (!window.confirm(t.deleteConfirm)) return; // Use translated confirm

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
      const globalUpdates = {
        author: updatedFields.author,
        cookbook_name: updatedFields.cookbook_name,
        isbn: updatedFields.isbn,
        source_url: updatedFields.source_url
      };

      const contentUpdates = {
        title: updatedFields.title,
        description: updatedFields.description,
        ingredients: updatedFields.ingredients,
        instructions: updatedFields.instructions,
        prep_time: updatedFields.prep_time,
        cook_time: updatedFields.cook_time,
        servings: updatedFields.servings,
        cuisine: updatedFields.cuisine,
        difficulty: updatedFields.difficulty
      };

      let dbUpdate = {};

      if (language === 'en') {
        dbUpdate = { ...globalUpdates, ...contentUpdates };
        const { error } = await supabase.from('recipes').update(dbUpdate).eq('id', recipe.id);
        if (error) throw error;
        setRecipe(prev => ({ ...prev, ...dbUpdate }));
        setTranslatedRecipe(prev => ({ ...prev, ...dbUpdate }));
      } else {
        const { error: metaError } = await supabase.from('recipes').update(globalUpdates).eq('id', recipe.id);
        if (metaError) throw metaError;

        const currentTranslations = recipe.translations || {};
        const newLangTranslation = { ...(currentTranslations[language] || {}), ...contentUpdates };
        const newTranslationsMap = { ...currentTranslations, [language]: newLangTranslation };

        const { error: transError } = await supabase.from('recipes').update({ translations: newTranslationsMap }).eq('id', recipe.id);
        if (transError) throw transError;

        setRecipe(prev => ({ ...prev, ...globalUpdates, translations: newTranslationsMap }));
        setTranslatedRecipe(prev => ({ ...prev, ...globalUpdates, ...contentUpdates, translations: newTranslationsMap }));
      }

    } catch (error) {
      console.error("Update failed:", error);
      alert("Failed to save changes: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  if (!recipe) return <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">{t.recipeNotFound}</div>;

  // Show translated recipe if available, or fall back to original
  const displayRecipe = translatedRecipe || recipe;

  return (
    <>
      <RecipeCard
        recipe={displayRecipe}
        onImageUpdate={handleImageUpdate}
        onDelete={handleDelete}
        onUpdate={handleUpdate}
        t={t}
      />

      {/* Translating Indicator */}
      <AnimatePresence>
        {translating && (
          <motion.div
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-primary/90 text-white px-4 py-2 rounded-full shadow-lg z-50 flex items-center gap-2 backdrop-blur-md"
          >
            <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
            <span className="text-sm font-medium">Translating to {language === 'nl' ? 'Dutch' : 'English'}...</span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default function App() {
  const [language, setLanguage] = useState('en'); // 'en' or 'nl'
  const t = translations[language];

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home language={language} setLanguage={setLanguage} t={t} />} />
        <Route path="/recipe/:id" element={<RecipePage language={language} t={t} />} />
      </Routes>
    </Router>
  );
}
