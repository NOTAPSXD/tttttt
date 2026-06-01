import { NextResponse } from "next/server";

const trackers = new Map<string, { count: number, lastReset: number }>();

export function rateLimit(ip: string, limit: number = 10, windowMs: number = 60000) {
    const now = Date.now();
    const tracker = trackers.get(ip) || { count: 0, lastReset: now };

    if (now - tracker.lastReset > windowMs) {
        tracker.count = 1;
        tracker.lastReset = now;
    } else {
        tracker.count++;
    }

    trackers.set(ip, tracker);

    return {
        success: tracker.count <= limit,
        remaining: Math.max(0, limit - tracker.count),
        limit
    };
}
