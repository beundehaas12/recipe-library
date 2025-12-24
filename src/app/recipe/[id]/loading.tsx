export default function Loading() {
    return (
        <div className="min-h-screen bg-background">
            {/* Hero Image Skeleton */}
            <div className="relative w-full h-[60vh] md:h-[70vh] overflow-hidden bg-zinc-900 animate-pulse">
                {/* Gradient Overlays */}
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />

                {/* Title Section Skeleton */}
                <div className="absolute bottom-0 left-0 right-0 z-20 pb-8 px-6 lg:px-20">
                    <div className="max-w-[1200px] mx-auto">
                        {/* Cuisine tag skeleton */}
                        <div className="w-24 h-6 bg-white/10 rounded-md animate-pulse mb-4" />
                        {/* Title skeleton */}
                        <div className="w-3/4 h-12 md:h-16 bg-white/10 rounded-lg animate-pulse mb-2" />
                        <div className="w-1/2 h-12 md:h-16 bg-white/10 rounded-lg animate-pulse mb-4" />
                        {/* Author skeleton */}
                        <div className="flex items-center gap-3 mt-4">
                            <div className="w-10 h-10 rounded-full bg-white/10 animate-pulse" />
                            <div className="w-32 h-4 bg-white/10 rounded animate-pulse" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Section Skeleton */}
            <div className="max-w-[1200px] mx-auto px-6 lg:px-20 py-12">
                {/* Meta Info Skeleton */}
                <div className="flex flex-wrap gap-6 mb-12">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 animate-pulse" />
                        <div>
                            <div className="w-16 h-3 bg-white/10 rounded animate-pulse mb-2" />
                            <div className="w-20 h-4 bg-white/10 rounded animate-pulse" />
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 animate-pulse" />
                        <div>
                            <div className="w-16 h-3 bg-white/10 rounded animate-pulse mb-2" />
                            <div className="w-20 h-4 bg-white/10 rounded animate-pulse" />
                        </div>
                    </div>
                </div>

                {/* Description Skeleton */}
                <div className="mb-12 space-y-3">
                    <div className="w-full h-4 bg-white/5 rounded animate-pulse" />
                    <div className="w-5/6 h-4 bg-white/5 rounded animate-pulse" />
                    <div className="w-4/6 h-4 bg-white/5 rounded animate-pulse" />
                </div>

                <div className="grid lg:grid-cols-[1fr_2fr] gap-12">
                    {/* Ingredients Skeleton */}
                    <div>
                        <div className="w-32 h-6 bg-white/10 rounded animate-pulse mb-6" />
                        <div className="space-y-3">
                            {Array.from({ length: 8 }).map((_, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-primary/30" />
                                    <div className="flex-1 h-4 bg-white/5 rounded animate-pulse" style={{ width: `${60 + Math.random() * 40}%` }} />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Instructions Skeleton */}
                    <div>
                        <div className="w-32 h-6 bg-white/10 rounded animate-pulse mb-6" />
                        <div className="space-y-6">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="flex gap-4">
                                    <div className="w-8 h-8 rounded-full bg-primary/10 animate-pulse flex-shrink-0" />
                                    <div className="flex-1 space-y-2 pt-1">
                                        <div className="w-full h-4 bg-white/5 rounded animate-pulse" />
                                        <div className="w-5/6 h-4 bg-white/5 rounded animate-pulse" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
