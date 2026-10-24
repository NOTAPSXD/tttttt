import { connectDB, RateLimit } from "@/lib/db";

export interface RateLimitResult {
    success: boolean;
    remaining: number;
    limit: number;
    resetAt: Date | null;
}

/**
 * Distributed, DB-backed rate limiting using a Mongo TTL counter per key.
 * Counters expire automatically (TTL index on `resetAt`), so no Redis or
 * in-process state is needed and limits hold across instances/restarts.
 */
export async function rateLimit(
    key: string,
    limit: number = 10,
    windowMs: number = 60000
): Promise<RateLimitResult> {
    try {
        await connectDB();

        const now = new Date();
        const expiredFilter = { key, resetAt: { $lte: now } };

        // Sweep expired counters so `upsert` never collides on the unique key.
        await RateLimit.deleteOne(expiredFilter);

        let doc = await RateLimit.findOneAndUpdate(
            { key },
            {
                $inc: { count: 1 },
                $setOnInsert: { resetAt: new Date(Date.now() + windowMs) },
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        if (!doc) {
            // Lost the upsert race; retry once.
            doc = await RateLimit.findOneAndUpdate(
                { key },
                { $inc: { count: 1 } },
                { upsert: true, new: true }
            );
        }

        const count = doc?.count ?? 1;
        return {
            success: count <= limit,
            remaining: Math.max(0, limit - count),
            limit,
            resetAt: doc?.resetAt ?? null,
        };
    } catch (e) {
        // Never fail a request because rate limiting could not run.
        console.error("rateLimit error:", e);
        return { success: true, remaining: limit, limit, resetAt: null };
    }
}

export async function resetRateLimit(key: string): Promise<void> {
    try {
        await connectDB();
        await RateLimit.deleteMany({ key });
    } catch (e) {
        console.error("resetRateLimit error:", e);
    }
}