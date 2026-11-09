'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ProjectState } from '@/types';

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

/** Project state with polling while a run is in progress (the "real-time" feed). */
export function useProjectState(id: string | null) {
  const [state, setState] = useState<ProjectState | null>(null);
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
    setError(null);
    if (id) {
      setLoading(true);
      refresh();
    }
  }, [id, refresh]);

  const running = state?.project.status === 'running';
  useEffect(() => {
    if (!running || !id) return;

    if (typeof EventSource !== 'undefined') {
      const es = new EventSource(`/api/projects/${id}/stream`);
      es.addEventListener('update', () => refresh());
      es.addEventListener('done', () => {
        refresh();
        es.close();
      });
      es.onerror = () => {
        es.close();
      };
      return () => es.close();
    }

    const t = setInterval(refresh, 1500);
    return () => clearInterval(t);
  }, [running, id, refresh]);

  return { state, error, loading, refresh };
}
