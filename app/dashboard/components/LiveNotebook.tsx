'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertCircle, ArrowDown, Check, CheckCircle2, CircleDashed, Copy, Loader2 } from 'lucide-react';
import { AGENT_LABELS } from './labels';
import { ROLE_ORDER, roleStatuses } from '@/lib/activity';
import type { AgentLog } from '@/types';

const ICON = {
  pending: <CircleDashed className="h-3.5 w-3.5 text-muted-foreground" />,
  running: <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />,
  completed: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />,
  failed: <AlertCircle className="h-3.5 w-3.5 text-destructive" />,
} as const;

export default function LiveNotebook({ logs, running }: { logs: AgentLog[]; running: boolean }) {
  const scroller = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const [atBottom, setAtBottom] = useState(true);
  const [copied, setCopied] = useState(false);
  const statuses = roleStatuses(logs);

  useEffect(() => {
    const el = scroller.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [logs]);

  const copyLogs = () => {
    const text = logs
      .map((l) => `[${new Date(l.timestamp).toLocaleTimeString('id-ID', { hour12: false })}] ${l.agent === 'system' ? 'Orkestrator' : AGENT_LABELS[l.agent]} (${l.status}): ${l.message}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const scrollToBottom = () => {
    const el = scroller.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
      stickToBottom.current = true;
      setAtBottom(true);
    }
  };

  return (
    <div className="relative flex h-full min-h-0 flex-col rounded-sm border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-3">
        <div className="flex flex-wrap gap-1.5">
          {ROLE_ORDER.map((r) => (
            <span
              key={r}
              className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-background px-2 py-1 text-xs"
            >
              {ICON[statuses[r]]}
              {AGENT_LABELS[r]}
            </span>
          ))}
        </div>
        {logs.length > 0 && (
          <button
            type="button"
            onClick={copyLogs}
            className="inline-flex items-center gap-1 rounded-sm border border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Tersalin' : 'Salin Log'}
          </button>
        )}
      </div>

      <div
        ref={scroller}
        onScroll={(e) => {
          const el = e.currentTarget;
          const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
          stickToBottom.current = isAtBottom;
          setAtBottom(isAtBottom);
        }}
        className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-3 text-xs tabular-nums"
        aria-live="polite"
      >
        {logs.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Belum ada log produksi. Klik &ldquo;Jalankan Pabrik&rdquo; pada tab Spesifikasi &amp;
            Setup.
          </p>
        ) : (
          logs.map((l) => (
            <div key={l.id} className="flex gap-2">
              <span className="shrink-0 text-muted-foreground">
                {new Date(l.timestamp).toLocaleTimeString('id-ID', { hour12: false })}
              </span>
              <span className="mt-0.5 shrink-0">{ICON[l.status]}</span>
              <span className={l.status === 'failed' ? 'text-destructive' : 'text-foreground'}>
                <strong className="font-semibold">
                  {l.agent === 'system' ? 'Orkestrator' : AGENT_LABELS[l.agent]}:
                </strong>{' '}
                {l.message}
              </span>
            </div>
          ))
        )}
        {running && (
          <div className="flex items-center gap-2 pt-1 text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin text-primary" />
            <span>Menjalankan proses agen…</span>
          </div>
        )}
      </div>

      {!atBottom && logs.length > 0 && (
        <button
          type="button"
          onClick={scrollToBottom}
          className="absolute bottom-4 right-4 inline-flex items-center gap-1 rounded-sm border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground shadow-sm hover:border-primary"
        >
          <ArrowDown className="h-3.5 w-3.5 text-primary" /> Ke log terbaru
        </button>
      )}
    </div>
  );
}
