'use client';

import { useState } from 'react';
import { Archive, Check, Clock, Copy, Download, ExternalLink, FolderGit2, History, RotateCcw, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogHeader, DialogFooter } from '@/components/ui/dialog';
import { api } from '@/lib/use-project';
import type { Project, ProjectVersion } from '@/types';

/** Step 8: final export (.zip) and Version History. */
export default function ExportPanel({
  projectId,
  project,
  versions,
  fileCount,
  busy,
  onChanged,
}: {
  projectId: string;
  project?: Project;
  versions: ProjectVersion[];
  fileCount: number;
  busy: boolean;
  onChanged: () => void;
}) {
  const [label, setLabel] = useState('');
  const [working, setWorking] = useState(false);
  const [confirmRestoreId, setConfirmRestoreId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState(false);

  const [showGithubModal, setShowGithubModal] = useState(false);
  const [ghToken, setGhToken] = useState('');
  const [ghRepo, setGhRepo] = useState('');
  const [ghPrivate, setGhPrivate] = useState(false);
  const [ghLoading, setGhLoading] = useState(false);
  const [ghError, setGhError] = useState('');
  const [ghSuccess, setGhSuccess] = useState<{ url: string; repo: string } | null>(null);

  const pushToGithub = async (e: React.FormEvent) => {
    e.preventDefault();
    setGhLoading(true);
    setGhError('');
    setGhSuccess(null);
    try {
      const res = await api(`/api/projects/${projectId}/github`, {
        method: 'POST',
        body: JSON.stringify({
          token: ghToken,
          repoName: ghRepo || undefined,
          isPrivate: ghPrivate,
        }),
      });
      setGhSuccess({ url: res.url, repo: res.repo });
    } catch (err: any) {
      setGhError(err.message || 'Gagal export ke GitHub');
    } finally {
      setGhLoading(false);
    }
  };

  const run = async (fn: () => Promise<unknown>) => {
    setWorking(true);
    setError('');
    try {
      await fn();
      onChanged();
    } catch (e: any) {
      setError(e.message || 'Operasi gagal.');
    } finally {
      setWorking(false);
      setConfirmRestoreId(null);
    }
  };

  const copyProjectId = () => {
    navigator.clipboard.writeText(projectId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 1500);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-md border border-border bg-card p-4">
        <h2 className="mb-1 flex items-center gap-2 text-xl font-bold tracking-tight"><Archive className="h-4 w-4 text-primary" /> Ekspor proyek</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Arsip .zip berisi seluruh direktori kode Next.js 15 dan folder <code>docs/</code> (PRD markdown, diagram .drawio/.mmd, tech stack, QA plan).
        </p>

        {project?.files_expired ? (
          <div className="mb-4 rounded-md border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-600 dark:text-amber-400">
            <div className="flex items-center gap-2 font-semibold">
              <Clock className="h-4 w-4 shrink-0" />
              <span>File Temporary VPS Telah Kedaluwarsa (&gt;5 Jam Belum Diunduh)</span>
            </div>
            <p className="mt-1.5 text-muted-foreground leading-relaxed">
              Demi menjaga kebersihan dan kapasitas disk VPS, file kode hasil kompilasi otomatis dibersihkan jika tidak diunduh dalam 5 jam. Dokumen spesifikasi dan PRD tetap tersimpan aman. Silakan klik tab <strong>Spesifikasi &amp; Setup</strong> untuk melakukan regenerasi kode kapan saja.
            </p>
          </div>
        ) : fileCount > 0 ? (
          <div className="mb-4 rounded-md border border-sky-500/30 bg-sky-500/10 p-3 text-xs text-sky-800 dark:text-sky-300">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-medium">
                <Clock className="h-3.5 w-3.5 shrink-0" /> Penyimpanan Temporary VPS:
              </span>
              <span className="font-semibold">{project?.downloaded ? 'Sudah Diunduh' : 'Maks. 5 Jam'}</span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {project?.downloaded
                ? `Berkas telah diunduh (${project.downloaded_at ? new Date(project.downloaded_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : 'Ya'}). File tetap aman.`
                : 'File hasil kompilasi di VPS bersifat temporary dan akan otomatis dihapus jika tidak diunduh dalam 5 jam.'}
            </p>
          </div>
        ) : null}

        <div className="mb-4 rounded-sm border border-border bg-background p-3 text-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">ID Proyek:</span>
            <button
              type="button"
              onClick={copyProjectId}
              className="inline-flex items-center gap-1 text-foreground hover:text-primary transition-colors"
            >
              {projectId} {copiedId ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Jumlah file siap unduh:</span>
            <span className="font-semibold tabular-nums">{fileCount} file</span>
          </div>
          {project?.downloaded && (
            <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
              <span className="flex items-center gap-1"><Check className="h-3 w-3" /> Status Unduhan:</span>
              <span>Telah diunduh</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild={fileCount > 0} disabled={!fileCount}>
            {fileCount > 0 ? (
              <a href={`/api/projects/${projectId}/export`}>
                <Download className="mr-1.5 h-4 w-4" /> Unduh .zip ({fileCount} file)
              </a>
            ) : (
              <span>Belum ada file</span>
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            disabled={!fileCount || busy}
            onClick={() => setShowGithubModal(true)}
          >
            <FolderGit2 className="mr-1.5 h-4 w-4 text-primary" /> Push ke GitHub
          </Button>
        </div>

        <Dialog isOpen={showGithubModal} onClose={() => setShowGithubModal(false)} maxWidth="max-w-md">
          <DialogHeader
            title="Push Proyek ke GitHub"
            description="Buat repositori baru di akun GitHub Anda dan commit seluruh kode Next.js & dokumen arsitektur."
            icon={<FolderGit2 className="h-4 w-4" />}
            onClose={() => setShowGithubModal(false)}
          />
          <form onSubmit={pushToGithub} className="p-5 space-y-4 text-sm">
            {ghSuccess ? (
              <div className="rounded-md border border-primary/30 bg-primary/10 p-4 space-y-2 text-center">
                <Check className="h-6 w-6 text-primary mx-auto" />
                <p className="font-semibold text-foreground">Repositori Berhasil Dibuat!</p>
                <p className="text-xs text-muted-foreground">{ghSuccess.repo}</p>
                <a
                  href={ghSuccess.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-sm bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 mt-2"
                >
                  <span>Buka di GitHub</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            ) : (
              <>
                <div>
                  <label className="block mb-1 text-xs font-medium text-foreground">
                    GitHub Personal Access Token (classic atau fine-grained dengan izin repo)
                  </label>
                  <input
                    type="password"
                    value={ghToken}
                    onChange={(e) => setGhToken(e.target.value)}
                    placeholder="Kosongkan jika sudah diatur di Menu Pengaturan, atau masukkan token baru..."
                    className="w-full h-9 rounded-sm border border-input bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary font-mono"
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Token otomatis diambil dari Menu Pengaturan jika tidak diisi di sini.
                  </p>
                </div>

                <div>
                  <label className="block mb-1 text-xs font-medium text-foreground">
                    Nama Repositori (opsional)
                  </label>
                  <input
                    type="text"
                    value={ghRepo}
                    onChange={(e) => setGhRepo(e.target.value)}
                    placeholder="my-awesome-app"
                    className="w-full h-9 rounded-sm border border-input bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="gh-private"
                    checked={ghPrivate}
                    onChange={(e) => setGhPrivate(e.target.checked)}
                    className="rounded border-input text-primary focus:ring-primary"
                  />
                  <label htmlFor="gh-private" className="text-xs text-foreground">
                    Jadikan Repositori Private
                  </label>
                </div>

                {ghError && <p className="text-xs text-destructive">{ghError}</p>}
              </>
            )}

            <DialogFooter className="px-0 pt-3 pb-0 border-t">
              <button
                type="button"
                onClick={() => setShowGithubModal(false)}
                className="rounded-sm border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                {ghSuccess ? 'Selesai' : 'Batal'}
              </button>
              {!ghSuccess && (
                <Button type="submit" disabled={ghLoading}>
                  {ghLoading ? 'Membuat Repositori…' : 'Push Sekarang'}
                </Button>
              )}
            </DialogFooter>
          </form>
        </Dialog>
      </section>

      <section className="rounded-md border border-border bg-card p-4">
        <h2 className="mb-1 flex items-center gap-2 text-xl font-bold tracking-tight"><History className="h-4 w-4 text-primary" /> Riwayat Versi</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Snapshot otomatis disimpan sebelum regenerasi kode, pemulihan, dan edit visual.
        </p>
        {error && <p role="alert" className="mb-2 text-xs text-destructive">{error}</p>}
        <form
          className="mb-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => { await api(`/api/projects/${projectId}/versions`, { method: 'POST', body: JSON.stringify({ label: label.trim() || undefined }) }); setLabel(''); });
          }}
        >
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label versi (opsional)" maxLength={100} className="h-10 flex-1 rounded-sm border border-input bg-background px-3 text-sm" />
          <Button type="submit" variant="outline" disabled={working || busy || !fileCount}><Save className="mr-1 h-4 w-4" /> Simpan</Button>
        </form>
        {versions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada versi tersimpan.</p>
        ) : (
          <ul className="divide-y divide-border">
            {versions.map((v, idx) => (
              <li key={v.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium">{v.label}</p>
                    {idx === 0 && (
                      <span className="rounded-sm border border-primary/40 bg-primary/10 px-1 text-[10px] text-primary font-medium">
                        Terkini
                      </span>
                    )}
                  </div>
                  <p className="tabular-nums text-xs text-muted-foreground">{new Date(v.created).toLocaleString('id-ID')} · {v.file_count} file · {v.doc_count} dokumen</p>
                </div>
                {confirmRestoreId === v.id ? (
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      size="sm" variant="destructive" className="h-7 px-2 text-xs" disabled={working || busy}
                      onClick={() => run(() => api(`/api/projects/${projectId}/versions`, { method: 'POST', body: JSON.stringify({ restore: v.id }) }))}
                    >
                      Ya, pulihkan
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setConfirmRestoreId(null)}>
                      Batal
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm" variant="ghost" disabled={working || busy}
                    onClick={() => setConfirmRestoreId(v.id)}
                  >
                    <RotateCcw className="mr-1 h-3.5 w-3.5" /> Pulihkan
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
