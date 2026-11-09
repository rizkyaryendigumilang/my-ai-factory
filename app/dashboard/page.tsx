'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Building2, Check, Copy, ExternalLink, Plus, SlidersHorizontal, Trash2 } from 'lucide-react';
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
import DivisionAgentModal from '../office/components/DivisionAgentModal';

const TABS = [
  ['setup', 'Spesifikasi & Setup'],
  ['monitor', 'Lantai Produksi'],
  ['docs', 'Dokumen & Diagram'],
  ['code', 'Direktori Kode'],
  ['preview', 'Sandbox & Edit Visual'],
  ['export', 'Ekspor & Versi'],
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
  const { state, error, loading, refresh } = useProjectState(activeId);

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
    <div className="flex h-screen flex-col">
      <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] bg-card/80 backdrop-blur-md backdrop-saturate-150 supports-[backdrop-filter]:bg-card/65 px-4 py-2.5">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="flex h-7 w-7 items-center justify-center rounded-sm bg-primary text-xs font-bold text-primary-foreground">AF</span>
            My AI Factory
          </Link>
          {projects.length > 0 && (
            <select
              aria-label="Pilih proyek"
              value={activeId ?? ''}
              onChange={(e) => e.target.value && router.push(`/dashboard?project=${e.target.value}`)}
              className="h-8 max-w-[180px] rounded-sm border border-input bg-background px-2 text-xs md:hidden"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.title} ({STATUS[p.status].label})</option>
              ))}
            </select>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {health && (
            <>
              <span className="hidden rounded-sm border border-border bg-background px-2 py-1 sm:inline">
                Engine: {health.ai === 'gemini' ? 'Gemini' : 'Demo Offline'}
              </span>
              <span className="hidden rounded-sm border border-border bg-background px-2 py-1 sm:inline">
                Store: {health.store === 'pocketbase' ? 'PocketBase' : 'Local JSON'}
              </span>
              <span className="rounded-sm border border-border bg-background px-2 py-1">
                Paket: {health.plan === 'pro' ? 'Pro' : 'Free'}
              </span>
            </>
          )}
          <Button asChild size="sm" variant="outline">
            <Link
              href={activeId ? `/office?project=${activeId}` : '/office'}
              className="inline-flex items-center gap-1.5"
              title="Buka Virtual Office Layar Penuh"
            >
              <Building2 className="h-3.5 w-3.5 text-primary" />
              <span className="hidden sm:inline">Virtual Office Full Screen</span>
            </Link>
          </Button>
          <button
            type="button"
            onClick={() => setShowDivisionModal(true)}
            className="hidden items-center gap-1.5 rounded-sm border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-foreground md:inline-flex active:scale-[0.98]"
            title="Pilih & Konfigurasi Agen VPS untuk masing-masing Divisi Kantor"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
            <span>Pilih Agen VPS</span>
          </button>
          <a
            href="https://43.156.236.102:8444/?profile=default"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden items-center gap-1 rounded-sm border border-border bg-background px-2 py-1 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-foreground md:inline-flex"
            title="Buka Hermes Agent VPS Dashboard Langsung (Port 8444)"
          >
            <span>Hermes VPS</span>
            <ExternalLink className="h-3 w-3 opacity-60" />
          </a>
          <Button asChild size="sm">
            <Link href="/"><Plus className="mr-1 h-4 w-4" /> Proyek Baru</Link>
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card/60 md:flex">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5 text-xs text-muted-foreground">
            <span className="font-semibold">Daftar Proyek</span>
            <span>{projects.length}</span>
          </div>
          <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
            {projects.length === 0 && listLoaded && (
              <li className="px-2 py-6 text-center text-sm text-muted-foreground">Belum ada proyek.</li>
            )}
            {projects.map((p) => (
              <li key={p.id} className="group relative">
                <Link
                  href={`/dashboard?project=${p.id}`}
                  className={`block rounded-sm border px-3 py-2 pr-14 text-sm transition-colors ${
                    p.id === activeId ? 'border-primary bg-primary/10 text-foreground' : 'border-transparent hover:border-border hover:bg-secondary'
                  }`}
                >
                  <span className="block truncate font-medium">{p.title}</span>
                  <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className={`inline-block h-1.5 w-1.5 rounded-sm ${STATUS[p.status].dot}`} />
                    {STATUS[p.status].label}
                  </span>
                </Link>
                {confirmDeleteId === p.id ? (
                  <button
                    type="button"
                    onClick={() => remove(p)}
                    className="absolute right-1.5 top-2 rounded-sm bg-destructive px-2 py-1 text-[11px] font-semibold text-destructive-foreground"
                  >
                    Hapus?
                  </button>
                ) : (
                  <button
                    type="button"
                    aria-label={`Hapus ${p.title}`}
                    onClick={() => setConfirmDeleteId(p.id)}
                    className="absolute right-2 top-2.5 rounded-sm p-1 text-muted-foreground opacity-0 hover:bg-secondary hover:text-foreground focus:opacity-100 group-hover:opacity-100"
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
              <div className="border-b border-border bg-card/40 px-4 pt-3">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <h1 className="truncate text-2xl font-bold tracking-tight">{state.project.title}</h1>
                    <span className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-secondary px-2 py-0.5 text-xs font-medium text-foreground">
                      <span className={`inline-block h-2 w-2 rounded-sm ${STATUS[state.project.status].dot}`} />
                      {STATUS[state.project.status].label}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(state.project.id);
                        setCopiedId(true);
                        setTimeout(() => setCopiedId(false), 1500);
                      }}
                      className="inline-flex items-center gap-1 rounded-sm border border-border/80 bg-background px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                      title="Salin ID Proyek"
                    >
                      {copiedId ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                      <span>{copiedId ? 'Disalin' : `#${state.project.id.slice(0, 8)}`}</span>
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

                <nav className="-mb-px flex w-full gap-1 overflow-x-auto" aria-label="Tahap proyek">
                  {TABS.map(([k, label], idx) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setTab(k)}
                      aria-current={tab === k ? 'page' : undefined}
                      className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm transition-colors ${
                        tab === k ? 'border-primary font-semibold text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <span>{label}</span>
                      <kbd className="ml-1.5 hidden rounded border border-border/80 px-1 py-0.5 text-[10px] opacity-60 sm:inline-block">
                        {idx + 1}
                      </kbd>
                    </button>
                  ))}
                </nav>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-4">
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
                    <LiveNotebook logs={state.logs} running={running} />
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
                            className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:border-primary active:scale-[0.98]"
                            title="Pilih & Konfigurasi Agen VPS untuk masing-masing Divisi Kantor"
                          >
                            <SlidersHorizontal className="h-3 w-3 text-primary" />
                            <span>Pilih Agen VPS</span>
                          </button>
                          <Link
                            href={`/office?project=${state.project.id}`}
                            className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:border-primary active:scale-[0.98]"
                            title="Buka Virtual Office Layar Penuh"
                          >
                            <span>Layar Penuh</span>
                          </Link>
                          <a
                            href={`/virtual-office/index.html?project=${state.project.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-sm border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-foreground active:scale-[0.98]"
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
                {tab === 'preview' && <VisualEditor projectId={state.project.id} files={state.files} busy={running} onChanged={refresh} />}
                {tab === 'export' && (
                  <ExportPanel
                    projectId={state.project.id}
                    versions={state.versions}
                    fileCount={state.files.length}
                    busy={running}
                    onChanged={refresh}
                  />
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
