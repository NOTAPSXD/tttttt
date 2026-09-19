import { Skeleton } from "@/app/components/ui/skeleton";

export default function ServerDetailLoading() {
    return (
        <div className="space-y-5 pb-24 md:pb-8">
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div>
                        <Skeleton className="h-6 w-48" />
                        <Skeleton className="mt-2 h-3 w-40" />
                    </div>
                </div>
                <div className="flex gap-2">
                    <Skeleton className="h-8 w-20 rounded-lg" />
                    <Skeleton className="h-8 w-28 rounded-lg" />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="rounded-xl border border-stroke bg-surface p-4">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="mt-3 h-4 w-14" />
                        <Skeleton className="mt-3 h-2 w-full rounded-full" />
                        <Skeleton className="mt-2 h-3 w-24" />
                    </div>
                ))}
            </div>

            <div className="rounded-xl border border-stroke bg-surface p-4">
                <Skeleton className="h-4 w-32" />
                <div className="mt-4 flex gap-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <Skeleton key={i} className="h-9 w-28 rounded-lg" />
                    ))}
                </div>
            </div>

            <div className="flex gap-2">
                {Array.from({ length: 7 }).map((_, i) => (
                    <Skeleton key={i} className="h-9 w-24 rounded-lg" />
                ))}
            </div>

            <Skeleton className="h-64 w-full rounded-xl" />
        </div>
    );
}