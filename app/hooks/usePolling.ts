"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Lightweight polling hook (no third-party data-fetching deps).
 * Runs `fetcher` immediately, then on `intervalMs`. Disabled when `enabled` is false.
 */
export function usePolling<T>(fetcher: () => Promise<T>, intervalMs: number, enabled = true) {
    const [data, setData] = useState<T | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<number | null>(null);
    const fetcherRef = useRef(fetcher);
    fetcherRef.current = fetcher;

    const refresh = useCallback(async () => {
        try {
            const result = await fetcherRef.current();
            setData(result);
            setError(null);
            setLastUpdated(Date.now());
        } catch (err) {
            setError(err instanceof Error ? err.message : "Polling failed");
        }
    }, []);

    useEffect(() => {
        if (!enabled) return;

        let cancelled = false;
        refresh();

        const timer = setInterval(() => {
            if (!cancelled) refresh();
        }, intervalMs);

        return () => {
            cancelled = true;
            clearInterval(timer);
        };
    }, [intervalMs, enabled, refresh]);

    return { data, error, lastUpdated, refresh };
}