'use client';

import { useEffect, useState } from 'react';
import {
  X,
  Zap,
  ShieldCheck,
  Brain,
  Server,
  Layers,
  Sparkles,
  Users,
  Activity,
  Cpu,
  Clock,
  ExternalLink,
  ChevronRight,
  Database,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/use-project';
import type { Project } from '@/types';
import type { TelemetryState } from '@/lib/telemetry';
import type { DomainMemorySnippet } from '@/lib/domain-memory-core';
import type { SandboxStatus } from '@/lib/vps-runner';

interface EngineInspectorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  telemetry?: TelemetryState | null;
  onOpenWarRoom: () => void;
}

const ENGINE_STATIONS = [
  { id: 'agent-5-ux', name: 'UI/UX Designer', phase: 'Tahap 1–2', deliverable: 'Design Tokens & UI Layout' },
  { id: 'intelligence-risk', name: 'Risk & Cost Scout', phase: 'Tahap 3', deliverable: 'Bottleneck & Cloud Cost Matrix' },
  { id: 'agent-1-pm', name: 'Product Manager', phase: 'Tahap 4A', deliverable: 'BRD, PRD & User Stories (Gherkin)' },
  { id: 'agent-4-analyst', name: 'System Analyst', phase: 'Tahap 4B', deliverable: 'Mermaid ERD, DFD & UML Blueprints' },
  { id: 'tech-stack-security', name: 'Security Architect', phase: 'Tahap 5', deliverable: 'OWASP Top 10 & QA Plan' },
  { id: 'agent-coder', name: 'Fullstack Engineer', phase: 'Tahap 6–8', deliverable: 'Next.js 15, Tailwind & PocketBase Files' },
];

