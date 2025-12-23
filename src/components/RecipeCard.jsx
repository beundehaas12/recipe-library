import { useState, useEffect } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { Clock, Users, ArrowLeft, ChefHat, Flame, Utensils, Edit, Camera, Minus, Plus, Trash2, Sparkles, Globe, Share2, Info, ExternalLink, ChevronDown, Zap, Loader2, FileText, Image, X, Heart, Calendar as CalendarIcon } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { translations as t } from '../lib/translations';
import { reviewRecipeWithAI, reAnalyzeRecipeFromStoredImage, enrichRecipe } from '../lib/xai';
import { extractImagesFromHtml } from '../lib/htmlParser';
import { uploadExternalImage } from '../lib/supabase';

import { RecipeReviewModal } from './RecipeReviewModal';
import AddToPlanModal from './AddToPlanModal';
import BackButton from './BackButton';
import { useAuth } from '../context/AuthContext';
import { toggleFavorite, checkIsFavorite } from '../lib/plannerService';

// Language code to Dutch name mapping
const languageNames = {
    nl: t.languageNL,
    en: t.languageEN,
    de: t.languageDE,
    fr: t.languageFR,
    es: t.languageES,
    it: t.languageIT,
};

// Standalone image selection modal
function ImageSelectModal({ images, onSelect, onCancel }) {
    const [selected, setSelected] = useState(null);

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl"
            >
                <div className="p-6 border-b border-white/10">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Image size={20} className="text-primary" /> Kies een afbeelding
                    </h2>
                    <p className="text-white/60 text-sm mt-1">{images.length} afbeeldingen gevonden</p>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    <div className="grid grid-cols-3 gap-3">
                        {images.map((img, idx) => (
                            <button
                                key={idx}
                                onClick={() => setSelected(selected === img ? null : img)}
                                className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${selected === img
                                    ? 'border-primary ring-2 ring-primary/50'
                                    : 'border-white/10 hover:border-white/30'
                                    }`}
                            >
                                <img
                                    src={img}
                                    alt={`Optie ${idx + 1}`}
                                    className="w-full h-full object-cover"
                                    onError={(e) => { e.target.parentElement.style.display = 'none'; }}
                                />
                                {selected === img && (
                                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                        <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                                            <X size={14} className="text-black" style={{ transform: 'rotate(45deg)' }} />
                                        </div>
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="p-6 border-t border-white/10 flex gap-3 justify-end">
                    <button onClick={onCancel} className="px-4 py-2 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-colors font-medium text-sm">
                        Annuleren
                    </button>
                    <button
                        onClick={() => onSelect(selected)}
                        disabled={!selected}
                        className="px-6 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Selecteren
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

export default function RecipeCard({ recipe, onImageUpdate, onDelete, onUpdate }) {
    const navigate = useNavigate();
    const location = useLocation();
    const [currentServings, setCurrentServings] = useState(recipe?.servings || 4);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({});
    // Collapsible sections state
    const [expandedSections, setExpandedSections] = useState({
        about: true,
        ingredients: true,
        ai: true,
        history: false
    });
    const [isAIProcessing, setIsAIProcessing] = useState(false);
    const [showSourceModal, setShowSourceModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    // Planner & Favorites
    const { user } = useAuth();
    const [isFavorite, setIsFavorite] = useState(false);
    const [showPlanModal, setShowPlanModal] = useState(false);

    useEffect(() => {
        if (user && recipe) {
            checkIsFavorite(recipe.id, user.id).then(setIsFavorite);
        }
    }, [user, recipe]);

    const handleToggleFavorite = async () => {
        try {
            const newState = await toggleFavorite(recipe.id, user.id);
            setIsFavorite(newState);
        } catch (e) {
            console.error(e);
        }
    };

    // New state for AI Review
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [pendingRecipe, setPendingRecipe] = useState(null);
    const [extractedImages, setExtractedImages] = useState([]);
    const [showImageModal, setShowImageModal] = useState(false);
    const [isImageLoading, setIsImageLoading] = useState(false);

    const toggleSection = (section) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    // Unified scroll flow - removing parallax for synchronized movement
    const { scrollY } = useScroll();

    // Ensure the sticky header background is strictly transparent at the top and during overscroll
    const headerBgColor = useTransform(
        scrollY,
        [0, 100, 200],
        ['rgba(9, 9, 11, 0)', 'rgba(9, 9, 11, 0)', 'rgba(9, 9, 11, 0.85)']
    );
    const headerBlurFilter = useTransform(
        scrollY,
        [0, 100, 200],
        ['blur(0px)', 'blur(0px)', 'blur(16px)']
    );
    const headerTitleOpacity = useTransform(scrollY, [150, 250], [0, 1]);

    useEffect(() => {
        if (recipe?.servings) {
            const baseServings = typeof recipe.servings === 'number' ? recipe.servings : parseInt(recipe.servings) || 4;
            setCurrentServings(baseServings);
        }
    }, [recipe]);


    useEffect(() => {
        if (isEditing && recipe) {
            setEditForm({
                title: recipe.title || '',
                subtitle: recipe.subtitle || '',
                introduction: recipe.introduction || '',
                description: recipe.description || '',
                prep_time: recipe.prep_time || '',
                cook_time: recipe.cook_time || '',
                servings: recipe.servings || 4,
                cuisine: recipe.cuisine || '',
                difficulty: recipe.difficulty || '',
                author: recipe.author || '',
                cookbook_name: recipe.cookbook_name || '',
                isbn: recipe.isbn || '',
                source_url: recipe.source_url || '',
                ingredients: recipe.ingredients || [],
                instructions: recipe.instructions || []
            });
        }
    }, [isEditing, recipe]);

    if (!recipe) return null;

    const handleSave = () => {
        onUpdate(editForm);
        setIsEditing(false);
    };

    const handleCancel = () => {
        setIsEditing(false);
    };

    const baseServings = typeof recipe.servings === 'number' ? recipe.servings : parseInt(recipe.servings) || 4;
    const scaleFactor = currentServings / baseServings;

    const parseAndScaleString = (str) => {
        const regex = /^(\d+(?:\.\d+)?|\d+\/\d+|\d+\s+\d+\/\d+)\s*([a-zA-Z]+)?\s+(.*)/;
        const match = str.match(regex);
        if (match) {
            let amountStr = match[1];
            let unit = match[2] || '';
            let item = match[3];
            let amount = 0;
            if (amountStr.includes(' ')) {
                const parts = amountStr.split(' ');
                amount = parseFloat(parts[0]) + eval(parts[1]);
            } else if (amountStr.includes('/')) {
                amount = eval(amountStr);
            } else {
                amount = parseFloat(amountStr);
            }
            const scaledAmount = Math.round(amount * scaleFactor * 100) / 100;
            return (<span><span className="font-bold text-primary">{scaledAmount}</span>{unit && <span className="text-muted-foreground mx-1">{unit}</span>}<span>{item}</span></span>);
        }
        return str;
    };

    const formatIngredient = (ing) => {
        // Support both old format (item) and new format (name)
        if (typeof ing === 'object' && ing !== null && ('item' in ing || 'name' in ing)) {
            let amount = ing.amount;
            if (typeof amount === 'number') amount = Math.round(amount * scaleFactor * 100) / 100;
            const ingredientName = ing.name || ing.item;
            return (<span><span className="font-bold text-white">{amount}</span>{ing.unit && <span className="text-muted-foreground mx-1">{ing.unit}</span>}<span>{ingredientName}</span></span>);
        }
        return parseAndScaleString(String(ing));
    };

    const sourceLangName = languageNames[recipe.source_language] || recipe.source_language || t.languageUnknown;

    const handleAIImprovement = async () => {
        setIsAIProcessing(true);
        setExtractedImages([]); // Reset
        try {
            const isPhoto = !!recipe.original_image_url || recipe.source_type === 'image';
            let freshRecipe, usage;
            let images = [];

            if (isPhoto) {
                // Path 1: Vision Re-analysis with smart validation
                const imageSource = recipe.original_image_url || (recipe.source_url?.includes('/storage/v1/object/public/') ? recipe.source_url : null);
                if (!imageSource) throw new Error("Originele foto niet gevonden.");

                // Pass existing recipe data for smart validation and enrichment
                const result = await reAnalyzeRecipeFromStoredImage(imageSource, recipe);
                freshRecipe = result.recipe;
                usage = result.usage;
            } else {
                // Path 2: Text-based Review
                const sourceData = recipe.extraction_history?.raw_response || '';
                const result = await reviewRecipeWithAI(recipe, sourceData);
                freshRecipe = result.recipe;
                usage = result.usage;
            }

            // Calculate changes
            const changes = [];
            // Instead of auto-saving, show the review modal
            if (freshRecipe) {
                // Ensure ID is preserved for the update logic
                freshRecipe.id = recipe.id;
                // Add review entry for history tracking
                freshRecipe.extraction_history = {
                    ...recipe.extraction_history,
                    reviews: [...(recipe.extraction_history?.reviews || []), {
                        timestamp: new Date().toISOString(),
                        tokens_used: usage.total_tokens,
                        type: isPhoto ? 'vision_reanalysis' : 'text_review',
                        ai_model: 'gemini-3-flash-preview',
                        changes: ['Review pending...']
                    }]
                };

                setExtractedImages(images);
                setPendingRecipe(freshRecipe);
                setShowReviewModal(true);
            }

        } catch (error) {
            console.error("AI improvement failed:", error);
            alert("Er ging iets mis: " + error.message);
        } finally {
            setIsAIProcessing(false);
        }
    };

    const handleConfirmReview = async (improvedRecipe) => {
        // Merge the improved recipe with the original ID just to be safe
        console.log('✅ Applying AI improvements:', improvedRecipe);
        const updates = {
            ...recipe,           // Base: original
            ...improvedRecipe,   // Overlay: improvements
            id: recipe.id        // Critical: keep ID
        };

        await onUpdate(updates);
        setShowReviewModal(false);
        setPendingRecipe(null);
    };

    const handleCancelReview = () => {
        console.log('❌ AI improvements cancelled by user');
        setShowReviewModal(false);
        setPendingRecipe(null);
        setExtractedImages([]);
    };

    // Handle image edit - fetch images from URL and show selector
    const handleImageEdit = async () => {
        const isUrlRecipe = recipe.source_url && !recipe.source_url.includes('/storage/v1/');

        if (isUrlRecipe) {
            setIsImageLoading(true);
            try {
                const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(recipe.source_url)}`;
                const response = await fetch(proxyUrl);
                if (response.ok) {
                    const html = await response.text();
                    const images = extractImagesFromHtml(html, recipe.source_url);
                    setExtractedImages(images);
                    setShowImageModal(true);
                } else {
                    alert('Kon afbeeldingen niet ophalen van URL');
                }
            } catch (e) {
                console.error('Failed to fetch images:', e);
                alert('Fout bij ophalen afbeeldingen');
            } finally {
                setIsImageLoading(false);
            }
        }
    };

    // Handle image selection from modal
    const handleImageSelect = async (selectedImage) => {
        if (!selectedImage) {
            setShowImageModal(false);
            setExtractedImages([]);
            return;
        }

        try {
            const userId = recipe.user_id;
            const { publicUrl } = await uploadExternalImage(selectedImage, userId);
            await onUpdate({ ...recipe, image_url: publicUrl });
            console.log('✅ Image updated:', publicUrl);
        } catch (err) {
            console.error('Failed to upload image:', err);
            await onUpdate({ ...recipe, image_url: selectedImage });
        }

        setShowImageModal(false);
        setExtractedImages([]);
    };

    return (
        <div className="bg-background min-h-screen pb-20 overflow-x-hidden scroll-smooth">
            {/* Immersive Header - Unified Scroll Container */}
            <div className="relative w-full h-[60vh] md:h-[75vh]">
                <motion.div
                    layoutId={`image-${recipe.id}`}
                    className="absolute inset-0 z-0"
                >
                    {recipe.image_url ? (
                        <img
                            src={recipe.image_url}
                            alt={recipe.title}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                        />
                    ) : (
                        <div className="w-full h-full bg-secondary flex items-center justify-center">
                            <ChefHat size={100} className="text-muted-foreground/20" strokeWidth={1} />
                        </div>
                    )}
                    {/* Bottom-weighted gradient for smooth transition to content - Top remains 100% clean */}
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent z-10" />
                </motion.div>

                {/* Modals */}
                <AnimatePresence>
                    {showPlanModal && (
                        <AddToPlanModal
                            recipe={recipe}
                            onClose={() => setShowPlanModal(false)}
                            onShowShoppingConfirm={() => alert("Ingrediënten toegevoegd aan boodschappenlijst!")}
                        />
                    )}
                </AnimatePresence>

                {/* Cinematic Floating Header - Completely transparent background version */}
                <header className="fixed top-0 left-0 right-0 z-50 pointer-events-none px-4 lg:px-20 py-4">
                    <div className="max-w-[1600px] mx-auto w-full flex justify-between items-center px-0">
                        <BackButton />

                        <div className="flex gap-3 pointer-events-auto">
                            {isEditing ? (
                                <div className="flex gap-2">
                                    <button onClick={handleSave} className="btn-primary !py-2 !px-4 text-sm !text-black">Opslaan</button>
                                    <button onClick={handleCancel} className="btn-secondary !py-2 !px-4 text-sm">Annuleren</button>
                                </div>
                            ) : (
                                <>
                                    <button onClick={() => setIsEditing(true)} className="btn-secondary !p-0 !w-11 !h-11 !rounded-full flex items-center justify-center">
                                        <Edit size={20} />
                                    </button>
                                    {/* Image edit: URL recipes get image selector, photo recipes get file upload */}
                                    {recipe.source_url && !recipe.source_url.includes('/storage/v1/') ? (
                                        <button
                                            onClick={handleImageEdit}
                                            disabled={isImageLoading}
                                            className="btn-secondary !p-0 !w-11 !h-11 !rounded-full flex items-center justify-center"
                                        >
                                            {isImageLoading ? <Loader2 size={20} className="animate-spin" /> : <Image size={20} />}
                                        </button>
                                    ) : (
                                        <label className="btn-secondary !p-0 !w-11 !h-11 !rounded-full flex items-center justify-center cursor-pointer">
                                            <Camera size={20} />
                                            <input type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file && onImageUpdate) onImageUpdate(file); }} />
                                        </label>
                                    )}
                                    <button onClick={() => setShowDeleteModal(true)} className="btn-secondary !p-0 !w-11 !h-11 !rounded-full flex items-center justify-center !bg-red-500/10 !text-red-500 !border-red-500/20 hover:!bg-red-500/20 transition-all">
                                        <Trash2 size={20} />
                                    </button>
                                </>
                            )}
                            {!isEditing && (
                                <>
                                    <div className="w-px h-6 bg-white/10 mx-1" />
                                    <button
                                        onClick={() => setShowPlanModal(true)}
                                        className="btn-secondary !p-0 !w-11 !h-11 !rounded-full flex items-center justify-center text-white/70 hover:text-white"
                                        title="Inplannen"
                                    >
                                        <CalendarIcon size={20} /> {/* Renamed Calendar to CalendarIcon in imports if conflict, wait Calendar is imported as Calendar */}
                                    </button>
                                    <button
                                        onClick={handleToggleFavorite}
                                        className={`btn-secondary !p-0 !w-11 !h-11 !rounded-full flex items-center justify-center transition-colors ${isFavorite ? 'text-red-500 bg-red-500/10 border-red-500/20' : 'text-white/70 hover:text-red-500'}`}
                                        title={isFavorite ? 'Verwijder uit favorieten' : 'Zet in favorieten'}
                                    >
                                        <Heart size={20} className={isFavorite ? 'fill-current' : ''} />
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </header>

                {/* Header Content */}
                <div className="absolute bottom-0 left-0 right-0 z-10 flex flex-col justify-end pb-12">
                    <div className="max-w-[1600px] mx-auto px-4 lg:px-20 w-full">
                        {isEditing ? (
                            <div className="bg-black/60 backdrop-blur-xl rounded-2xl p-6 border border-white/10 space-y-4 max-w-2xl">
                                <input
                                    className="w-full text-3xl font-bold bg-transparent border-b border-white/20 focus:border-primary focus:outline-none p-2 text-white placeholder:text-white/30"
                                    value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                                    placeholder="Recept Titel"
                                />
                                <div className="flex gap-4">
                                    <input className="bg-transparent border-b border-white/20 p-2 text-white/80 w-full" value={editForm.cuisine} onChange={e => setEditForm({ ...editForm, cuisine: e.target.value })} placeholder="Keuken" />
                                    <input className="bg-transparent border-b border-white/20 p-2 text-white/80 w-full" value={editForm.difficulty} onChange={e => setEditForm({ ...editForm, difficulty: e.target.value })} placeholder="Moeilijkheid" />
                                </div>
                            </div>
                        ) : (
                            <div className="max-w-4xl space-y-4">
                                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="flex flex-wrap items-center gap-3">
                                    {recipe.cuisine && <span className="px-3 py-1 bg-white/10 backdrop-blur-md text-white/90 text-[10px] font-bold uppercase tracking-widest rounded-md border border-white/10">{recipe.cuisine}</span>}
                                    {recipe.difficulty && <span className="px-3 py-1 bg-white/5 backdrop-blur-md text-white/70 text-[10px] font-bold uppercase tracking-widest rounded-md border border-white/5">{recipe.difficulty}</span>}
                                    {/* Source Language Badge */}
                                    <span className="flex items-center gap-1 px-3 py-1 bg-black/40 backdrop-blur-md text-white/60 text-[10px] font-bold uppercase tracking-widest rounded-md border border-white/5">
                                        <Globe size={10} />
                                        {sourceLangName}
                                    </span>
                                </motion.div>

                                <motion.h1
                                    layoutId={`title-${recipe.id}`}
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.1, duration: 0.5 }}
                                    className="text-6xl md:text-8xl lg:text-9xl font-black text-white leading-[0.85] drop-shadow-2xl font-display"
                                >
                                    {recipe.title}
                                </motion.h1>

                                {recipe.author_profile && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.2 }}
                                        className="flex items-center gap-3 mt-4 mb-2"
                                    >
                                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full overflow-hidden border border-white/20 bg-white/10 shadow-lg">
                                            {recipe.author_profile.avatar_url ? (
                                                <img
                                                    src={recipe.author_profile.avatar_url}
                                                    alt=""
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white/50">
                                                    {recipe.author_profile.first_name?.[0]}{recipe.author_profile.last_name?.[0]}
                                                </div>
                                            )}
                                        </div>
                                        <span className="text-white/90 font-bold text-lg md:text-xl drop-shadow-md">
                                            {recipe.author_profile.first_name} {recipe.author_profile.last_name}
                                        </span>
                                    </motion.div>
                                )}

                                <div className="mb-4"></div>

                                {/* Description */}
                                {recipe.description && (
                                    <motion.p
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.4 }}
                                        className="text-lg md:text-xl text-gray-200 line-clamp-3 max-w-2xl leading-relaxed drop-shadow-md"
                                    >
                                        {recipe.description}
                                    </motion.p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="max-w-[1600px] mx-auto px-4 lg:px-20 mt-12 relative z-20">

                {/* Introduction/Story Section */}
                {recipe.introduction && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="mb-12 max-w-3xl mx-auto"
                    >
                        <div className="relative bg-zinc-900/60 backdrop-blur-md rounded-[var(--radius)] p-8 border-l-4 border-primary/50">
                            <div className="absolute top-4 left-4 text-primary/30 text-5xl font-serif">"</div>
                            <p className="text-lg md:text-xl text-gray-300 leading-relaxed italic pl-8 pr-4">
                                {recipe.introduction}
                            </p>
                            <div className="absolute bottom-4 right-6 text-primary/30 text-5xl font-serif">"</div>
                        </div>
                    </motion.div>
                )}

                <div className="grid lg:grid-cols-[400px_1fr] gap-12 lg:gap-24">

                    {/* Left Column: Stats & Ingredients */}
                    <div className="space-y-6">
                        {/* Stats Card */}
                        <div className="bg-zinc-900/80 backdrop-blur-md rounded-[var(--radius)] p-6 shadow-xl transition-all">
                            <div
                                className="flex items-center justify-between cursor-pointer group/stat"
                                onClick={() => toggleSection('about')}
                            >
                                <h3 className="text-xl font-bold text-white flex items-center gap-3">
                                    <ChefHat size={18} className="text-muted-foreground" />
                                    {t.aboutRecipe || "Over dit recept"}
                                </h3>
                                <motion.div animate={{ rotate: expandedSections.about ? 0 : -90 }} className="text-muted-foreground group-hover/stat:text-white transition-colors">
                                    <ChevronDown size={20} />
                                </motion.div>
                            </div>

                            <AnimatePresence>
                                {expandedSections.about && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.3, ease: "easeInOut" }}
                                        className="overflow-hidden"
                                    >
                                        <div className="pt-6 space-y-6">
                                            <div className="space-y-4">
                                                {/* Total Time Display */}
                                                {(() => {
                                                    const parseTimeToMinutes = (timeStr) => {
                                                        if (!timeStr) return 0;
                                                        const lower = String(timeStr).toLowerCase();
                                                        let total = 0;
                                                        const hourMatch = lower.match(/(\d+)\s*(?:h|uur|hour|u)/);
                                                        if (hourMatch) total += parseInt(hourMatch[1]) * 60;
                                                        const minuteMatch = lower.match(/(\d+)\s*(?:m|min|minuten)/);
                                                        if (minuteMatch) total += parseInt(minuteMatch[1]);
                                                        if (total === 0 && !isNaN(parseInt(lower))) total = parseInt(lower);
                                                        return total;
                                                    };

                                                    const formatMinutes = (minutes) => {
                                                        if (!minutes) return '-';
                                                        if (minutes < 60) return `${minutes} min`;
                                                        const h = Math.floor(minutes / 60);
                                                        const m = minutes % 60;
                                                        return m === 0 ? `${h} u` : `${h} u ${m} min`;
                                                    };

                                                    const prepMin = parseTimeToMinutes(recipe.prep_time);
                                                    const cookMin = parseTimeToMinutes(recipe.cook_time);
                                                    const totalMin = prepMin + cookMin;

                                                    return (
                                                        <div className="bg-white/[0.03] rounded-2xl p-6 border border-white/5 space-y-4">
                                                            <div className="space-y-1">
                                                                <div className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                                                                    <Clock size={14} className="text-muted-foreground/50" />
                                                                    Totale tijd
                                                                </div>
                                                                <div className="text-white font-black text-3xl">
                                                                    {totalMin > 0 ? formatMinutes(totalMin) : (recipe.prep_time || recipe.cook_time || '-')}
                                                                </div>
                                                            </div>

                                                            {(prepMin > 0 || cookMin > 0 || recipe.passive_time) && (
                                                                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                                                                    <div className="space-y-1">
                                                                        <div className="text-white/40 text-[10px] font-bold uppercase tracking-widest">{t.prepTime}</div>
                                                                        <div className="text-white font-bold">{recipe.prep_time || '-'}</div>
                                                                    </div>
                                                                    <div className="space-y-1">
                                                                        <div className="text-white/40 text-[10px] font-bold uppercase tracking-widest">{t.cookTime}</div>
                                                                        <div className="text-white font-bold">{recipe.cook_time || '-'}</div>
                                                                    </div>
                                                                    {recipe.passive_time && (
                                                                        <div className="space-y-1 col-span-2">
                                                                            <div className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Wachttijd</div>
                                                                            <div className="text-white font-bold">{recipe.passive_time}</div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                            </div>

                                            {/* Servings Adjustment Row - Matches Ingredient List Style */}
                                            <div className="flex items-center justify-between py-2">
                                                <span className="text-gray-200 font-medium">{t.servings}</span>
                                                <div className="flex items-center bg-white/5 rounded-full border border-white/10 shadow-inner overflow-hidden">
                                                    <button
                                                        onClick={() => setCurrentServings(Math.max(1, currentServings - 1))}
                                                        className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-white hover:bg-white/5 transition-all active:scale-90"
                                                        aria-label="Minder porties"
                                                    >
                                                        <Minus size={14} />
                                                    </button>
                                                    <span className="text-white font-black text-sm min-w-[1.5rem] text-center">{currentServings}</span>
                                                    <button
                                                        onClick={() => setCurrentServings(currentServings + 1)}
                                                        className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-white hover:bg-white/5 transition-all active:scale-90"
                                                        aria-label="Meer porties"
                                                    >
                                                        <Plus size={14} />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Source Info - Dynamic for Website vs Photo */}
                                            {(recipe.source_url || recipe.original_image_url || recipe.author || recipe.cookbook_name) && (
                                                <div className="pt-4 border-t border-white/5">
                                                    <span className="text-[10px] text-white/40 uppercase font-bold tracking-wider block mb-2">{t.source || "Bron"}</span>
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex flex-col">
                                                            <span className="text-white font-medium text-sm">
                                                                {recipe.author || recipe.cookbook_name || (recipe.original_image_url ? "Foto" : "Website URL")}
                                                            </span>
                                                        </div>

                                                        {recipe.original_image_url ? (
                                                            <button
                                                                onClick={() => setShowSourceModal(true)}
                                                                className="flex items-center gap-2 text-white/60 text-xs font-bold hover:text-primary hover:bg-primary/10 px-3 py-1.5 rounded-full transition-colors border border-white/10"
                                                            >
                                                                Open foto <Image size={12} />
                                                            </button>
                                                        ) : recipe.source_url && (
                                                            <a
                                                                href={recipe.source_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="flex items-center gap-2 text-white/60 text-xs font-bold hover:text-primary hover:bg-primary/10 px-3 py-1.5 rounded-full transition-colors border border-white/10"
                                                            >
                                                                Open <ExternalLink size={12} />
                                                            </a>
                                                        )}
                                                    </div>

                                                    {/* Unified AI Improvement Button - Moved here under source details */}
                                                    <div className="mt-4">
                                                        <button
                                                            onClick={handleAIImprovement}
                                                            disabled={isAIProcessing}
                                                            className="w-full h-12 flex items-center justify-center gap-3 bg-primary/10 hover:bg-primary/20 text-primary font-bold px-6 rounded-xl border border-primary/20 transition-all group/ai disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            {isAIProcessing ? (
                                                                <>
                                                                    <Loader2 size={18} className="animate-spin text-primary" />
                                                                    <span className="text-sm">Aan het analyseren...</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Sparkles size={18} className="group-hover/ai:scale-110 transition-transform text-primary" />
                                                                    <span className="text-sm">
                                                                        {(recipe.ingredients && recipe.ingredients.length > 0)
                                                                            ? ((!!recipe.original_image_url || recipe.source_type === 'image') ? "Analyseer foto opnieuw" : "Analyseer website opnieuw")
                                                                            : "Start AI Analyse"}
                                                                    </span>
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                            {/* AI Tags - Consolidated here */}
                                            {recipe.ai_tags && recipe.ai_tags.length > 0 && !isEditing && (
                                                <div className="pt-4 border-t border-white/5">
                                                    <div className="flex flex-wrap gap-2">
                                                        {recipe.ai_tags
                                                            .filter(tag => tag !== '🤖 grok-reviewed')
                                                            .map((tag, idx) => (
                                                                <span key={idx} className="px-3 py-1.5 bg-white/[0.03] text-white/70 text-[10px] font-semibold rounded-lg hover:bg-primary/20 hover:text-primary transition-all cursor-default border border-white/10">
                                                                    {tag}
                                                                </span>
                                                            ))}
                                                    </div>
                                                </div>
                                            )}


                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Ingredients Card */}
                        <div className="bg-zinc-900/80 backdrop-blur-md rounded-[var(--radius)] p-6 shadow-xl transition-all">
                            <div
                                className="flex items-center justify-between cursor-pointer group/stat"
                                onClick={() => toggleSection('ingredients')}
                            >
                                <h3 className="text-xl font-bold text-white flex items-center gap-3">
                                    <Utensils size={18} className="text-muted-foreground" />
                                    {t.ingredients}
                                </h3>
                                <motion.div animate={{ rotate: expandedSections.ingredients ? 0 : -90 }} className="text-muted-foreground group-hover/stat:text-white transition-colors">
                                    <ChevronDown size={20} />
                                </motion.div>
                            </div>

                            <AnimatePresence>
                                {expandedSections.ingredients && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.3, ease: "easeInOut" }}
                                        className="overflow-hidden"
                                    >
                                        <div className="space-y-6 pt-6">
                                            {/* Check if we have grouped ingredients */}
                                            {recipe.ingredientsByGroup && Object.keys(recipe.ingredientsByGroup).length > 0 ? (
                                                // Render grouped ingredients
                                                Object.entries(recipe.ingredientsByGroup).map(([groupName, groupIngredients]) => (
                                                    <div key={groupName} className="space-y-3">
                                                        {/* Group header - only show if not 'default' */}
                                                        {groupName !== 'default' && (
                                                            <h4 className="text-xs uppercase tracking-widest text-primary/80 font-black border-b border-primary/20 pb-2 mb-3">
                                                                {groupName}
                                                            </h4>
                                                        )}
                                                        <ul className="space-y-2">
                                                            {groupIngredients.map((ingredient, idx) => {
                                                                let amount = ingredient.amount;
                                                                if (typeof amount === 'number') amount = Math.round(amount * scaleFactor * 100) / 100;
                                                                return (
                                                                    <li key={idx} className="grid grid-cols-[1fr_auto] gap-4 py-2 border-b border-white/5 last:border-0 hover:border-white/10 transition-colors items-baseline">
                                                                        <span className="text-gray-200 font-medium">{ingredient.name}</span>
                                                                        <span className="text-right whitespace-nowrap">
                                                                            <span className="font-bold text-white">{amount || ''}</span>
                                                                            {ingredient.unit && <span className="text-white/40 ml-1 text-xs uppercase tracking-wider font-bold">{ingredient.unit}</span>}
                                                                        </span>
                                                                    </li>
                                                                );
                                                            })}
                                                        </ul>
                                                    </div>
                                                ))
                                            ) : (
                                                // Fallback: render flat ingredient list
                                                <ul className="space-y-3">
                                                    {Array.isArray(recipe.ingredients) && recipe.ingredients.map((ingredient, idx) => {
                                                        let content = { amount: '', unit: '', name: '' };
                                                        if (typeof ingredient === 'object' && ingredient !== null && ('item' in ingredient || 'name' in ingredient)) {
                                                            let amount = ingredient.amount;
                                                            if (typeof amount === 'number') amount = Math.round(amount * scaleFactor * 100) / 100;
                                                            content = {
                                                                amount: amount || '',
                                                                unit: ingredient.unit || '',
                                                                name: ingredient.name || ingredient.item || ''
                                                            };
                                                        } else {
                                                            const str = String(ingredient);
                                                            const regex = /^(\d+(?:\.\d+)?|\d+\/\d+|\d+\s+\d+\/\d+)\s*([a-zA-Z]+)?\s+(.*)/;
                                                            const match = str.match(regex);
                                                            if (match) {
                                                                let amountStr = match[1];
                                                                let amount = 0;
                                                                if (amountStr.includes(' ')) {
                                                                    const parts = amountStr.split(' ');
                                                                    amount = parseFloat(parts[0]) + (parts[1].includes('/') ? eval(parts[1]) : parseFloat(parts[1]));
                                                                } else if (amountStr.includes('/')) {
                                                                    amount = eval(amountStr);
                                                                } else amount = parseFloat(amountStr);
                                                                content = { amount: Math.round(amount * scaleFactor * 100) / 100, unit: match[2] || '', name: match[3] || '' };
                                                            } else {
                                                                content = { name: str, amount: '', unit: '' };
                                                            }
                                                        }
                                                        return (
                                                            <li key={idx} className="grid grid-cols-[1fr_auto] gap-4 py-2 border-b border-white/5 last:border-0 hover:border-white/10 transition-colors items-baseline">
                                                                <span className="text-gray-200 font-medium">{content.name}</span>
                                                                <span className="text-right whitespace-nowrap">
                                                                    <span className="font-bold text-white">{content.amount}</span>
                                                                    {content.unit && <span className="text-white/40 ml-1 text-xs uppercase tracking-wider font-bold">{content.unit}</span>}
                                                                </span>
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>



                        {/* Extraction History Section */}
                        {recipe.extraction_history && !isEditing && (
                            <div className="bg-zinc-900/80 backdrop-blur-md rounded-[var(--radius)] p-6 shadow-xl transition-all">
                                <div
                                    className="flex items-center justify-between cursor-pointer group/stat"
                                    onClick={() => toggleSection('history')}
                                >
                                    <h3 className="text-xl font-bold text-white flex items-center gap-3">
                                        <Info size={14} className="text-muted-foreground/50" />
                                        Source & Analysis
                                    </h3>
                                    <motion.div animate={{ rotate: expandedSections.history ? 0 : -90 }} className="text-muted-foreground group-hover/stat:text-white transition-colors">
                                        <ChevronDown size={20} />
                                    </motion.div>
                                </div>

                                <AnimatePresence>
                                    {expandedSections.history && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.3, ease: "easeInOut" }}
                                            className="overflow-hidden"
                                        >
                                            <div className="pt-6 space-y-4">
                                                {/* Method Pills */}
                                                <div className="flex flex-wrap gap-2">
                                                    {recipe.extraction_history.schema_used && (
                                                        <span className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-lg border border-emerald-500/30">
                                                            📊 Schema.org
                                                        </span>
                                                    )}
                                                    {recipe.extraction_history.ai_used && (
                                                        <span className="px-3 py-1.5 bg-purple-500/20 text-purple-400 text-xs font-bold rounded-lg border border-purple-500/30">
                                                            🤖 {recipe.extraction_history.ai_model || 'AI'}
                                                        </span>
                                                    )}
                                                    <span className="px-3 py-1.5 bg-white/5 text-white/50 text-xs font-medium rounded-lg border border-white/10">
                                                        {recipe.extraction_history.source_type === 'url' ? '🔗 URL' : '📷 Image'}
                                                    </span>
                                                </div>

                                                {/* Stats Grid */}
                                                {recipe.extraction_history.ai_used && recipe.extraction_history.tokens && (
                                                    <div className="grid grid-cols-3 gap-3">
                                                        <div className="bg-white/[0.03] rounded-xl p-3 border border-white/5">
                                                            <div className="text-[10px] text-white/40 uppercase font-bold tracking-wider">Tokens</div>
                                                            <div className="text-white font-bold">{recipe.extraction_history.tokens.total?.toLocaleString()}</div>
                                                        </div>
                                                        <div className="bg-white/[0.03] rounded-xl p-3 border border-white/5">
                                                            <div className="text-[10px] text-white/40 uppercase font-bold tracking-wider">Cost</div>
                                                            <div className="text-white font-bold">€{recipe.extraction_history.estimated_cost_eur?.toFixed(4)}</div>
                                                        </div>
                                                        <div className="bg-white/[0.03] rounded-xl p-3 border border-white/5">
                                                            <div className="text-[10px] text-white/40 uppercase font-bold tracking-wider">Time</div>
                                                            <div className="text-white font-bold">{(recipe.extraction_history.processing_time_ms / 1000).toFixed(1)}s</div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Processing Time (for schema-only) */}
                                                {!recipe.extraction_history.ai_used && recipe.extraction_history.processing_time_ms && (
                                                    <div className="bg-white/[0.03] rounded-xl p-3 border border-white/5 inline-block">
                                                        <div className="text-[10px] text-white/40 uppercase font-bold tracking-wider">Processing Time</div>
                                                        <div className="text-white font-bold">{recipe.extraction_history.processing_time_ms}ms</div>
                                                    </div>
                                                )}

                                                {/* Notes */}
                                                {recipe.extraction_history.notes && recipe.extraction_history.notes.length > 0 && (
                                                    <div className="pt-2 border-t border-white/5">
                                                        <div className="text-[10px] text-white/40 uppercase font-bold tracking-wider mb-2">Analysis Notes</div>
                                                        <ul className="space-y-1">
                                                            {recipe.extraction_history.notes.map((note, idx) => (
                                                                <li key={idx} className="text-white/60 text-xs flex items-start gap-2">
                                                                    <span className="text-white/20">•</span>
                                                                    {note}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}

                                                {/* Timestamp */}
                                                <div className="text-[10px] text-white/30 pt-2">
                                                    Extracted: {new Date(recipe.extraction_history.timestamp).toLocaleString('nl-NL')}
                                                </div>

                                                {/* Review History Display */}
                                                {recipe.extraction_history.reviews && recipe.extraction_history.reviews.length > 0 && (
                                                    <div className="pt-3 mt-3 border-t border-purple-500/20">
                                                        <div className="text-[10px] text-purple-400/70 uppercase font-bold tracking-wider mb-2">Grok Reviews</div>
                                                        {recipe.extraction_history.reviews.map((review, idx) => (
                                                            <div key={idx} className="bg-purple-500/10 rounded-lg p-3 mb-2 border border-purple-500/20">
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <span className="text-[10px] text-purple-300">
                                                                        {new Date(review.timestamp).toLocaleString('nl-NL')}
                                                                    </span>
                                                                    <span className="text-[10px] text-purple-400/60">
                                                                        {review.tokens_used} tokens • €{review.cost?.toFixed(4)}
                                                                    </span>
                                                                </div>
                                                                {review.changes && review.changes.length > 0 && (
                                                                    <ul className="space-y-1">
                                                                        {review.changes.map((change, cIdx) => (
                                                                            <li key={cIdx} className="text-xs text-purple-200/80 flex items-start gap-2">
                                                                                <span className="text-purple-400">✓</span>
                                                                                {change}
                                                                            </li>
                                                                        ))}
                                                                    </ul>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}


                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>

                    {/* Right Column: Instructions */}
                    <div className="space-y-12">
                        {isEditing && (
                            <div className="glass-panel rounded-[var(--radius)] p-6">
                                <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                                    <Edit size={18} className="text-primary" />
                                    Beschrijving
                                </h3>
                                <textarea
                                    className="input-standard h-32"
                                    value={editForm.description}
                                    onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                                    placeholder="Korte beschrijving van het gerecht..."
                                />
                            </div>
                        )}

                        <div className="space-y-8">
                            <h3 className="text-3xl font-black text-white mb-8 inline-block pr-12 relative">
                                {t.instructions}
                                <div className="absolute -bottom-2 left-0 w-12 h-0.5 bg-primary/50 rounded-full" />
                            </h3>
                            <div className="space-y-10 relative">
                                <div className="absolute left-[19px] top-4 bottom-4 w-[1px] bg-white/5" />

                                {Array.isArray(recipe.instructions) && recipe.instructions.map((step, idx) => {
                                    // Support both old format (string) and new format (object with description)
                                    const stepText = typeof step === 'object' && step.description
                                        ? step.description
                                        : String(step);
                                    const stepNumber = typeof step === 'object' && step.step_number
                                        ? step.step_number
                                        : idx + 1;
                                    return (
                                        <div key={idx} className="group relative pl-12">
                                            <div className="absolute left-0 top-0 w-10 h-10 rounded-full bg-background border border-white/10 flex items-center justify-center text-sm font-bold text-muted-foreground group-hover:border-primary/40 group-hover:text-white transition-all z-10">
                                                {stepNumber}
                                            </div>
                                            <div className="pt-1">
                                                <p className="text-xl text-gray-200 leading-relaxed font-medium group-hover:text-white transition-colors">{stepText}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Raw OCR Section - Only for non-photo recipes */}
                            {recipe.extraction_history?.raw_ocr && !recipe.original_image_url && recipe.source_type !== 'image' && (
                                <div className="mt-20 pt-16 border-t border-white/5">
                                    <div className="flex items-center gap-3 mb-8">
                                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary/60">
                                            <FileText size={20} />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-bold text-white leading-none mb-1">Originele Transcriptie</h3>
                                            <p className="text-xs text-white/30 uppercase tracking-widest font-bold">Volledige OCR door Grok 4</p>
                                        </div>
                                    </div>
                                    <div className="bg-zinc-900/80 backdrop-blur-md rounded-2xl p-8 shadow-2xl relative overflow-hidden group/ocr">
                                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover/ocr:opacity-30 transition-opacity">
                                            <FileText size={120} />
                                        </div>
                                        <div className="relative font-mono text-sm text-gray-400 leading-relaxed whitespace-pre-wrap max-h-[600px] overflow-y-auto custom-scrollbar">
                                            {recipe.extraction_history.raw_ocr}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Reasoning Section - Only for non-photo recipes */}
                            {recipe.extraction_history?.reasoning && !recipe.original_image_url && recipe.source_type !== 'image' && (
                                <div className="mt-12 pt-12 border-t border-white/5">
                                    <div className="flex items-center gap-3 mb-8">
                                        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                                            <Info size={20} />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-bold text-white leading-none mb-1">AI Analyse & Redenering</h3>
                                            <p className="text-xs text-white/30 uppercase tracking-widest font-bold">Logische stappen door Grok 4.1</p>
                                        </div>
                                    </div>
                                    <div className="bg-zinc-900/80 backdrop-blur-md rounded-2xl p-8 border border-primary/10 shadow-lg relative overflow-hidden group/reasoning">
                                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover/reasoning:opacity-10 transition-opacity">
                                            <Info size={120} />
                                        </div>
                                        <div className="relative text-lg text-gray-300 leading-relaxed italic">
                                            <div className="absolute left-0 top-0 text-primary/40 text-4xl font-serif">"</div>
                                            <div className="pl-6 pt-2">
                                                {recipe.extraction_history.reasoning}
                                            </div>
                                            <div className="flex justify-end mt-2 text-primary/40 text-4xl font-serif">"</div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Source Photo Modal */}
            <AnimatePresence>
                {showSourceModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-12">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowSourceModal(false)}
                            className="absolute inset-0 bg-black/95 backdrop-blur-2xl"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full h-full max-w-5xl bg-zinc-900/50 rounded-3xl overflow-hidden border border-white/10 shadow-2xl flex flex-col pt-safe"
                        >
                            {/* Modal Header */}
                            <div className="flex items-center justify-between p-6 border-b border-white/5 bg-black/20 backdrop-blur-md">
                                <div className="space-y-1">
                                    <h2 className="text-xl font-black text-white flex items-center gap-3">
                                        <Image size={24} className="text-primary" />
                                        Originele Bronfoto
                                    </h2>
                                    <p className="text-xs text-white/40 font-bold uppercase tracking-widest">Gescand op {new Date(recipe.created_at).toLocaleDateString()}</p>
                                </div>
                                <button
                                    onClick={() => setShowSourceModal(false)}
                                    className="p-3 rounded-full bg-white/5 hover:bg-white/10 text-white transition-colors border border-white/10"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Image Container */}
                            <div className="flex-1 overflow-auto p-4 md:p-8 flex items-center justify-center bg-black/40">
                                <img
                                    src={recipe.original_image_url}
                                    alt="Bron Recept"
                                    className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
                                />
                            </div>

                            {/* Modal Footer */}
                            <div className="p-6 border-t border-white/5 bg-black/20 backdrop-blur-md flex justify-center">
                                <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.2em] italic">AI Analyse Bronmateriaal</p>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {showDeleteModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowDeleteModal(false)}
                            className="absolute inset-0 bg-black/90 backdrop-blur-xl"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-md bg-zinc-900/95 backdrop-blur-2xl rounded-3xl overflow-hidden border border-white/10 shadow-2xl"
                        >
                            {/* Modal Header */}
                            <div className="p-6 pb-4 text-center">
                                <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mx-auto mb-4">
                                    <Trash2 size={32} />
                                </div>
                                <h2 className="text-xl font-black text-white mb-2">Recept verwijderen?</h2>
                                <p className="text-white/50 text-sm">
                                    Weet je zeker dat je <span className="text-white font-medium">"{recipe.title}"</span> wilt verwijderen? Dit kan niet ongedaan worden gemaakt.
                                </p>
                            </div>

                            {/* Modal Actions */}
                            <div className="p-6 pt-2 flex flex-col gap-3">
                                <button
                                    onClick={() => {
                                        setShowDeleteModal(false);
                                        onDelete();
                                    }}
                                    className="w-full h-12 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-all"
                                >
                                    <Trash2 size={18} />
                                    Ja, verwijder dit recept
                                </button>
                                <button
                                    onClick={() => setShowDeleteModal(false)}
                                    className="w-full h-12 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white/70 font-bold rounded-xl border border-white/10 transition-all"
                                >
                                    Annuleren
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* AI Review Modal */}
            <AnimatePresence>
                {showReviewModal && pendingRecipe && (
                    <RecipeReviewModal
                        original={recipe}
                        enriched={pendingRecipe}
                        onConfirm={handleConfirmReview}
                        onCancel={handleCancelReview}
                    />
                )}
            </AnimatePresence>

            {/* Image Select Modal (standalone) */}
            <AnimatePresence>
                {showImageModal && extractedImages.length > 0 && (
                    <ImageSelectModal
                        images={extractedImages}
                        onSelect={handleImageSelect}
                        onCancel={() => { setShowImageModal(false); setExtractedImages([]); }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
