import React, { useRef, useState } from 'react';
import { Camera, Image as ImageIcon, Upload, X, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CameraCapture({ onCapture, isProcessing }) {
    const fileInputRef = useRef(null);
    const cameraInputRef = useRef(null);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            onCapture(file);
        }
    };

    const triggerUpload = () => fileInputRef.current?.click();
    const triggerCamera = () => cameraInputRef.current?.click();

    return (
        <div className="w-full max-w-md mx-auto p-4 flex flex-col items-center gap-6">
            <AnimatePresence mode="wait">
                {!isProcessing ? (
                    <motion.div
                        key="capture-buttons"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                        className="flex flex-col gap-5 w-full"
                    >
                        <div className="text-center mb-2">
                            <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-1">
                                Voeg Recept Toe
                            </h2>
                            <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">
                                Scan een foto of upload een bestand
                            </p>
                        </div>

                        <button
                            onClick={triggerCamera}
                            className="btn-primary group relative flex flex-col items-center justify-center gap-4 w-full !p-8 !rounded-[var(--radius)] !bg-primary transition-all active:scale-[0.98] shadow-2xl shadow-primary/20"
                        >
                            <div className="absolute top-4 right-4 text-black/40 group-hover:text-black transition-colors">
                                <Sparkles size={20} />
                            </div>
                            <div className="w-16 h-16 rounded-full bg-black/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                                <Camera size={32} className="text-black" />
                            </div>
                            <div className="text-center">
                                <span className="block text-xl font-black text-black uppercase tracking-tight">Maak Foto</span>
                                <span className="text-[10px] font-bold text-black/60 uppercase tracking-widest">Gebruik je camera</span>
                            </div>
                        </button>

                        <button
                            onClick={triggerUpload}
                            className="btn-secondary group flex items-center justify-between w-full !p-5 !rounded-2xl transition-all active:scale-[0.98]"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                                    <Upload size={20} className="text-white" />
                                </div>
                                <div className="text-left">
                                    <span className="block text-base font-bold text-white uppercase tracking-tight">Uploaden</span>
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Kies een bestand</span>
                                </div>
                            </div>
                            <ImageIcon size={20} className="text-muted-foreground group-hover:text-white transition-colors" />
                        </button>

                        {/* Hidden Inputs */}
                        <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleFileChange} />
                        <input type="file" ref={cameraInputRef} accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
                    </motion.div>
                ) : (
                    <motion.div
                        key="processing"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        className="flex flex-col items-center justify-center p-12 glass-panel rounded-[var(--radius)] w-full border-primary/20 shadow-2xl relative overflow-hidden"
                    >
                        {/* Animated background pulse */}
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent animate-pulse" />

                        <div className="relative w-28 h-28 mb-8">
                            {/* Scanning ring animation */}
                            <motion.div
                                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.1, 0.3] }}
                                transition={{ duration: 3, repeat: Infinity }}
                                className="absolute inset-0 bg-primary/20 rounded-full blur-2xl"
                            />

                            <div className="absolute inset-0 border-2 border-white/5 rounded-full" />
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                className="absolute inset-0 border-2 border-primary rounded-full border-t-transparent shadow-[0_0_15px_hsl(var(--primary)/0.5)]"
                            />

                            <div className="absolute inset-0 flex items-center justify-center">
                                <Sparkles className="text-primary animate-pulse" size={32} />
                            </div>
                        </div>

                        <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-tighter">Analyseren...</h3>
                        <p className="text-muted-foreground text-center font-bold text-[10px] uppercase tracking-[0.2em] max-w-[200px] leading-relaxed">
                            Onze AI extracteert de culinaire magie uit je foto
                        </p>

                        <div className="mt-8 flex gap-1">
                            {[0, 1, 2].map(i => (
                                <motion.div
                                    key={i}
                                    animate={{
                                        opacity: [0.3, 1, 0.3],
                                        scale: [1, 1.2, 1]
                                    }}
                                    transition={{
                                        duration: 1.5,
                                        repeat: Infinity,
                                        delay: i * 0.2
                                    }}
                                    className="w-1.5 h-1.5 bg-primary rounded-full"
                                />
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
