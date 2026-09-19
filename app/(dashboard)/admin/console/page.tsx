"use client";

import { useEffect, useState } from "react";
import axios from "axios";

const DEFAULT_CODE = `// Backfill that only runs once via migration 001. Safe to re-run:
const missing = await User.find({ emailLower: { $exists: false } }, { email: 1 });
let fixed = 0;
for (const u of missing) {
    if (!u.email) continue;
    u.emailLower = String(u.email).trim().toLowerCase();
    await u.save({ validateBeforeSave: false });
    fixed++;
}
console.log("emailLower backfilled for", fixed, "users");
return { fixed };

// Cosmetics: normalize login email lookups
const dupes = await User.aggregate([
    { $group: { _id: "$emailLower", count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
]);
return { fixed, dupeEmails: dupes.length };
`;

export default function AdminConsolePage() {
    const [code, setCode] = useState(DEFAULT_CODE);
    const [running, setRunning] = useState(false);
    const [out, setOut] = useState<any>(null);
    const [err, setErr] = useState("");

    const run = async () => {
        setRunning(true);
        setErr("");
        setOut(null);
        try {
            const res = await axios.post("/api/admin/console", { code });
            setOut(res.data);
        } catch (e: any) {
            setErr(e?.response?.data?.error || e?.message || String(e));
        } finally {
            setRunning(false);
        }
    };

    useEffect(() => {
        // nothing
    }, []);

    return (
        <div className="max-w-5xl mx-auto px-6 py-8">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-semibold">Admin Console</h1>
                    <p className="text-sm text-zinc-400 mt-1">
                        Paste a maintenance script and run it against the production database.
                        SUPER_ADMIN only. Every run is audited.
                    </p>
                </div>
                <button
                    onClick={run}
                    disabled={running || !code.trim()}
                    className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white px-5 py-2 rounded-lg font-medium"
                >
                    {running ? "Running" : "Run"}
                </button>
            </div>

            <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                spellCheck={false}
                className="w-full h-72 bg-zinc-900 border border-zinc-700 rounded-xl p-4 font-mono text-sm focus:border-zinc-500 outline-none"
                placeholder="import mongoose; const users = await User.find({}); ..."
            />

            {err && (
                <div className="mt-4 p-4 rounded-lg bg-red-950/40 border border-red-900 text-red-300 text-sm whitespace-pre-wrap">
                    {err}
                </div>
            )}

            {out && (
                <div className="mt-4 space-y-3">
                    <div className="flex items-center gap-3 text-xs text-zinc-400">
                        <span className={out.ok ? "text-green-400" : "text-red-400"}>
                            {out.ok ? "OK" : "Failed"}
                        </span>
                        <span>{out.durationMs}ms</span>
                        {out.timeout && <span className="text-amber-400">Timed out</span>}
                    </div>

                    {(out.printed || []).length > 0 && (
                        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs text-zinc-300 whitespace-pre-wrap">
                            {(out.printed || []).map((l: string, i: number) => (
                                <pre key={i} className="m-0">{l}</pre>
                            ))}
                        </div>
                    )}

                    {out.result !== null && out.result !== undefined && (
                        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs text-emerald-300 whitespace-pre-wrap">
                            <pre className="m-0">{typeof out.result === "string" ? out.result : JSON.stringify(out.result, null, 2)}</pre>
                        </div>
                    )}

                    {out.error && (
                        <div className="rounded-lg border border-red-900 bg-red-950/40 p-4 font-mono text-xs text-red-300 whitespace-pre-wrap">
                            {out.error}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
