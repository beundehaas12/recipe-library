export default function Loading() {
    return (
        <div className="min-h-screen bg-background pt-20">
            {/* Collection Info Skeleton */}
            <div className="max-w-[1600px] mx-auto px-4 lg:px-20 py-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 animate-pulse" />
                    <div>
                        <div className="w-20 h-3 bg-white/10 rounded animate-pulse mb-2" />
                        <div className="w-40 h-7 bg-white/10 rounded animate-pulse" />
                    </div>
                    <div className="ml-auto w-24 h-8 bg-white/5 rounded-full animate-pulse" />
                </div>
            </div>

            {/* Recipe Grid Skeleton */}
            <div className="max-w-[1600px] mx-auto px-0 md:px-4 lg:px-20 py-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-0.5 md:gap-1 lg:gap-2">
                    {Array.from({ length: 12 }).map((_, i) => (
                        <div
                            key={i}
                            className="aspect-[2/3] rounded-[2px] md:rounded lg:rounded-lg bg-zinc-900 animate-pulse overflow-hidden"
                        >
                            <div className="w-full h-full bg-gradient-to-t from-zinc-800 to-zinc-900" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
