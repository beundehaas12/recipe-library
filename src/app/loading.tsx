import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
    return (
        <div className="min-h-screen bg-background">
            {/* Hero Section Skeleton */}
            <div className="relative w-full h-[75vh] md:h-[85vh] bg-zinc-900/50">
                <div className="absolute bottom-0 left-0 right-0 pb-12 px-4 lg:px-20 mx-auto max-w-[1600px]">
                    <Skeleton className="h-6 w-32 mb-4 bg-white/10" />
                    <Skeleton className="h-16 md:h-24 w-3/4 max-w-4xl mb-4 bg-white/10" />
                    <Skeleton className="h-6 w-full max-w-2xl bg-white/10" />
                    <Skeleton className="h-6 w-2/3 max-w-2xl mt-2 bg-white/10" />
                    <Skeleton className="h-14 w-48 mt-8 rounded-full bg-white/10" />
                </div>
            </div>

            {/* Grid Content Skeleton */}
            <div className="max-w-[1600px] mx-auto px-4 lg:px-20 pb-20 pt-12">
                <Skeleton className="h-8 w-48 mb-8 bg-white/10" />
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                    {Array.from({ length: 12 }).map((_, i) => (
                        <div key={i} className="aspect-[2/3]">
                            <Skeleton className="w-full h-full rounded-lg bg-white/5" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
