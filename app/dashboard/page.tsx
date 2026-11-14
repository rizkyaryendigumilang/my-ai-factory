'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Building2, Check, Copy, ExternalLink, Plus, Rocket, Settings, ShieldCheck, SlidersHorizontal, Trash2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { officeActivity } from '@/lib/activity';
import { api, useProjectState } from '@/lib/use-project';
import type { Project } from '@/types';
import CodeExplorer from './components/CodeExplorer';
import DocumentViewer from './components/DocumentViewer';
import ExportPanel from './components/ExportPanel';
import LiveNotebook from './components/LiveNotebook';
import VirtualOffice from './components/VirtualOffice';
import ProjectSetup from './components/ProjectSetup';
import VisualEditor from './components/VisualEditor';
import MarketingKitPanel from './components/MarketingKitPanel';
import DivisionAgentModal from '../office/components/DivisionAgentModal';
import SettingsModal from '@/components/SettingsModal';
import WarRoomModal from '@/components/WarRoomModal';

const TABS = [
  ['setup', 'Spesifikasi & Setup'],
  ['monitor', 'Lantai Produksi'],
  ['docs', 'Dokumen & Diagram'],
  ['code', 'Direktori Kode'],
  ['preview', 'Sandbox & Edit Visual'],
  ['export', 'Ekspor & Versi'],
  ['launch', 'Marketing & Launch Kit'],
] as const;
type Tab = (typeof TABS)[number][0];

const STATUS: Record<Project['status'], { label: string; dot: string }> = {
  draft: { label: 'Draft', dot: 'bg-muted-foreground' },
  running: { label: 'Merakit', dot: 'bg-primary' },
  completed: { label: 'Selesai', dot: 'bg-emerald-400' },
  failed: { label: 'Terhenti', dot: 'bg-destructive' },
};

