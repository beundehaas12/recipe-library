import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
    return (
        <div className="min-h-screen bg-background pt-20 pb-24">
            {/* Hero Section Skeleton */}
            <div className="max-w-[1600px] mx-auto px-4 lg:px-20 py-12">
                <div className="flex items-start gap-8">
                    {/* Avatar Skeleton */}
                    <Skeleton className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-white/10 flex-shrink-0" />

                    {/* Author Info Skeleton */}
                    <div className="flex-1 space-y-4">
                        <Skeleton className="h-3 w-20 bg-white/10" />
                        <Skeleton className="h-12 md:h-16 w-3/4 max-w-2xl bg-white/10" />
                        <Skeleton className="h-5 w-full max-w-3xl bg-white/10" />
                        <Skeleton className="h-5 w-2/3 max-w-3xl bg-white/10" />

                        {/* Stats Skeleton */}
                        <div className="flex gap-6 pt-2">
                            <Skeleton className="h-6 w-32 bg-white/10" />
                            <Skeleton className="h-6 w-32 bg-white/10" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs Skeleton */}
            <div className="max-w-[1600px] mx-auto px-4 lg:px-20 mb-8">
                <div className="flex gap-4 border-b border-white/10">
                    <Skeleton className="h-12 w-40 bg-white/10" />
                    <Skeleton className="h-12 w-40 bg-white/10" />
                </div>
            </div>

            {/* Grid Skeleton */}
            <div className="max-w-[1600px] mx-auto px-0 md:px-4 lg:px-20">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-0.5 md:gap-1 lg:gap-2">
                    {Array.from({ length: 12 }).map((_, i) => (
                        <div key={i} className="aspect-[2/3]">
                            <Skeleton className="w-full h-full rounded-sm md:rounded-lg bg-zinc-900 animate-pulse" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