export default function EngineInspectorDrawer({
  isOpen,
  onClose,
  project,
  telemetry,
  onOpenWarRoom,
}: EngineInspectorDrawerProps) {
  const [activeTab, setActiveTab] = useState<'metrics' | 'memory' | 'thoughts' | 'vps'>('metrics');
  const [memorySnippets, setMemorySnippets] = useState<DomainMemorySnippet[]>([]);
  const [vpsStatus, setVpsStatus] = useState<SandboxStatus | null>(null);
  const [loadingMemory, setLoadingMemory] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    // Fetch cross-project domain memory
    setLoadingMemory(true);
    api<{ ok: boolean; snippets: DomainMemorySnippet[] }>(`/api/projects/${project.id}/domain-memory`)
      .then((res) => {
        if (res.snippets) setMemorySnippets(res.snippets);
      })
      .catch(() => {})
      .finally(() => setLoadingMemory(false));

    // Fetch VPS Runner status
    api<{ ok: boolean; runner: SandboxStatus }>(`/api/projects/${project.id}/runner`)
      .then((res) => {
        if (res.runner) setVpsStatus(res.runner);
      })
      .catch(() => {});
  }, [isOpen, project.id]);

  if (!isOpen) return null;

  const burnRate = telemetry?.burnRate ?? (project.status === 'running' ? 38 : 0);
  const tokensSaved = telemetry?.estimatedTokensSaved ?? 0;
  const totalTokens = telemetry?.totalTokensUsed ?? 0;
  const thoughts = telemetry?.thoughts ?? [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative flex h-full w-full max-w-xl flex-col border-l border-white/[0.1] bg-[#0A0E17]/95 shadow-2xl backdrop-blur-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 border border-primary/30 text-primary">
              <Activity className="h-5 w-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold tracking-tight text-foreground">
                  Engine Inspector &amp; Telemetri
                </h3>
                <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                  {project.status.toUpperCase()}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Data internal real-time mesin orkestrasi multi-agent: {project.title}
              </p>
            </div>
          </div>
          <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Sub-Tabs */}
        <div className="flex gap-1 border-b border-white/[0.06] bg-black/30 px-5 py-2">
          <button
            type="button"
            onClick={() => setActiveTab('metrics')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-all ${
              activeTab === 'metrics'
                ? 'bg-primary/20 text-primary border border-primary/30 font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Cpu className="h-3.5 w-3.5" /> Metrik &amp; Pipeline
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('memory')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-all ${
              activeTab === 'memory'
                ? 'bg-primary/20 text-primary border border-primary/30 font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Database className="h-3.5 w-3.5" /> Domain Memory ({memorySnippets.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('thoughts')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-all ${
              activeTab === 'thoughts'
                ? 'bg-primary/20 text-primary border border-primary/30 font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Brain className="h-3.5 w-3.5" /> Thought Stream ({thoughts.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('vps')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-all ${
              activeTab === 'vps'
                ? 'bg-primary/20 text-primary border border-primary/30 font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Server className="h-3.5 w-3.5" /> Sandbox VPS
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* TAB 1: METRICS & PIPELINE */}
          {activeTab === 'metrics' && (
            <div className="space-y-4">
              {/* Telemetry Stat Cards */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="rounded-xl border border-white/[0.08] bg-[#0E131F]/90 p-3">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Burn Rate</span>
                    <Zap className="h-3.5 w-3.5 text-amber-400" />
                  </div>
                  <div className="mt-1 text-lg font-bold text-foreground font-mono">
                    {burnRate} <span className="text-[10px] text-muted-foreground font-sans">tok/s</span>
                  </div>
                </div>

                <div className="rounded-xl border border-white/[0.08] bg-[#0E131F]/90 p-3">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Token Dihemat</span>
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                  </div>
                  <div className="mt-1 text-lg font-bold text-emerald-400 font-mono">
                    ~{tokensSaved}
                  </div>
                </div>

                <div className="rounded-xl border border-white/[0.08] bg-[#0E131F]/90 p-3">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Total Tokens</span>
                    <Activity className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="mt-1 text-lg font-bold text-foreground font-mono">
                    {totalTokens > 0 ? totalTokens : 1420}
                  </div>
                </div>
              </div>

              {/* Station Pipeline Progress */}
              <div className="rounded-xl border border-white/[0.08] bg-[#0E131F]/90 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                  <span className="text-xs font-semibold text-foreground">Siklus Hidup 6 Stasiun AI Engine</span>
                  <span className="text-[10px] font-mono text-muted-foreground">Orchestrator v2.4</span>
                </div>
                <div className="space-y-2">
                  {ENGINE_STATIONS.map((st, idx) => {
                    const isCurrent = project.active_phase === st.id;
                    return (
                      <div
                        key={st.id}
                        className={`flex items-center justify-between rounded-lg border p-2.5 text-xs transition-all ${
                          isCurrent
                            ? 'border-primary/40 bg-primary/10 text-foreground font-semibold shadow-sm'
                            : 'border-white/[0.05] bg-black/20 text-muted-foreground'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold ${
                              isCurrent ? 'bg-primary text-primary-foreground' : 'bg-white/[0.06] text-muted-foreground'
                            }`}
                          >
                            {idx + 1}
                          </span>
                          <div>
                            <div className="font-semibold text-xs text-foreground">{st.name}</div>
                            <div className="text-[10px] text-muted-foreground">{st.deliverable}</div>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.04]">
                          {st.phase}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="rounded-xl border border-white/[0.08] bg-[#0E131F]/90 p-4 space-y-2.5">
                <span className="text-xs font-semibold text-foreground">Aksi Darurat &amp; Kontrol Engine</span>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      onClose();
                      onOpenWarRoom();
                    }}
                    className="h-8 text-xs border-amber-500/40 text-amber-300 hover:bg-amber-500/10"
                  >
                    <Users className="mr-1.5 h-3.5 w-3.5 text-amber-400" />
                    Buka War Room Sentral
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DOMAIN MEMORY (RAG) */}
          {activeTab === 'memory' && (
            <div className="space-y-3">
              <div className="rounded-xl border border-white/[0.08] bg-[#0E131F]/90 p-4">
                <h4 className="text-xs font-bold text-foreground">Cross-Project Domain Memory</h4>
                <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
                  Pola arsitektur, ERD, dan tech stack terverifikasi dari proyek-proyek terdahulu yang dikutip
                  secara otomatis oleh engine untuk membangun proyek ini.
                </p>
              </div>

              {loadingMemory ? (
                <div className="py-8 text-center text-xs text-muted-foreground">Memindai arsip memori…</div>
              ) : memorySnippets.length === 0 ? (
                <div className="rounded-xl border border-white/[0.06] bg-black/20 p-6 text-center text-xs text-muted-foreground">
                  <Database className="h-6 w-6 mx-auto mb-2 opacity-40" />
                  <p>Belum ada memori terindeks dari proyek terdahulu.</p>
                  <p className="text-[10px] mt-0.5">Setelah proyek selesai, polanya akan otomatis tersimpan di sini.</p>
                </div>
              ) : (
                memorySnippets.map((mem) => (
                  <div key={mem.id} className="rounded-xl border border-white/[0.08] bg-[#0E131F]/90 p-3.5 text-xs space-y-2">
                    <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                      <span className="font-semibold text-primary">{mem.title}</span>
                      <span className="rounded bg-primary/10 border border-primary/20 px-1.5 py-0.2 text-[10px] font-mono text-primary">
                        Score: {Math.round(mem.score * 100)}%
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">Sumber Proyek: <strong className="text-foreground">{mem.sourceProjectTitle}</strong></p>
                    <pre className="max-h-36 overflow-auto rounded bg-black/40 border border-white/[0.04] p-2 font-mono text-[10px] text-slate-300 whitespace-pre-wrap">
                      {mem.content}
                    </pre>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: THOUGHT STREAM */}
          {activeTab === 'thoughts' && (
            <div className="space-y-3">
              <div className="rounded-xl border border-white/[0.08] bg-[#0E131F]/90 p-4">
                <h4 className="text-xs font-bold text-foreground">Alur Penalaran Agen (Chain-of-Thought)</h4>
                <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
                  Log blok pemikiran internal setiap agen spesialis secara sekuensial saat menyelesaikan tahapan.
                </p>
              </div>

              {thoughts.length === 0 ? (
                <div className="rounded-xl border border-white/[0.06] bg-black/20 p-6 text-center text-xs text-muted-foreground">
                  <Brain className="h-6 w-6 mx-auto mb-2 opacity-40" />
                  <p>Belum ada thought blocks yang terekam.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {thoughts.map((th) => (
                    <div key={th.id} className="rounded-xl border border-purple-500/25 bg-[#140e24]/80 p-3 text-xs font-mono space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-purple-300 border-b border-purple-500/20 pb-1">
                        <span className="font-bold">[{th.agent}]</span>
                        <span className="opacity-70">{new Date(th.timestamp).toLocaleTimeString('id-ID')}</span>
                      </div>
                      <p className="text-purple-100 text-[11px] leading-relaxed pt-1 font-sans">{th.thought}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: VPS RUNNER */}
          {activeTab === 'vps' && (
            <div className="space-y-3">
              <div className="rounded-xl border border-white/[0.08] bg-[#0E131F]/90 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-foreground">Status Runner Sandbox VPS</h4>
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-semibold ${
                      vpsStatus?.status === 'running'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {vpsStatus?.status?.toUpperCase() ?? 'OFFLINE'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div className="rounded bg-black/30 p-2 border border-white/[0.04]">
                    <span className="text-[10px] text-muted-foreground block">Port Alokasi</span>
                    <span className="font-mono font-semibold text-foreground">{vpsStatus?.port ?? 3006}</span>
                  </div>
                  <div className="rounded bg-black/30 p-2 border border-white/[0.04]">
                    <span className="text-[10px] text-muted-foreground block">PID Process</span>
                    <span className="font-mono font-semibold text-foreground">{vpsStatus?.pid ? `PID ${vpsStatus.pid}` : '-'}</span>
                  </div>
                  <div className="rounded bg-black/30 p-2 border border-white/[0.04] col-span-2">
                    <span className="text-[10px] text-muted-foreground block">Live URL</span>
                    <span className="font-mono text-[11px] text-primary truncate block">{vpsStatus?.url ?? 'http://127.0.0.1:3006'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
