'use client';

import {
  Activity,
  AlertCircle,
  Brain,
  CheckCircle2,
  ChevronRight,
  CircleDashed,
  Cpu,
  Layers,
  Loader2,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Project } from '@/types';
import type { TelemetryState } from '@/lib/telemetry';

const STATIONS = [
  { id: 'agent-5-ux', shortName: '1. UX', role: 'UI/UX Designer' },
  { id: 'intelligence-risk', shortName: '2. Risk', role: 'Risk & Cost Scout' },
  { id: 'agent-1-pm', shortName: '3. PM', role: 'Product Manager' },
  { id: 'agent-4-analyst', shortName: '4. Analyst', role: 'System Analyst' },
  { id: 'tech-stack-security', shortName: '5. Security', role: 'Security Architect' },
  { id: 'agent-coder', shortName: '6. Coder', role: 'Fullstack Engineer' },
] as const;

interface EngineCommandStripProps {
  project: Project;
  telemetry?: TelemetryState | null;
  onOpenInspector: () => void;
  onOpenWarRoom: () => void;
}

export default function EngineCommandStrip({
  project,
  telemetry,
  onOpenInspector,
  onOpenWarRoom,
}: EngineCommandStripProps) {
  const isRunning = project.status === 'running';
  const isCompleted = project.status === 'completed';
  const burnRate = telemetry?.burnRate ?? (isRunning ? 38 : 0);
  const tokensSaved = telemetry?.estimatedTokensSaved ?? 0;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-[#0E131F]/95 p-2.5 px-3.5 shadow-md backdrop-blur-md">
      {/* Left: 6-Station Pipeline Stepper */}
      <div className="flex items-center gap-1.5 overflow-x-auto text-xs py-0.5">
        <span className="text-[11px] font-semibold text-muted-foreground mr-1 hidden sm:inline">
          Pipeline:
        </span>
        {STATIONS.map((st, idx) => {
          const isActive = project.active_phase === st.id;
          const isDone = isCompleted;

          return (
            <div key={st.id} className="flex items-center gap-1.5 shrink-0">
              <span
                className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-all ${
                  isActive
                    ? 'bg-primary/20 text-primary border border-primary/40 font-semibold shadow-sm animate-pulse'
                    : isDone
                    ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                    : 'bg-white/[0.03] text-muted-foreground border border-white/[0.05]'
                }`}
                title={`${st.role} — ${isActive ? 'Sedang aktif bekerja' : isDone ? 'Selesai' : 'Menunggu antrean'}`}
              >
                {isActive ? (
                  <Loader2 className="h-2.5 w-2.5 animate-spin text-primary" />
                ) : isDone ? (
                  <CheckCircle2 className="h-2.5 w-2.5 text-emerald-400" />
                ) : (
                  <CircleDashed className="h-2.5 w-2.5 text-muted-foreground/60" />
                )}
                <span>{st.shortName}</span>
              </span>
              {idx < STATIONS.length - 1 && (
                <ChevronRight className="h-3 w-3 text-white/20 shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      {/* Right: Live Telemetry Chips & Action Buttons */}
      <div className="flex items-center gap-2 text-xs">
        {/* Burn Rate Badge */}
        {isRunning && (
          <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[11px] font-semibold text-amber-300">
            <Zap className="h-3 w-3 text-amber-400 animate-pulse" />
            <span>{burnRate} tok/s</span>
          </span>
        )}

        {/* Saved Tokens Badge */}
        {tokensSaved > 0 && (
          <span className="hidden md:inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[11px] font-medium text-emerald-300">
            <ShieldCheck className="h-3 w-3 text-emerald-400" />
            <span>Hemat ~{tokensSaved} tok</span>
          </span>
        )}

        {/* War Room Summon Button */}
        <Button
          size="sm"
          variant="outline"
          onClick={onOpenWarRoom}
          className="h-7 text-xs border-amber-500/30 text-amber-300 hover:bg-amber-500/10 px-2.5 font-medium"
          title="Panggil Rapat Sentral 6 Spesialis AI"
        >
          <Users className="h-3 w-3 mr-1 text-amber-400" />
          <span>War Room</span>
        </Button>

        {/* Engine Detail Drawer Trigger */}
        <Button
          size="sm"
          variant="default"
          onClick={onOpenInspector}
          className="h-7 text-xs bg-white/[0.08] hover:bg-white/[0.14] text-foreground border border-white/[0.1] px-2.5 font-medium shadow-sm"
          title="Inspeksi data mendalam mesin (RAG, Telemetri, VPS)"
        >
          <Activity className="h-3 w-3 mr-1 text-primary" />
          <span>Detail Engine</span>
        </Button>
      </div>
    </div>
  );
}
