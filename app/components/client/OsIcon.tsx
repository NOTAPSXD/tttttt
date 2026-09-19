import { Terminal } from "lucide-react";
import { cn } from "@/app/components/ui/button";
import type { OsIcon as OsIconName } from "@/lib/clientserver";

const brandTiles: Record<string, { bg: string; label: string }> = {
    alma: { bg: "bg-[#e02b2b]/15 text-[#ff5a5a]", label: "Al" },
    centos: { bg: "bg-[#3f7cc9]/15 text-[#6ba6e0]", label: "Ce" },
    rocky: { bg: "bg-[#10b981]/15 text-[#43e3b1]", label: "Ro" },
    fedora: { bg: "bg-[#4b6aa8]/15 text-[#7f9fd6]", label: "Fe" },
};

function UbuntuMark({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
            <circle cx="12" cy="12" r="5.6" stroke="#E95420" strokeWidth="2.2" />
            <circle cx="12" cy="12" r="1.7" fill="#E95420" />
            <circle cx="12" cy="3.2" r="1.15" fill="#E95420" />
            <circle cx="20.4" cy="12" r="1.15" fill="#E95420" />
            <circle cx="3.6" cy="12" r="1.15" fill="#E95420" />
        </svg>
    );
}

function DebianMark({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
            <path d="M12 2.2c-5.4 0-9.8 4.4-9.8 9.8a8.4 8.4 0 0 0 4.2 7.3l1-2.2a6.2 6.2 0 0 1-3-5.3c0-2 1-4.4 3.3-6.2l.9 2.4c-.9.8-1.4 1.8-1.3 2.8.2 3.6 3.3 5.6 6.1 5.1v-2.6c1.6.4 3 .8 4 1.9 1.1 1.2 1 2.8.6 4.1-.8 2.2-2.5 3.7-2.5 3.7l-1.3-1.9c.9-.6 1.8-1.6 2.3-3 .5-1.4.4-2.8-.3-4-1-1.3-2.6-1.8-4.6-2.2-.3-.1-.5-.3-.6-.6l.4-2c.5 0 1 .1 1.6 0 .7-.2 1.4-.9 1.2-2.7C14.2 3.9 13.1 2.2 12 2.2Z" fill="#A80030" />
        </svg>
    );
}

function WindowsMark({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={className} fill="#4C9BDF" aria-hidden>
            <path d="M3 4.5 11 3.6v7.7H3V4.5ZM12 3.4l9-1v8.9h-9V3.4ZM3 12.7h8v7.7l-8-.9v-6.8ZM12 12.7h9v8l-9-1v-7Z" />
        </svg>
    );
}

export function OsIcon({ os = "generic", className, size }: { os?: OsIconName; className?: string; size?: number }) {
    const name: OsIconName = os;
    const sizeClass = "h-5 w-5";

    const inner = () => {
        if (name === "ubuntu") return <UbuntuMark className={sizeClass} />;
        if (name === "debian") return <DebianMark className={sizeClass} />;
        if (name === "windows") return <WindowsMark className={sizeClass} />;
        const tile = brandTiles[name] || null;
        if (tile) {
            return (
                <div
                    className={cn(
                        "flex h-5 w-5 items-center justify-center rounded-[5px] text-[8px] font-black tracking-tight",
                        tile.bg,
                    )}
                >
                    {tile.label}
                </div>
            );
        }
        return <Terminal className={cn(sizeClass, "text-panel-muted")} />;
    };

    return (
        <div
            className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg border border-stroke bg-surface-2",
                className,
            )}
            style={size ? { width: size, height: size } : undefined}
        >
            {inner()}
        </div>
    );
}

export default OsIcon;