'use client';

import { useState } from 'react';
import { Archive, Check, Copy, Download, History, RotateCcw, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/use-project';
import type { ProjectVersion } from '@/types';

/** Step 8: final export (.zip) and Version History. */
export default function ExportPanel({
  projectId,
  versions,
  fileCount,
  busy,
  onChanged,
}: {
  projectId: string;
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
        </div>

        <Button asChild={fileCount > 0} disabled={!fileCount}>
          {fileCount > 0 ? (
            <a href={`/api/projects/${projectId}/export`}>
              <Download className="mr-1.5 h-4 w-4" /> Unduh .zip ({fileCount} file)
            </a>
          ) : (
            <span>Belum ada file</span>
          )}
        </Button>
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
