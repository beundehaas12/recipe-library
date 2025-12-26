'use client';

import { useState } from 'react';
import { FileEdit, Save, BookOpen, Sparkles, Users, ChefHat, Loader2, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { SiteContent } from '@/types/database';

interface ContentEditorProps {
    initialContent: Record<string, SiteContent>;
}

interface Feature {
    icon: string;
    heading: string;
    description: string;
}

interface AboutContent {
    features: Feature[];
}

interface AuthorContent {
    benefits: string[];
    closingText: string;
}

const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
    BookOpen,
    Sparkles,
    Users,
    ChefHat,
};

export default function ContentEditor({ initialContent }: ContentEditorProps) {
    const supabase = createClient();

    // About content state
    const aboutData = initialContent.login_about;
    const [aboutTitle, setAboutTitle] = useState(aboutData?.title || 'Over Forkify');
    const [aboutSubtitle, setAboutSubtitle] = useState(aboutData?.subtitle || '');
    const [aboutFeatures, setAboutFeatures] = useState<Feature[]>(
        (aboutData?.content as unknown as AboutContent | undefined)?.features || [
            { icon: 'BookOpen', heading: '', description: '' },
            { icon: 'Sparkles', heading: '', description: '' },
            { icon: 'Users', heading: '', description: '' },
        ]
    );

    // Author content state
    const authorData = initialContent.login_author;
    const [authorTitle, setAuthorTitle] = useState(authorData?.title || 'Word Auteur');
    const [authorSubtitle, setAuthorSubtitle] = useState(authorData?.subtitle || '');
    const [authorBenefits, setAuthorBenefits] = useState<string[]>(
        (authorData?.content as unknown as AuthorContent | undefined)?.benefits || ['', '', '', '']
    );
    const [authorClosingText, setAuthorClosingText] = useState(
        (authorData?.content as unknown as AuthorContent | undefined)?.closingText || ''
    );

    // UI state
    const [saving, setSaving] = useState<string | null>(null);
    const [saved, setSaved] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleSaveAbout = async () => {
        setSaving('about');
        setError(null);

        const content: AboutContent = { features: aboutFeatures };

        const { error: err } = await supabase
            .from('site_content')
            .upsert({
                key: 'login_about',
                title: aboutTitle,
                subtitle: aboutSubtitle,
                content,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'key' });

        setSaving(null);
        if (err) {
            setError(err.message);
        } else {
            setSaved('about');
            setTimeout(() => setSaved(null), 2000);
        }
    };

    const handleSaveAuthor = async () => {
        setSaving('author');
        setError(null);

        const content: AuthorContent = {
            benefits: authorBenefits,
            closingText: authorClosingText,
        };

        const { error: err } = await supabase
            .from('site_content')
            .upsert({
                key: 'login_author',
                title: authorTitle,
                subtitle: authorSubtitle,
                content,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'key' });

        setSaving(null);
        if (err) {
            setError(err.message);
        } else {
            setSaved('author');
            setTimeout(() => setSaved(null), 2000);
        }
    };

    const updateFeature = (index: number, field: keyof Feature, value: string) => {
        const newFeatures = [...aboutFeatures];
        newFeatures[index] = { ...newFeatures[index], [field]: value };
        setAboutFeatures(newFeatures);
    };

    const updateBenefit = (index: number, value: string) => {
        const newBenefits = [...authorBenefits];
        newBenefits[index] = value;
        setAuthorBenefits(newBenefits);
    };

    const SaveButton = ({ onClick, section }: { onClick: () => void; section: string }) => (
        <button
            onClick={onClick}
            disabled={saving === section}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-xl text-sm font-medium 
                       hover:bg-zinc-800 transition-all disabled:opacity-50"
        >
            {saving === section ? (
                <Loader2 size={16} className="animate-spin" />
            ) : saved === section ? (
                <Check size={16} className="text-green-400" />
            ) : (
                <Save size={16} />
            )}
            {saving === section ? 'Opslaan...' : saved === section ? 'Opgeslagen!' : 'Opslaan'}
        </button>
    );

    return (
        <>
            {/* Title Section */}
            <div className="mb-8">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-zinc-900 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-zinc-200">
                        <FileEdit size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-zinc-900">Content Beheer</h1>
                        <p className="text-zinc-500 text-sm">Bewerk de inhoud van de inlogpagina.</p>
                    </div>
                </div>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* About Section */}
                <div className="bg-white rounded-2xl p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-zinc-100/50">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-zinc-900">Over Tab</h2>
                        <SaveButton onClick={handleSaveAbout} section="about" />
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1 block">
                                Titel
                            </label>
                            <input
                                type="text"
                                value={aboutTitle}
                                onChange={(e) => setAboutTitle(e.target.value)}
                                className="w-full h-12 px-4 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 
                                           focus:outline-none focus:ring-2 focus:ring-zinc-200 transition-all"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1 block">
                                Subtitel
                            </label>
                            <input
                                type="text"
                                value={aboutSubtitle}
                                onChange={(e) => setAboutSubtitle(e.target.value)}
                                className="w-full h-12 px-4 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 
                                           focus:outline-none focus:ring-2 focus:ring-zinc-200 transition-all"
                            />
                        </div>

                        <div className="pt-4 border-t border-zinc-100">
                            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3 block">
                                Features
                            </label>
                            <div className="space-y-4">
                                {aboutFeatures.map((feature, idx) => {
                                    const IconComponent = iconMap[feature.icon] || BookOpen;
                                    return (
                                        <div key={idx} className="p-4 bg-zinc-50 rounded-xl space-y-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                                                    <IconComponent size={20} className="text-primary" />
                                                </div>
                                                <select
                                                    value={feature.icon}
                                                    onChange={(e) => updateFeature(idx, 'icon', e.target.value)}
                                                    className="h-10 px-3 bg-white border border-zinc-200 rounded-lg text-sm"
                                                >
                                                    <option value="BookOpen">BookOpen</option>
                                                    <option value="Sparkles">Sparkles</option>
                                                    <option value="Users">Users</option>
                                                    <option value="ChefHat">ChefHat</option>
                                                </select>
                                            </div>
                                            <input
                                                type="text"
                                                placeholder="Heading"
                                                value={feature.heading}
                                                onChange={(e) => updateFeature(idx, 'heading', e.target.value)}
                                                className="w-full h-10 px-3 bg-white border border-zinc-200 rounded-lg text-sm 
                                                           focus:outline-none focus:ring-2 focus:ring-zinc-200"
                                            />
                                            <textarea
                                                placeholder="Description"
                                                value={feature.description}
                                                onChange={(e) => updateFeature(idx, 'description', e.target.value)}
                                                rows={2}
                                                className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm resize-none
                                                           focus:outline-none focus:ring-2 focus:ring-zinc-200"
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Author Section */}
                <div className="bg-white rounded-2xl p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-zinc-100/50">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-zinc-900">Word Auteur Tab</h2>
                        <SaveButton onClick={handleSaveAuthor} section="author" />
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1 block">
                                Titel
                            </label>
                            <input
                                type="text"
                                value={authorTitle}
                                onChange={(e) => setAuthorTitle(e.target.value)}
                                className="w-full h-12 px-4 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 
                                           focus:outline-none focus:ring-2 focus:ring-zinc-200 transition-all"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1 block">
                                Subtitel
                            </label>
                            <input
                                type="text"
                                value={authorSubtitle}
                                onChange={(e) => setAuthorSubtitle(e.target.value)}
                                className="w-full h-12 px-4 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 
                                           focus:outline-none focus:ring-2 focus:ring-zinc-200 transition-all"
                            />
                        </div>

                        <div className="pt-4 border-t border-zinc-100">
                            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3 block">
                                Voordelen (bullet points)
                            </label>
                            <div className="space-y-2">
                                {authorBenefits.map((benefit, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                                        <input
                                            type="text"
                                            value={benefit}
                                            onChange={(e) => updateBenefit(idx, e.target.value)}
                                            placeholder={`Voordeel ${idx + 1}`}
                                            className="flex-1 h-10 px-3 bg-zinc-50 border border-zinc-200 rounded-lg text-sm 
                                                       focus:outline-none focus:ring-2 focus:ring-zinc-200"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="pt-4 border-t border-zinc-100">
                            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1 block">
                                Slottekst
                            </label>
                            <textarea
                                value={authorClosingText}
                                onChange={(e) => setAuthorClosingText(e.target.value)}
                                rows={3}
                                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 resize-none
                                           focus:outline-none focus:ring-2 focus:ring-zinc-200 transition-all"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
