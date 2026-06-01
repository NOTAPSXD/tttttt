export default function VPSLoadingSkeleton() {
    return (
        <div className="min-h-screen bg-black text-zinc-200 font-sans animate-pulse">
            {/* Navbar */}
            <div className="border-b border-zinc-800 bg-[#09090b]/50 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-[1600px] mx-auto px-4 lg:px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-zinc-800 rounded-md"></div>
                        <div className="h-6 w-px bg-zinc-800 mx-2 hidden md:block"></div>
                        <div>
                            <div className="h-4 w-32 bg-zinc-800 rounded mb-2"></div>
                            <div className="h-3 w-48 bg-zinc-800 rounded"></div>
                        </div>
                    </div>
                    <div className="h-8 w-32 bg-zinc-800 rounded"></div>
                </div>

                {/* Navigation Tabs */}
                <div className="max-w-[1600px] mx-auto px-4 lg:px-6 flex gap-6 overflow-x-auto border-t border-zinc-800/50">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-12 w-20 bg-zinc-800/50 rounded-t"></div>
                    ))}
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-[1600px] mx-auto px-4 lg:px-6 py-8 pb-20 space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* LEFT: Controls & Info */}
                    <div className="lg:col-span-4 space-y-6">
                        {/* Power Controls */}
                        <div className="bg-[#09090b] border border-zinc-800 rounded-xl overflow-hidden">
                            <div className="p-4 border-b border-zinc-800 bg-zinc-900/30">
                                <div className="h-4 w-24 bg-zinc-800 rounded"></div>
                            </div>
                            <div className="p-4 grid grid-cols-2 gap-3">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="h-14 bg-zinc-800 rounded-lg"></div>
                                ))}
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="bg-[#09090b] border border-zinc-800 rounded-xl overflow-hidden">
                            <div className="p-4 border-b border-zinc-800 bg-zinc-900/30">
                                <div className="h-4 w-32 bg-zinc-800 rounded"></div>
                            </div>
                            <div className="divide-y divide-zinc-800">
                                {[1, 2].map(i => (
                                    <div key={i} className="p-4 flex items-center gap-4">
                                        <div className="w-10 h-10 bg-zinc-800 rounded"></div>
                                        <div className="flex-1">
                                            <div className="h-4 w-32 bg-zinc-800 rounded mb-2"></div>
                                            <div className="h-3 w-48 bg-zinc-800 rounded"></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Specs */}
                        <div className="bg-[#09090b] border border-zinc-800 rounded-xl p-4">
                            <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="flex items-start gap-3">
                                        <div className="w-4 h-4 bg-zinc-800 rounded mt-0.5"></div>
                                        <div className="flex-1">
                                            <div className="h-3 w-16 bg-zinc-800 rounded mb-2"></div>
                                            <div className="h-4 w-20 bg-zinc-800 rounded"></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: Metrics */}
                    <div className="lg:col-span-8 space-y-6">
                        {/* Live Metrics Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="bg-[#09090b] border border-zinc-800 rounded-xl p-5 h-32">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <div className="h-3 w-20 bg-zinc-800 rounded mb-2"></div>
                                            <div className="h-6 w-16 bg-zinc-800 rounded"></div>
                                        </div>
                                        <div className="w-4 h-4 bg-zinc-800 rounded"></div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Charts */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {[1, 2].map(i => (
                                <div key={i} className="bg-[#09090b] border border-zinc-800 rounded-xl p-5">
                                    <div className="h-4 w-32 bg-zinc-800 rounded mb-6"></div>
                                    <div className="h-[200px] bg-zinc-900 rounded"></div>
                                </div>
                            ))}
                        </div>

                        {/* Network Usage Bar */}
                        <div className="bg-[#09090b] border border-zinc-800 rounded-xl p-5">
                            <div className="flex justify-between items-end mb-2">
                                <div>
                                    <div className="h-4 w-32 bg-zinc-800 rounded mb-2"></div>
                                    <div className="h-3 w-24 bg-zinc-800 rounded"></div>
                                </div>
                                <div className="h-5 w-40 bg-zinc-800 rounded"></div>
                            </div>
                            <div className="w-full h-2 bg-zinc-900 rounded-full mt-4"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
