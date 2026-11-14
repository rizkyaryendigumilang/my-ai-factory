'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Building2,
  ExternalLink,
  FolderGit2,
  Maximize2,
  Minimize2,
  Settings,
  SlidersHorizontal,
  Terminal,
  Workflow,
  X,
} from 'lucide-react';
import LiveNotebook from '../dashboard/components/LiveNotebook';
import { CAST } from '../dashboard/components/VirtualOffice';
import DivisionAgentModal from './components/DivisionAgentModal';
import SoftwareHouseSchemeModal from './components/SoftwareHouseSchemeModal';
import SettingsModal from '@/components/SettingsModal';
import { officeActivity, ROLE_ORDER, type OfficeState } from '@/lib/activity';
import { DEFAULT_DIVISIONS, type DivisionAgentConfig } from '@/lib/division-types';
import { api, useProjectState } from '@/lib/use-project';
import type { AgentRole, Project } from '@/types';

const ROLE_DETAILS: Record<AgentRole, { title: string; dept: string }> = {
  'agent-5-ux': { title: 'UI/UX Designer', dept: 'Desain & Token Antarmuka' },
  'intelligence-risk': { title: 'Cloud & Risk Scout', dept: 'Arsitektur & Estimasi Biaya' },
  'agent-1-pm': { title: 'Product Manager', dept: 'Spesifikasi BRD & PRD' },
  'agent-4-analyst': { title: 'System Analyst', dept: 'Database ERD & Diagram UML' },
  'tech-stack-security': { title: 'Security Architect', dept: 'Keamanan OWASP & Rencana QA' },
  'agent-coder': { title: 'Fullstack Engineer', dept: 'Konstruksi Kode Next.js' },
};

const STATE_BADGES: Record<OfficeState, { label: string; dot: string }> = {
  typing: { label: 'Mengetik di meja', dot: 'bg-primary' },
  discussing: { label: 'Rapat di meja tengah', dot: 'bg-sky-400' },
  idle: { label: 'Siaga', dot: 'bg-muted-foreground' },
};

