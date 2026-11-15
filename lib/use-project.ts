'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ProjectState } from '@/types';
import type { TelemetryState } from './telemetry';

/** Fetch JSON and throw an Error carrying the server's message on failure. */
export async function api<T = any>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: init?.body ? { 'Content-Type': 'application/json', ...init.headers } : init?.headers,
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? `Permintaan gagal (${res.status})`);
  return data as T;
}

/** Project state with unified SSE stream and hardware-friendly visibility awareness. */
export function useProjectState(id: string | null) {
  const [state, setState] = useState<ProjectState | null>(null);
  const [telemetry, setTelemetry] = useState<TelemetryState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const idRef = useRef(id);
  idRef.current = id;

  const refresh = useCallback(async () => {
    const current = idRef.current;
    if (!current) return;
    try {
      const s = await api<ProjectState>(`/api/projects/${current}`);
      if (idRef.current === current) {
        setState(s);
        setError(null);
      }
    } catch (e: any) {
      if (idRef.current === current) setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setState(null);
    setTelemetry(null);
    setError(null);
    if (id) {
      setLoading(true);
      refresh();
    }
  }, [id, refresh]);

  const running = state?.project.status === 'running';
  useEffect(() => {
    if (!id) return;
    // Only establish continuous stream when running or initial setup
    if (!running) return;

    if (typeof EventSource !== 'undefined') {
      const es = new EventSource(`/api/projects/${id}/stream`);
      es.addEventListener('update', () => {
        if (typeof document === 'undefined' || document.visibilityState === 'visible') {
          refresh();
        }
      });
      es.addEventListener('telemetry', (e) => {
        try {
          setTelemetry(JSON.parse(e.data));
        } catch {}
      });
      es.addEventListener('done', () => {
        refresh();
        es.close();
      });
      es.onerror = () => {
        es.close();
      };
      return () => es.close();
    }

    // Fallback polling with tab visibility check (pauses in background)
    const t = setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        refresh();
      }
    }, 2000);
    return () => clearInterval(t);
  }, [running, id, refresh]);

  return { state, telemetry, error, loading, refresh };
}
