"use client";

import { useState, useEffect } from "react";

export function useServerStream(serverId: string, initialData: any) {
    const [data, setData] = useState(initialData);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

    useEffect(() => {
        let eventSource: EventSource | null = null;

        const connect = () => {
            setStatus('connecting');
            eventSource = new EventSource(`/api/vps/${serverId}/stream`);

            eventSource.onopen = () => {
                setStatus('connected');
                setError(null);
            };

            eventSource.onmessage = (event) => {
                try {
                    const newData = JSON.parse(event.data);
                    setData(newData);
                } catch (e) {
                    console.error("Failed to parse SSE data", e);
                }
            };

            eventSource.onerror = (err) => {
                console.error("SSE Error:", err);
                setStatus('disconnected');
                setError("Connection lost. Retrying...");
                eventSource?.close();
                // Retry connection after 5 seconds
                setTimeout(connect, 5000);
            };
        };

        connect();

        return () => {
            if (eventSource) {
                eventSource.close();
            }
        };
    }, [serverId]);

    return { data, error, status };
}
