'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowDown,
  Check,
  CheckCircle2,
  CircleDashed,
  Copy,
  Loader2,
  Zap,
  ShieldCheck,
  Brain,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { AGENT_LABELS } from './labels';
import { ROLE_ORDER, roleStatuses } from '@/lib/activity';
import type { AgentLog } from '@/types';
import type { TelemetryState, ReasoningThought } from '@/lib/telemetry';

const ICON = {
  pending: <CircleDashed className="h-3.5 w-3.5 text-muted-foreground" />,
  running: <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />,
  completed: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />,
  failed: <AlertCircle className="h-3.5 w-3.5 text-destructive" />,
} as const;

export default function LiveNotebook({
  logs,
  running,
  projectId,
}: {
  logs: AgentLog[];
  running: boolean;
  projectId?: string;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const [atBottom, setAtBottom] = useState(true);
  const [copied, setCopied] = useState(false);
  const [telemetry, setTelemetry] = useState<TelemetryState | null>(null);
  const [showThoughts, setShowThoughts] = useState(false);
  const statuses = roleStatuses(logs);

  // Subscribe to live telemetry stream via EventSource if projectId is present
  useEffect(() => {
    if (!projectId) return;
    const es = new EventSource(`/api/projects/${projectId}/stream`);

    es.addEventListener('telemetry', (e) => {
      try {
        const data = JSON.parse(e.data);
        setTelemetry(data);
      } catch {}
    });

    return () => {
      es.close();
    };
  }, [projectId]);

  useEffect(() => {
    const el = scroller.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [logs]);

  const copyLogs = () => {
    const text = logs
      .map(
        (l) =>
          `[${new Date(l.timestamp).toLocaleTimeString('id-ID', { hour12: false })}] ${
            l.agent === 'system' ? 'Orkestrator' : AGENT_LABELS[l.agent]
          } (${l.status}): ${l.message}`
      )
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

  const burnRate = telemetry?.burnRate || (running ? 38 : 0);
  const tokensSaved = telemetry?.estimatedTokensSaved || 0;
  const thoughts = telemetry?.thoughts || [];

  return (
    <div className="relative flex h-full min-h-0 flex-col rounded-xl border border-white/[0.08] bg-[#0E131F]/90 shadow-md backdrop-blur-sm overflow-hidden">
      {/* Top Header: Roles & Telemetry Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.07] p-3 bg-white/[0.02]">
        <div className="flex flex-wrap gap-1.5">
          {ROLE_ORDER.map((r) => (
            <span
              key={r}
              className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-xs text-foreground font-medium"
            >
              {ICON[statuses[r]]}
              {AGENT_LABELS[r]}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Real-time Token Burn Rate Badge */}
          {running && (
            <span
              className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[11px] font-semibold text-amber-300 animate-pulse"
              title="Kecepatan komputasi token per detik (Burn Rate)"
            >
              <Zap className="h-3 w-3 text-amber-400" />
              <span>{burnRate} tok/s</span>
            </span>
          )}

          {/* Token-efficient compression badge */}
          {tokensSaved > 0 && (
            <span
              className="hidden sm:inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[11px] font-medium text-emerald-300"
              title="Estimasi token yang dihemat oleh Context Compressor"
            >
              <ShieldCheck className="h-3 w-3 text-emerald-400" />
              <span>Hemat ~{tokensSaved} tok</span>
            </span>
          )}

          {/* Live Thought Stream Toggle */}
          {thoughts.length > 0 && (
            <button
              type="button"
              onClick={() => setShowThoughts((v) => !v)}
              className="inline-flex items-center gap-1 rounded-md border border-purple-500/30 bg-purple-500/10 px-2 py-1 text-[11px] font-semibold text-purple-300 transition-all hover:bg-purple-500/20 active:scale-95"
              title="Lihat proses berpikir agen (Chain-of-Thought)"
            >
              <Brain className="h-3 w-3 text-purple-400" />
              <span>Pikiran ({thoughts.length})</span>
              {showThoughts ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          )}

          {logs.length > 0 && (
            <button
              type="button"
              onClick={copyLogs}
              className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-xs text-muted-foreground transition-all duration-100 ease-out hover:bg-white/[0.08] hover:border-white/[0.15] hover:text-foreground active:scale-[0.98]"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? 'Tersalin' : 'Salin Log'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Thought Stream Drawer (Collapsible) */}
      {showThoughts && thoughts.length > 0 && (
        <div className="border-b border-purple-500/25 bg-[#150e26]/90 p-3 text-xs backdrop-blur-md animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-purple-500/20">
            <span className="flex items-center gap-1.5 font-semibold text-purple-300">
              <Brain className="h-3.5 w-3.5 text-purple-400" /> Alur Penalaran Agen (Live Chain-of-Thought)
            </span>
            <span className="text-[10px] text-purple-300/70 font-mono">
              Auto-Streaming ({thoughts.length} blok)
            </span>
          </div>
          <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 font-mono text-[11px] leading-relaxed text-purple-200/90">
            {thoughts.map((th) => (
              <div key={th.id} className="flex gap-2 rounded bg-purple-950/40 border border-purple-900/50 p-1.5">
                <span className="text-purple-400 font-semibold shrink-0">
                  [{th.agent}]:
                </span>
                <span className="text-purple-100/90">{th.thought}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Log List */}
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
          <div className="flex flex-col items-center justify-center py-12 text-center text-xs text-muted-foreground">
            <CircleDashed className="h-6 w-6 text-muted-foreground/40 mb-2" />
            <p>Belum ada log produksi.</p>
            <p className="text-[11px] text-muted-foreground/70 mt-0.5">
              Klik &ldquo;Jalankan Pabrik&rdquo; pada tab Spesifikasi &amp; Setup.
            </p>
          </div>
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
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
            <span>Menjalankan proses perakitan agen…</span>
          </div>
        )}
      </div>

      {!atBottom && logs.length > 0 && (
        <button
          type="button"
          onClick={scrollToBottom}
          className="absolute bottom-4 right-4 inline-flex items-center gap-1.5 rounded-md border border-white/[0.1] bg-[#080B11]/90 backdrop-blur-md px-3 py-1.5 text-xs font-semibold text-foreground shadow-lg transition-all duration-100 ease-out hover:border-primary/50 hover:bg-primary/10 active:scale-[0.98]"
        >
          <ArrowDown className="h-3.5 w-3.5 text-primary" /> Ke log terbaru
        </button>
      )}
    </div>
  );
}
