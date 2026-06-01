import React from 'react';
import { Server, Zap, Shield, Globe } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-black font-sans text-zinc-300">
            {/* Left side: Premium info panel with background image (hidden on mobile/tablet) */}
            <div className="hidden lg:flex lg:col-span-7 relative flex-col justify-between p-16 overflow-hidden">
                {/* Background image with overlay */}
                <div 
                    className="absolute inset-0 z-0 bg-cover bg-center transition-transform duration-[20s] hover:scale-105"
                    style={{ backgroundImage: `url('/login_bg.png')` }}
                />
                {/* Modern dark gradient overlay to ensure text readability and match aesthetic */}
                <div className="absolute inset-0 z-10 bg-gradient-to-br from-black/80 via-black/75 to-[#050505]/95 backdrop-blur-[2px]" />
                
                {/* Ambient glow effects */}
                <div className="absolute top-1/4 right-0 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[100px] z-10 pointer-events-none" />
                <div className="absolute bottom-1/4 left-10 w-[300px] h-[300px] bg-indigo-600/10 rounded-full blur-[80px] z-10 pointer-events-none" />

                {/* Top Brand Logo */}
                <div className="relative z-20 flex items-center gap-3">
                    <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" />
                    <span className="text-xl font-bold tracking-tight text-white">VexaNode</span>
                </div>

                {/* Central Marketing Message */}
                <div className="relative z-20 my-auto max-w-xl space-y-8">
                    <div className="space-y-4">
                        <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-blue-400 bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-full w-fit">
                            VPS Management Panel
                        </span>
                        <h1 className="text-5xl font-black text-white tracking-tight leading-[1.1] md:text-6xl">
                            Enterprise <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-blue-500 to-indigo-400">
                                Infrastructure
                            </span> <br />
                            Made Simple
                        </h1>
                        <p className="text-zinc-400 text-base leading-relaxed font-medium">
                            High-performance virtual servers with full control, real-time monitoring, and instant provisioning.
                        </p>
                    </div>

                    {/* Features list */}
                    <div className="space-y-5 pt-4">
                        <div className="flex items-start gap-4 group">
                            <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 group-hover:border-blue-500/30 group-hover:bg-blue-950/10 transition-all">
                                <Zap className="w-5 h-5 text-zinc-500 group-hover:text-blue-400 transition-colors" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-white uppercase tracking-wider">Instant Provisioning</h4>
                                <p className="text-xs text-zinc-500 mt-0.5">Servers deployed and active in seconds.</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4 group">
                            <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 group-hover:border-blue-500/30 group-hover:bg-blue-950/10 transition-all">
                                <Shield className="w-5 h-5 text-zinc-500 group-hover:text-blue-400 transition-colors" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-white uppercase tracking-wider">Secure & Reliable</h4>
                                <p className="text-xs text-zinc-500 mt-0.5">99.9% uptime SLA guaranteed by enterprise hardware.</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4 group">
                            <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 group-hover:border-blue-500/30 group-hover:bg-blue-950/10 transition-all">
                                <Globe className="w-5 h-5 text-zinc-500 group-hover:text-blue-400 transition-colors" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-white uppercase tracking-wider">Global Network</h4>
                                <p className="text-xs text-zinc-500 mt-0.5">Low-latency premium uplinks and edge routing.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Copyright */}
                <div className="relative z-20 text-xs text-zinc-600 font-semibold tracking-wide">
                    &copy; 2026 VexaNode. All rights reserved.
                </div>
            </div>

            {/* Right side: Form Panel */}
            <div className="col-span-1 lg:col-span-5 flex flex-col justify-center items-center p-8 lg:p-16 bg-[#030303] relative min-h-screen">
                {/* Back glow for mobile/small screen visual consistency */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-600/5 via-transparent to-transparent pointer-events-none lg:hidden" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-indigo-600/5 via-transparent to-transparent pointer-events-none lg:hidden" />
                
                {/* Mobile Header Logo */}
                <div className="lg:hidden flex items-center gap-3 mb-10">
                    <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" />
                    <span className="text-xl font-bold tracking-tight text-white">VexaNode</span>
                </div>

                {/* Form container card */}
                <div className="w-full max-w-md z-10">
                    {children}
                </div>
            </div>
        </div>
    );
}
