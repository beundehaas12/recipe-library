import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
    return (
        <div className="min-h-screen bg-background p-8 pt-24">
            <div className="max-w-[1200px] mx-auto">
                <Skeleton className="h-10 w-40 mb-6 bg-white/10" />
                <Skeleton className="h-4 w-64 mb-8 bg-white/10" />

                <div className="grid gap-4">
                    {Array.from({ length: 7 }).map((_, i) => (
                        <div key={i} className="flex gap-4">
                            <Skeleton className="w-24 h-24 rounded-xl bg-white/5 flex-shrink-0" />
                            <div className="w-full space-y-2 py-2">
                                <Skeleton className="h-6 w-48 bg-white/10" />
                                <Skeleton className="h-4 w-full max-w-md bg-white/5" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