function Workspace() {
  const router = useRouter();
  const activeId = useSearchParams().get('project');

  const [projects, setProjects] = useState<Project[]>([]);
  const [listLoaded, setListLoaded] = useState(false);
  const [health, setHealth] = useState<{ store: string; ai: string; plan: string } | null>(null);
  const [tab, setTab] = useState<Tab>('setup');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [showDivisionModal, setShowDivisionModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showWarRoom, setShowWarRoom] = useState(false);
  const [stepLoading, setStepLoading] = useState(false);
  const { state, error, loading, refresh } = useProjectState(activeId);

  const handleApproveGate = async (autoPilot = false) => {
    if (!activeId) return;
    setStepLoading(true);
    setActionError(null);
    try {
      await api(`/api/projects/${activeId}/step`, {
        method: 'POST',
        body: JSON.stringify({ autoPilot }),
      });
      refresh();
      setTab('monitor');
    } catch (e: any) {
      setActionError(e.message || 'Gagal menyetujui gate');
    } finally {
      setStepLoading(false);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'Escape') {
        setConfirmDeleteId(null);
        return;
      }
      const num = Number(e.key);
      if (num >= 1 && num <= TABS.length) {
        e.preventDefault();
        setTab(TABS[num - 1][0]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const loadList = useCallback(async () => {
    try {
      setProjects((await api<{ projects: Project[] }>('/api/projects')).projects);
    } finally {
      setListLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadList().catch(() => setListLoaded(true));
    api('/api/health').then(setHealth).catch(() => {});
  }, [loadList]);

  useEffect(() => {
    if (listLoaded && !activeId && projects[0]) router.replace(`/dashboard?project=${projects[0].id}`);
  }, [listLoaded, activeId, projects, router]);

  const status = state?.project.status;
  useEffect(() => {
    setTab('setup');
    setConfirmDeleteId(null);
    setActionError(null);
  }, [activeId]);

  useEffect(() => {
    if (status === 'running') setTab('monitor');
    if (status === 'completed') loadList().catch(() => {});
  }, [status, loadList]);

  const activity = useMemo(() => officeActivity(state?.logs ?? []), [state?.logs]);
  const running = status === 'running';

  const remove = async (p: Project) => {
    setActionError(null);
    try {
      await api(`/api/projects/${p.id}`, { method: 'DELETE' });
      const rest = projects.filter((x) => x.id !== p.id);
      setProjects(rest);
      setConfirmDeleteId(null);
      if (p.id === activeId) router.replace(rest[0] ? `/dashboard?project=${rest[0].id}` : '/dashboard');
    } catch (e: any) {
      setActionError(e.message);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-background text-foreground antialiased selection:bg-primary/25 selection:text-foreground">
      <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] bg-[#080B11]/85 backdrop-blur-xl px-4 py-2.5">
        <div className="flex items-center gap-3.5">
          <Link href="/ai-factory" className="flex items-center gap-2.5 font-semibold group cursor-pointer">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground shadow-sm transition-transform duration-100 ease-out group-hover:scale-105 active:scale-95">
              AF
            </span>
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight text-foreground leading-none">My AI Factory</span>
              <span className="text-[10px] font-medium text-muted-foreground tracking-wider uppercase mt-0.5">Software House</span>
            </div>
          </Link>
          {projects.length > 0 && (
            <select
              aria-label="Pilih proyek"
              value={activeId ?? ''}
              onChange={(e) => e.target.value && router.push(`/dashboard?project=${e.target.value}`)}
              className="h-8 max-w-[190px] rounded-md border border-white/[0.1] bg-card px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary md:hidden"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.title} ({STATUS[p.status].label})</option>
              ))}
            </select>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {health && (
            <div className="hidden lg:flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-[11px] font-medium text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>{health.ai === 'gemini' ? 'Gemini AI' : 'Demo'}</span>
              </span>
              <span className="text-white/20">·</span>
              <span>{health.store === 'pocketbase' ? 'PocketBase' : 'Local'}</span>
              <span className="text-white/20">·</span>
              <span className="text-primary font-semibold">{health.plan === 'pro' ? 'Pro' : 'Free'}</span>
            </div>
          )}
          <Button asChild size="sm" variant="outline" className="h-8">
            <Link
              href={activeId ? `/office?project=${activeId}` : '/office'}
              className="inline-flex items-center gap-1.5"
              title="Buka Virtual Office Layar Penuh"
            >
              <Building2 className="h-3.5 w-3.5 text-primary" />
              <span className="hidden sm:inline">Virtual Office</span>
            </Link>
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setShowWarRoom(true)}
            className="hidden md:inline-flex h-8 items-center gap-1.5 border-amber-500/30 text-amber-300 hover:bg-amber-500/10"
            title="Panggil Rapat Darurat Meja Bundar ke-6 Spesialis AI (War Room)"
          >
            <Users className="h-3.5 w-3.5 text-amber-400" />
            <span>War Room</span>
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setShowDivisionModal(true)}
            className="hidden md:inline-flex h-8 items-center gap-1.5"
            title="Pilih & Konfigurasi Agen VPS untuk masing-masing Divisi Kantor"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
            <span>Pilih Agen VPS</span>
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setShowSettingsModal(true)}
            className="inline-flex h-8 items-center gap-1.5"
            title="Buka Pengaturan Pabrik & Integrasi Sistem (AI, VPS, GitHub)"
          >
            <Settings className="h-3.5 w-3.5 text-primary" />
            <span className="hidden sm:inline">Pengaturan</span>
          </Button>
          <Button asChild size="sm" variant="outline" className="hidden lg:inline-flex h-8">
            <a
              href="https://43.156.236.102:8444/?profile=default"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1"
              title="Buka Hermes Agent VPS Dashboard Langsung (Port 8444)"
            >
              <span>Hermes VPS</span>
              <ExternalLink className="h-3 w-3 opacity-60" />
            </a>
          </Button>
          <Button asChild size="sm" className="h-8">
            <Link href="/"><Plus className="mr-1 h-3.5 w-3.5" /> Proyek Baru</Link>
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-white/[0.07] bg-[#0B0F19]/70 backdrop-blur-md md:flex">
          <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-2.5 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground tracking-tight">Daftar Proyek</span>
            <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] font-medium">{projects.length}</span>
          </div>
          <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
            {projects.length === 0 && listLoaded && (
              <li className="px-2 py-6 text-center text-xs text-muted-foreground">Belum ada proyek.</li>
            )}
            {projects.map((p) => (
              <li key={p.id} className="group relative">
                <Link
                  href={`/dashboard?project=${p.id}`}
                  className={`block rounded-lg border px-3 py-2 pr-12 text-sm transition-all duration-150 ${
                    p.id === activeId
                      ? 'border-primary/40 bg-primary/10 text-foreground font-medium shadow-sm'
                      : 'border-transparent text-muted-foreground hover:border-white/[0.06] hover:bg-white/[0.04] hover:text-foreground'
                  }`}
                >
                  <span className="block truncate font-medium text-xs text-foreground leading-snug">{p.title}</span>
                  <span className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className={`inline-block h-1.5 w-1.5 rounded-full ${STATUS[p.status].dot}`} />
                    {STATUS[p.status].label}
                  </span>
                </Link>
                {confirmDeleteId === p.id ? (
                  <button
                    type="button"
                    onClick={() => remove(p)}
                    className="absolute right-1.5 top-2 rounded-md bg-destructive px-2 py-1 text-[11px] font-semibold text-destructive-foreground transition-transform active:scale-95"
                  >
                    Hapus?
                  </button>
                ) : (
                  <button
                    type="button"
                    aria-label={`Hapus ${p.title}`}
                    onClick={() => setConfirmDeleteId(p.id)}
                    className="absolute right-2 top-2 rounded-md p-1.5 text-muted-foreground opacity-0 hover:bg-white/[0.08] hover:text-foreground focus:opacity-100 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          {actionError && (
            <div role="alert" className="border-b border-border bg-secondary px-4 py-2 text-xs text-destructive">{actionError}</div>
          )}

          {!activeId ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center text-sm text-muted-foreground">
              {listLoaded ? (
                <>
                  <p>Belum ada proyek yang dipilih. Mulai dari spesifikasi baru.</p>
                  <Button asChild><Link href="/">Buat Proyek Baru</Link></Button>
                </>
              ) : (
                'Memuat ruang kerja…'
              )}
            </div>
          ) : error && !state ? (
            <p className="p-8 text-center text-sm text-destructive">{error}</p>
          ) : !state ? (
            <p className="p-8 text-center text-sm text-muted-foreground">{loading ? 'Memuat proyek…' : ''}</p>
          ) : (
            <>
              <div className="border-b border-white/[0.07] bg-[#0B0F19]/60 px-5 pt-4 pb-3 backdrop-blur-md">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <h1 className="truncate text-xl font-bold tracking-tight text-foreground">{state.project.title}</h1>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-0.5 text-xs font-medium text-foreground">
                      <span className={`inline-block h-1.5 w-1.5 rounded-full ${STATUS[state.project.status].dot}`} />
                      {STATUS[state.project.status].label}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(state.project.id);
                        setCopiedId(true);
                        setTimeout(() => setCopiedId(false), 1500);
                      }}
                      className="inline-flex items-center gap-1 rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-xs text-muted-foreground transition-all hover:bg-white/[0.07] hover:text-foreground active:scale-95"
                      title="Salin ID Proyek"
                    >
                      {copiedId ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                      <span className="font-mono text-[11px]">{copiedId ? 'Disalin' : `#${state.project.id.slice(0, 8)}`}</span>
                    </button>
                  </div>
                  <div className="md:hidden">
                    {confirmDeleteId === state.project.id ? (
                      <Button size="sm" variant="destructive" onClick={() => remove(state.project)}>Konfirmasi Hapus</Button>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => setConfirmDeleteId(state.project.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>

                <nav className="flex w-full gap-1 overflow-x-auto p-1 bg-black/35 rounded-lg border border-white/[0.06]" aria-label="Tahap proyek">
                  {TABS.map(([k, label], idx) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setTab(k)}
                      aria-current={tab === k ? 'page' : undefined}
                      className={`flex items-center gap-1.5 whitespace-nowrap rounded-md px-3.5 py-1.5 text-xs font-medium transition-all duration-100 ${
                        tab === k
                          ? 'bg-white/[0.1] text-foreground font-semibold shadow-sm border border-white/[0.08]'
                          : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.04]'
                      }`}
                    >
                      <span>{label}</span>
                      <kbd className="hidden rounded bg-black/40 border border-white/[0.08] px-1 py-0.2 text-[10px] opacity-60 sm:inline-block">
                        {idx + 1}
                      </kbd>
                    </button>
                  ))}
                </nav>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-5 space-y-4">
                {state.project.approval_gate && (
                  <div className="rounded-xl border border-amber-500/35 bg-[#121826] p-4 text-xs shadow-lg flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-lg bg-amber-500/15 border border-amber-500/30 p-2 text-amber-400">
                        <ShieldCheck className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-amber-200 tracking-tight">
                          Otorisasi Kiky Diperlukan: {
                            state.project.approval_gate === 'gate_pm'
                              ? 'Gate 1 — Spesifikasi & User Stories Selesai'
                              : state.project.approval_gate === 'gate_arch'
                              ? 'Gate 2 — Desain Arsitektur & ERD Selesai'
                              : 'Gate 3 — Keamanan OWASP & QA Plan Selesai'
                          }
                        </div>
                        <p className="mt-1 text-muted-foreground text-xs leading-relaxed max-w-2xl">
                          {state.project.approval_gate === 'gate_pm'
                            ? 'Dokumen PRD & BRD siap. Anda dapat memeriksa tab "Dokumen & Diagram" sebelum mengizinkan System Analyst merancang ERD.'
                            : state.project.approval_gate === 'gate_arch'
                            ? 'Diagram UML, ERD, dan DFD siap. Setujui untuk melanjutkan ke audit keamanan OWASP dan QA.'
                            : 'Aturan keamanan dan skenario pengujian siap. Otorisasikan Fullstack Coder untuk merakit berkas kode.'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-8.5 px-3 border-amber-500/40 text-amber-300 hover:bg-amber-500/10"
                        onClick={() => setShowWarRoom(true)}
                        title="Panggil seluruh 6 spesialis AI ke ruang rapat darurat sebelum memutuskan"
                      >
                        <Users className="h-3.5 w-3.5 mr-1 text-amber-400" />
                        Panggil Rapat Sentral
                      </Button>
                      <Button
                        size="sm"
                        disabled={stepLoading}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs h-8.5 px-3.5 shadow-sm"
                        onClick={() => handleApproveGate(false)}
                      >
                        <Check className="h-3.5 w-3.5 mr-1" />
                        Setujui &amp; Lanjut
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={stepLoading}
                        className="text-xs h-8.5 px-3 border-amber-500/40 text-amber-300 hover:bg-amber-500/10"
                        onClick={() => handleApproveGate(true)}
                      >
                        Auto-Pilot Penuh
                      </Button>
                    </div>
                  </div>
                )}
                {tab === 'setup' && (
                  <ProjectSetup
                    project={state.project}
                    running={running}
                    demo={health?.ai === 'demo'}
                    onSaved={() => { refresh(); loadList().catch(() => {}); }}
                    onStarted={() => { setTab('monitor'); refresh(); }}
                  />
                )}
                {tab === 'monitor' && (
                  <div className="grid h-full min-h-[480px] gap-5 lg:grid-cols-2">
                    <LiveNotebook logs={state.logs} running={running} projectId={state.project.id} />
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-border bg-card p-3 text-xs">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-7 w-7 items-center justify-center rounded-sm bg-primary/10 text-primary">
                            <Building2 className="h-4 w-4" />
                          </span>
                          <div>
                            <div className="font-semibold text-foreground">Kantor Software House AI</div>
                            <div className="text-[11px] text-muted-foreground">Koreografi 6 divisi spesialis ala Virtual Office</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setShowDivisionModal(true)}
                            className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground transition-[transform,background-color,border-color,color] duration-100 ease-out hover:border-primary active:scale-[0.97]"
                            title="Pilih & Konfigurasi Agen VPS untuk masing-masing Divisi Kantor"
                          >
                            <SlidersHorizontal className="h-3 w-3 text-primary" />
                            <span>Pilih Agen VPS</span>
                          </button>
                          <Link
                            href={`/office?project=${state.project.id}`}
                            className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground transition-[transform,background-color,border-color,color] duration-100 ease-out hover:border-primary active:scale-[0.97]"
                            title="Buka Virtual Office Layar Penuh"
                          >
                            <span>Layar Penuh</span>
                          </Link>
                          <a
                            href={`/virtual-office/index.html?project=${state.project.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-sm border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground transition-[transform,background-color,border-color,color] duration-100 ease-out hover:border-primary hover:text-foreground active:scale-[0.97]"
                            title="Buka Virtual Office di Tab Baru (Layar Penuh Mandiri)"
                          >
                            <span>Buka Tab Baru</span>
                            <ExternalLink className="h-3 w-3 opacity-70" />
                          </a>
                        </div>
                      </div>
                      <VirtualOffice activity={activity} />
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Stasiun kerja menyala sesuai spesialis yang sedang aktif di kantor software house (PM, UI/UX, Analyst, Security, Scout, Coder). Saat satu tahap selesai, spesialis berjalan ke meja tengah untuk serah-terima artefak ke tahap selanjutnya.
                      </p>
                    </div>
                  </div>
                )}
                {tab === 'docs' && <DocumentViewer projectId={state.project.id} documents={state.documents} onChanged={refresh} />}
                {tab === 'code' && (
                  <CodeExplorer
                    projectId={state.project.id}
                    files={state.files}
                    busy={running}
                    onChanged={() => { refresh(); setTab('monitor'); }}
                  />
                )}
                {tab === 'preview' && (
                  <VisualEditor
                    projectId={state.project.id}
                    project={state.project}
                    files={state.files}
                    busy={running}
                    onChanged={refresh}
                    onSelectFile={() => setTab('code')}
                  />
                )}
                {tab === 'export' && (
                  <ExportPanel
                    projectId={state.project.id}
                    project={state.project}
                    versions={state.versions}
                    fileCount={state.files.length}
                    busy={running}
                    onChanged={refresh}
                  />
                )}
                {tab === 'launch' && (
                  <MarketingKitPanel projectId={state.project.id} />
                )}
              </div>
            </>
          )}
        </main>
      </div>

      <DivisionAgentModal
        isOpen={showDivisionModal}
        onClose={() => setShowDivisionModal(false)}
      />

      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />

      <WarRoomModal
        isOpen={showWarRoom}
        onClose={() => setShowWarRoom(false)}
        projectId={state?.project?.id ?? ''}
        projectTitle={state?.project?.title ?? ''}
      />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<p className="p-8 text-sm text-muted-foreground">Memuat ruang kerja…</p>}>
      <Workspace />
    </Suspense>
  );
}