function SoftwareHouseOffice() {
  const params = useSearchParams();
  const [projects, setProjects] = useState<Project[]>([]);
  const [id, setId] = useState<string | null>(params.get('project'));
  const [showDrawer, setShowDrawer] = useState(false);
  const [showDivisionModal, setShowDivisionModal] = useState(false);
  const [showSchemeModal, setShowSchemeModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [divisions, setDivisions] = useState<Record<AgentRole, DivisionAgentConfig>>(DEFAULT_DIVISIONS);
  const [iframeKey, setIframeKey] = useState(0);
  const { state } = useProjectState(id);

  const loadDivisions = useCallback(async () => {
    try {
      const res = await fetch('/api/divisions');
      if (res.ok) {
        const data = await res.json();
        if (data.divisions) setDivisions(data.divisions);
      }
    } catch {}
  }, []);

  useEffect(() => {
    loadDivisions();
  }, [loadDivisions]);

  useEffect(() => {
    api<{ projects: Project[] }>('/api/projects')
      .then((d) => {
        setProjects(d.projects);
        setId((cur) => cur ?? d.projects[0]?.id ?? null);
      })
      .catch(() => {});
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    const handleMsg = (e: MessageEvent) => {
      if (e.data?.type === 'FACTORY_AGENT_CLICK') {
        setShowDivisionModal(true);
      }
    };
    window.addEventListener('message', handleMsg);
    return () => window.removeEventListener('message', handleMsg);
  }, []);

  const handleSavedDivisions = useCallback(() => {
    loadDivisions();
    setIframeKey((k) => k + 1);
  }, [loadDivisions]);

  const activity = useMemo(() => officeActivity(state?.logs ?? []), [state?.logs]);
  const running = state?.project.status === 'running';

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-[#070b13] text-foreground antialiased">
      {/* Top Floating Control Bar */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-white/[0.07] bg-[#080B11]/85 backdrop-blur-xl px-4 z-20">
        <div className="flex items-center gap-3">
          <Link
            href={id ? `/dashboard?project=${id}` : '/dashboard'}
            aria-label="Kembali ke workspace dashboard"
            className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-xs font-medium text-foreground transition-all duration-100 ease-out hover:bg-white/[0.08] hover:border-white/[0.15] active:scale-[0.98]"
          >
            <ArrowLeft className="h-3.5 w-3.5 text-primary" />
            <span className="hidden sm:inline font-semibold">Dashboard</span>
          </Link>

          <div className="hidden h-4 w-px bg-white/[0.1] sm:block" />

          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground shadow-sm">
              <Building2 className="h-3.5 w-3.5" />
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold tracking-tight text-foreground sm:text-sm">
                Software House Virtual Office
              </span>
              <span className="hidden items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-0.5 text-[11px] font-medium text-foreground md:inline-flex">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                CEO &amp; 6 Divisi Siaga
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {projects.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="hidden text-[11px] text-muted-foreground lg:inline font-medium">Proyek:</span>
              <select
                value={id ?? ''}
                onChange={(e) => setId(e.target.value || null)}
                aria-label="Pilih Proyek"
                className="h-8 rounded-md border border-white/[0.1] bg-[#121826] px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowSchemeModal(true)}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.03] px-2.5 text-xs font-medium text-foreground transition-all duration-100 ease-out hover:bg-white/[0.08] hover:border-white/[0.15] active:scale-[0.98]"
            title="Lihat Skema Alur Kerja & Arsitektur Kantor Software House AI"
          >
            <Workflow className="h-3.5 w-3.5 text-primary" />
            <span className="hidden lg:inline">Skema Kantor</span>
          </button>

          <button
            type="button"
            onClick={() => setShowDivisionModal(true)}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.03] px-2.5 text-xs font-medium text-foreground transition-all duration-100 ease-out hover:bg-white/[0.08] hover:border-white/[0.15] active:scale-[0.98]"
            title="Pilih & Konfigurasi Agen VPS untuk masing-masing Divisi Kantor"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
            <span className="hidden sm:inline">Pilih Agen VPS</span>
          </button>

          <button
            type="button"
            onClick={() => setShowSettingsModal(true)}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.03] px-2.5 text-xs font-medium text-foreground transition-all duration-100 ease-out hover:bg-white/[0.08] hover:border-white/[0.15] active:scale-[0.98]"
            title="Buka Pengaturan Pabrik & Integrasi Sistem (AI, VPS, GitHub)"
          >
            <Settings className="h-3.5 w-3.5 text-primary" />
            <span className="hidden sm:inline">Pengaturan</span>
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="inline-flex h-8 items-center gap-1 rounded-md border border-white/[0.08] bg-white/[0.03] px-2.5 text-xs font-medium text-foreground transition-all duration-100 ease-out hover:bg-white/[0.08] hover:border-white/[0.15] active:scale-[0.98]"
            title={isFullscreen ? 'Keluar dari layar penuh' : 'Masuk mode layar penuh (F11)'}
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{isFullscreen ? 'Keluar Fullscreen' : 'Layar Penuh'}</span>
          </button>

          <a
            href={`/virtual-office/index.html?project=${id ?? ''}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-8 items-center gap-1 rounded-md border border-white/[0.08] bg-white/[0.03] px-2.5 text-xs font-medium text-muted-foreground transition-all duration-100 ease-out hover:bg-white/[0.08] hover:border-white/[0.15] hover:text-foreground active:scale-[0.98]"
            title="Buka Virtual Office di Tab Baru (Layar Penuh Mandiri)"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Tab Penuh</span>
          </a>

          <a
            href="https://43.156.236.102:8444/?profile=default"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden xl:inline-flex h-8 items-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.03] px-2.5 text-xs font-medium text-foreground transition-all duration-100 ease-out hover:bg-white/[0.08] hover:border-white/[0.15] active:scale-[0.98]"
            title="Buka Hermes Agent VPS Dashboard Langsung (Port 8444)"
          >
            <span>Hermes VPS</span>
            <ExternalLink className="h-3 w-3 opacity-70" />
          </a>

          <button
            type="button"
            onClick={() => setShowDrawer((v) => !v)}
            className={`inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-all duration-100 ease-out active:scale-[0.98] ${
              showDrawer
                ? 'border-primary bg-primary text-primary-foreground font-semibold shadow-sm'
                : 'border-white/[0.08] bg-white/[0.03] text-foreground hover:bg-white/[0.08] hover:border-white/[0.15]'
            }`}
            title="Buka atau tutup panel status tim dan log alur kerja"
          >
            <Terminal className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{showDrawer ? 'Tutup Panel' : 'Info & Log'}</span>
          </button>

          <Link
            href={id ? `/dashboard?project=${id}` : '/dashboard'}
            className="hidden h-8 items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2.5 text-xs font-semibold text-foreground transition-all duration-100 ease-out hover:bg-primary/20 active:scale-[0.98] xl:inline-flex"
            title="Buka Workspace Proyek"
          >
            <FolderGit2 className="h-3.5 w-3.5 text-primary" />
            <span>Workspace</span>
          </Link>
        </div>
      </header>

      {/* Fullscreen Virtual Office Iframe */}
      <main className="relative flex-1 w-full overflow-hidden bg-[#070b13]">
        <iframe
          key={iframeKey}
          src={`/virtual-office/index.html?project=${id ?? ''}`}
          title="Software House Virtual Office — 2D Engine"
          className="absolute inset-0 h-full w-full border-0"
          allow="fullscreen"
        />

        {/* Floating Slide-over Info & Logs Drawer */}
        {showDrawer && (
          <aside className="absolute right-0 top-0 bottom-0 z-30 flex w-[460px] max-w-[95vw] flex-col border-l border-border bg-card p-3 shadow-md overflow-y-auto">
            <div className="mb-3 flex items-center justify-between border-b border-border pb-2.5">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold text-foreground">Status Tim & Log Alur Kerja</span>
              </div>
              <button
                type="button"
                onClick={() => setShowDrawer(false)}
                className="rounded-sm p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                aria-label="Tutup panel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* CEO Executive Card */}
            <div className="mb-3 rounded-sm border border-primary/50 bg-primary/5 p-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-sm bg-primary text-xs font-bold text-primary-foreground">
                    K
                  </span>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-foreground">kiky</span>
                      <span className="rounded-sm border border-primary/40 bg-primary/20 px-1 py-0.5 text-[9px] font-semibold text-primary">
                        CEO
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      Chief Executive Officer · Boss Desk (Sentral)
                    </div>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] text-primary font-medium">
                  <span className="inline-block h-1.5 w-1.5 rounded-sm bg-primary" />
                  Mengawasi Kantor
                </span>
              </div>
            </div>

            <div className="mb-3 rounded-sm border border-border bg-background p-2.5">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-foreground">
                  6 Spesialis Kantor & Konfigurasi Agen VPS
                </span>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowSchemeModal(true)}
                    className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground transition-colors hover:text-primary"
                  >
                    <Workflow className="h-3 w-3 text-primary" />
                    <span>Skema Kantor</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDivisionModal(true)}
                    className="inline-flex items-center gap-1 text-[10px] font-medium text-primary transition-colors hover:underline"
                  >
                    <SlidersHorizontal className="h-3 w-3" />
                    <span>Ubah Agen Divisi</span>
                  </button>
                </div>
              </div>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {ROLE_ORDER.map((role) => {
                  const cast = CAST[role];
                  const detail = ROLE_DETAILS[role];
                  const conf = divisions[role];
                  const st = activity[role] ?? 'idle';
                  const badge = STATE_BADGES[st];
                  return (
                    <div
                      key={role}
                      className={`rounded-sm border p-2 text-[11px] transition-colors ${
                        st !== 'idle' ? 'border-primary bg-primary/10' : 'border-border bg-card'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-foreground">{conf?.agentName || cast.name}</span>
                        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                          <span className={`inline-block h-1.5 w-1.5 rounded-sm ${badge.dot}`} />
                          {badge.label}
                        </span>
                      </div>
                      <div className="mt-0.5 font-medium text-foreground">{detail.title}</div>
                      <div className="text-[10px] text-muted-foreground">{detail.dept}</div>
                      <div className="mt-1 flex items-center justify-between border-t border-border/60 pt-1 text-[10px]">
                        <span className="text-primary font-medium">
                          {conf?.source === 'hermes-vps'
                            ? 'Hermes :8444'
                            : conf?.source === 'router9-vps'
                            ? '9Router :8443'
                            : conf?.source === 'custom-vps'
                            ? 'Custom VPS'
                            : 'Native'}
                        </span>
                        <span className="truncate max-w-[96px] text-muted-foreground">
                          {conf?.modelOrProfile || 'active'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-1 flex-col min-h-[300px]">
              <LiveNotebook logs={state?.logs ?? []} running={running} />
            </div>
          </aside>
        )}
      </main>

      {/* Division VPS Agent Configuration Modal */}
      <DivisionAgentModal
        isOpen={showDivisionModal}
        onClose={() => setShowDivisionModal(false)}
        onSaved={handleSavedDivisions}
      />

      {/* Software House Architecture & Workflow Scheme Modal */}
      <SoftwareHouseSchemeModal
        isOpen={showSchemeModal}
        onClose={() => setShowSchemeModal(false)}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />
    </div>
  );
}

export default function OfficePage() {
  return (
    <Suspense fallback={<p className="p-8 text-sm text-muted-foreground">Memuat Software House Virtual Office…</p>}>
      <SoftwareHouseOffice />
    </Suspense>
  );
}
