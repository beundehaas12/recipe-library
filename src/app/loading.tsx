export default function Loading() {
    return (
        <div className="min-h-screen bg-background pt-20">
            <div className="max-w-[1600px] mx-auto px-0 md:px-4 lg:px-20 py-8">
                {/* Skeleton Header */}
                <div className="px-4 md:px-0 mb-8">
                    <div className="h-8 w-48 bg-white/5 rounded-lg animate-pulse mb-2" />
                    <div className="h-4 w-32 bg-white/5 rounded animate-pulse" />
                </div>

                {/* Skeleton Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-0.5 md:gap-1 lg:gap-2">
                    {Array.from({ length: 12 }).map((_, i) => (
                        <div
                            key={i}
                            className="aspect-[2/3] rounded-[2px] md:rounded lg:rounded-lg bg-zinc-900 animate-pulse overflow-hidden"
                        >
                            {/* Image skeleton */}
                            <div className="w-full h-full bg-gradient-to-t from-zinc-800 to-zinc-900" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
