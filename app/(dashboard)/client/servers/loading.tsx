import { Skeleton } from "@/app/components/ui/skeleton";

export default function ServersLoading() {
    return (
        <div className="space-y-6 pb-24 md:pb-8">
            <div className="flex items-end justify-between">
                <div>
                    <Skeleton className="h-8 w-40" />
                    <Skeleton className="mt-2 h-4 w-64" />
                </div>
                <Skeleton className="h-8 w-36 rounded-full" />
            </div>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="rounded-xl border border-stroke bg-surface p-4">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="mt-3 h-8 w-16" />
                        <Skeleton className="mt-2 h-3 w-28" />
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="rounded-xl border border-stroke bg-surface p-4">
                        <div className="flex items-center gap-3">
                            <Skeleton className="h-10 w-10 rounded-lg" />
                            <div className="flex-1">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="mt-2 h-3 w-24" />
                            </div>
                        </div>
                        <div className="mt-4 space-y-2">
                            <Skeleton className="h-3 w-full" />
                            <Skeleton className="h-3 w-2/3" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}