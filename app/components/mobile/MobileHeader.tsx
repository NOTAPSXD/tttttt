"use client";

import { Menu, X, ChevronLeft } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface MobileHeaderProps {
    title: string;
    showBack?: boolean;
    backHref?: string;
    children?: React.ReactNode;
}

export default function MobileHeader({ title, showBack, backHref, children }: MobileHeaderProps) {
    const [menuOpen, setMenuOpen] = useState(false);
    const router = useRouter();

    const handleBack = () => {
        if (backHref) {
            router.push(backHref);
        } else {
            router.back();
        }
    };

    return (
        <>
            <header className="md:hidden sticky top-0 z-40 bg-[#09090b]/95 backdrop-blur-sm border-b border-zinc-800">
                <div className="flex items-center justify-between h-14 px-4">
                    {/* Left Side */}
                    <div className="flex items-center gap-2">
                        {showBack ? (
                            <button
                                onClick={handleBack}
                                className="p-2 -ml-2 hover:bg-zinc-800 rounded-lg transition-colors active:scale-95"
                            >
                                <ChevronLeft className="w-5 h-5 text-zinc-400" />
                            </button>
                        ) : (
                            <button
                                onClick={() => setMenuOpen(!menuOpen)}
                                className="p-2 -ml-2 hover:bg-zinc-800 rounded-lg transition-colors active:scale-95"
                            >
                                {menuOpen ? (
                                    <X className="w-5 h-5 text-zinc-400" />
                                ) : (
                                    <Menu className="w-5 h-5 text-zinc-400" />
                                )}
                            </button>
                        )}
                        <h1 className="text-base font-bold text-white truncate max-w-[200px]">
                            {title}
                        </h1>
                    </div>

                    {/* Right Side - Custom Actions */}
                    <div className="flex items-center gap-2">
                        {children}
                    </div>
                </div>
            </header>

            {/* Mobile Menu Overlay */}
            {menuOpen && (
                <div
                    className="md:hidden fixed inset-0 bg-black/80 z-30 backdrop-blur-sm"
                    onClick={() => setMenuOpen(false)}
                >
                    <div
                        className="bg-[#09090b] w-64 h-full border-r border-zinc-800 p-4 animate-slide-in-left"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="mb-6">
                            <h2 className="text-xl font-bold text-white">VPS Control</h2>
                            <p className="text-sm text-zinc-500">Panel</p>
                        </div>

                        <nav className="space-y-2">
                            <Link
                                href="/client"
                                className="block px-4 py-3 text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
                                onClick={() => setMenuOpen(false)}
                            >
                                Dashboard
                            </Link>
                            <Link
                                href="/client/settings"
                                className="block px-4 py-3 text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
                                onClick={() => setMenuOpen(false)}
                            >
                                Settings
                            </Link>
                            <Link
                                href="/api/auth/signout"
                                className="block px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                onClick={() => setMenuOpen(false)}
                            >
                                Logout
                            </Link>
                        </nav>
                    </div>
                </div>
            )}
        </>
    );
}
