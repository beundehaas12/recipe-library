import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
    return (
        <div className="min-h-screen bg-background p-8 pt-24">
            <div className="max-w-[1200px] mx-auto">
                <Skeleton className="h-10 w-48 mb-6 bg-white/10" />
                <Skeleton className="h-4 w-96 mb-8 bg-white/10" />

                <div className="space-y-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-16 w-full rounded-xl bg-white/5" />
                    ))}
                </div>
            </div>
        </div>
    );
}
