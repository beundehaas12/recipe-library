import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
    return (
        <div className="min-h-screen bg-background pt-20">
            {/* Collection Info Skeleton */}
            <div className="max-w-[1600px] mx-auto px-4 lg:px-20 py-6">
                <div className="flex items-center gap-4">
                    <Skeleton className="w-12 h-12 rounded-full bg-white/10" />
                    <div>
                        <Skeleton className="h-3 w-20 mb-2 bg-white/10" />
                        <Skeleton className="h-8 w-64 bg-white/10" />
                    </div>
                    <Skeleton className="ml-auto w-24 h-8 rounded-full bg-white/10" />
                </div>
            </div>

            {/* Recipe Grid Skeleton */}
            <div className="max-w-[1600px] mx-auto px-0 md:px-4 lg:px-20 py-4">
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
