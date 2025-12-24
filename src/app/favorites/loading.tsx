import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
    return (
        <div className="min-h-screen bg-background p-8 pt-24">
            <div className="max-w-[1200px] mx-auto">
                <Skeleton className="h-10 w-56 mb-6 bg-white/10" />
                <Skeleton className="h-4 w-72 mb-8 bg-white/10" />

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="aspect-[2/3]">
                            <Skeleton className="w-full h-full rounded-xl bg-white/5" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
