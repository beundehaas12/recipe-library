import React, { useRef, useState } from 'react';
import { Camera, Image as ImageIcon, Upload, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CameraCapture({ onCapture, isProcessing }) {
    const fileInputRef = useRef(null);
    // Separate refs for camera specifically on mobile if needed, but file input with capture="environment" works well
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
        <div className="w-full max-w-md mx-auto p-6 flex flex-col items-center gap-6">
            <AnimatePresence>
                {!isProcessing ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="flex flex-col gap-4 w-full"
                    >
                        <button
                            onClick={triggerCamera}
                            className="group relative flex items-center justify-center gap-3 w-full p-6 bg-primary text-primary-foreground rounded-2xl shadow-lg hover:shadow-xl transition-all active:scale-95 overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <Camera size={32} />
                            <span className="text-xl font-semibold">Take Photo</span>
                        </button>

                        <button
                            onClick={triggerUpload}
                            className="group flex items-center justify-center gap-3 w-full p-4 bg-secondary text-secondary-foreground rounded-xl border border-border/50 hover:bg-secondary/80 transition-all active:scale-95"
                        >
                            <Upload size={24} />
                            <span className="text-lg font-medium">Upload Image</span>
                        </button>

                        {/* Hidden Input for generic file upload */}
                        <input
                            type="file"
                            ref={fileInputRef}
                            accept="image/*"
                            className="hidden"
                            onChange={handleFileChange}
                        />

                        {/* Hidden Input specifically for camera capture on mobile */}
                        <input
                            type="file"
                            ref={cameraInputRef}
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={handleFileChange}
                        />
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center justify-center p-8 bg-card rounded-3xl shadow-2xl border border-border"
                    >
                        <div className="relative w-20 h-20 mb-6">
                            <div className="absolute inset-0 border-4 border-muted rounded-full" />
                            <div className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <ImageIcon className="text-primary animate-pulse" size={24} />
                            </div>
                        </div>
                        <h3 className="text-xl font-bold text-foreground mb-2">Analyzing...</h3>
                        <p className="text-muted-foreground text-center">
                            Extracting culinary magic from pixels
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
