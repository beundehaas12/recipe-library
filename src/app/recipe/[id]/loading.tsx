import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
    return (
        <div className="min-h-screen bg-background">
            {/* Hero Image Skeleton */}
            <div className="relative w-full h-[60vh] md:h-[70vh] bg-zinc-900/50">
                <div className="absolute bottom-0 left-0 right-0 pb-8 px-6 lg:px-20">
                    <div className="max-w-[1200px] mx-auto">
                        <Skeleton className="h-6 w-24 mb-4 rounded-md bg-white/10" />
                        <Skeleton className="h-12 md:h-20 w-3/4 mb-4 bg-white/10" />
                        <div className="flex items-center gap-3 mt-4">
                            <Skeleton className="w-10 h-10 rounded-full bg-white/10" />
                            <Skeleton className="h-5 w-32 bg-white/10" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Skeleton */}
            <div className="max-w-[1200px] mx-auto px-6 lg:px-20 py-12">
                {/* Meta Info */}
                <div className="flex gap-6 mb-12">
                    <div className="flex items-center gap-3">
                        <Skeleton className="w-12 h-12 rounded-2xl bg-white/10" />
                        <div>
                            <Skeleton className="h-3 w-16 mb-1 bg-white/10" />
                            <Skeleton className="h-4 w-12 bg-white/10" />
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Skeleton className="w-12 h-12 rounded-2xl bg-white/10" />
                        <div>
                            <Skeleton className="h-3 w-16 mb-1 bg-white/10" />
                            <Skeleton className="h-4 w-12 bg-white/10" />
                        </div>
                    </div>
                </div>

                <Skeleton className="h-4 w-full max-w-3xl mb-2 bg-white/10" />
                <Skeleton className="h-4 w-3/4 max-w-3xl mb-12 bg-white/10" />

                <div className="grid lg:grid-cols-[1fr_2fr] gap-12">
                    {/* Ingredients Skeleton */}
                    <div>
                        <Skeleton className="h-8 w-40 mb-6 bg-white/10" />
                        <div className="space-y-3">
                            {Array.from({ length: 8 }).map((_, i) => (
                                <Skeleton key={i} className="h-4 w-full bg-white/5" />
                            ))}
                        </div>
                    </div>

                    {/* Instructions Skeleton */}
                    <div>
                        <Skeleton className="h-8 w-40 mb-6 bg-white/10" />
                        <div className="space-y-6">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="flex gap-4">
                                    <Skeleton className="w-8 h-8 rounded-full bg-white/10 flex-shrink-0" />
                                    <div className="space-y-2 w-full">
                                        <Skeleton className="h-4 w-full bg-white/5" />
                                        <Skeleton className="h-4 w-5/6 bg-white/5" />
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
