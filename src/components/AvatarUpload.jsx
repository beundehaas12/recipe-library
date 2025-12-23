import React, { useState, useRef } from 'react';
import { Camera, Upload, Trash2, User, Loader2, Shuffle } from 'lucide-react';
import { uploadAvatar, deleteAvatar } from '../lib/profileService';

export default function AvatarUpload({ currentAvatarUrl, isCustomAvatar, onAvatarUpdate, onRandomize }) {
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef(null);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Basic validation
        if (!file.type.startsWith('image/')) {
            alert('Selecteer een geldig afbeeldingsbestand');
            return;
        }

        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            alert('Afbeelding mag maximaal 5MB zijn');
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await uploadAvatar(file);
            if (error) throw error;
            if (onAvatarUpdate) onAvatarUpdate(data.avatar_url);
        } catch (error) {
            console.error('Avatar upload failed:', error);
            alert('Uploaden mislukt: ' + error.message);
        } finally {
            setLoading(false);
            // Reset input
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Weet je zeker dat je je profielfoto wilt verwijderen?')) return;

        setLoading(true);
        try {
            const { error } = await deleteAvatar();
            if (error) throw error;
            if (onAvatarUpdate) onAvatarUpdate(null);
        } catch (error) {
            console.error('Avatar delete failed:', error);
            alert('Verwijderen mislukt: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center gap-4">
            <div className="relative group">
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-zinc-800 bg-zinc-900 shadow-xl relative">
                    {loading ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                            <Loader2 className="animate-spin text-white" size={32} />
                        </div>
                    ) : null}

                    {currentAvatarUrl ? (
                        <img
                            src={currentAvatarUrl}
                            alt="Profile"
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-600 bg-zinc-900">
                            <User size={48} />
                        </div>
                    )}

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="text-white hover:text-primary transition-colors p-2"
                            title="Upload nieuwe foto"
                        >
                            <Camera size={24} />
                        </button>
                        {isCustomAvatar && (
                            <button
                                onClick={handleDelete}
                                className="text-red-400 hover:text-red-300 transition-colors p-2"
                                title="Verwijder foto"
                            >
                                <Trash2 size={24} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex gap-2">
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                />
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading}
                    className="text-xs font-bold uppercase tracking-wider text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
                >
                    <Upload size={14} />
                    Foto uploaden
                </button>
                {onRandomize && !isCustomAvatar && (
                    <button
                        onClick={onRandomize}
                        disabled={loading}
                        className="text-xs font-bold uppercase tracking-wider text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1 ml-2"
                    >
                        <Shuffle size={14} />
                        Randomize
                    </button>
                )}
            </div>
        </div>
    );
}
