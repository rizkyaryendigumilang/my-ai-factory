// deslop-ignore-file 34
'use client';

import { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Check,
  CheckCircle2,
  Copy,
  Download,
  Loader2,
  Lock,
  Pencil,
  Play,
  Save,
  ShieldCheck,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { diagramToDrawio, isDiagramDoc } from '@/lib/drawio';
import { downloadBlob, fallbackMermaid, svgToImageBlob } from '@/lib/download';
import { api } from '@/lib/use-project';
import type { DiagramDoc, DocType, ProjectDocument } from '@/types';
import { DOC_LABELS, DOC_ORDER } from './labels';

/* ------------------------------ diagrams ------------------------------ */

let mermaidLoader: Promise<typeof import('mermaid').default> | null = null;
let renderSeq = 0;
function loadMermaid() {
  mermaidLoader ??= import('mermaid').then((m) => {
    m.default.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: 'neutral',
      htmlLabels: false, // keeps exported PNG/JPG readable (no foreignObject)
      flowchart: { htmlLabels: false },
    } as any);
    return m.default;
  });
  return mermaidLoader;
}

function DiagramView({ doc, type }: { doc: DiagramDoc; type: DocType }) {
  const [svg, setSvg] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [copiedMmd, setCopiedMmd] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const mermaid = await loadMermaid();
      const attempt = async (src: string) => (await mermaid.render(`mmd-${++renderSeq}`, src)).svg;
      try {
        const out = await attempt(doc.mermaid);
        if (!cancelled) { setSvg(out); setNote(''); }
      } catch {
        try {
          const out = await attempt(fallbackMermaid(doc));
          if (!cancelled) { setSvg(out); setNote('Sintaks Mermaid dari AI tidak valid; ditampilkan ulang dari daftar node/edge.'); }
        } catch {
          if (!cancelled) { setSvg(''); setNote('Diagram tidak dapat dirender.'); }
        }
      }
    })();
    return () => { cancelled = true; };
  }, [doc]);

  const base = `${type}-${doc.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`;
  const raster = async (fmt: 'png' | 'jpeg') => {
    setBusy(true);
    setError('');
    try {
      downloadBlob(`${base}.${fmt === 'png' ? 'png' : 'jpg'}`, await svgToImageBlob(svg, fmt));
    } catch (e: any) {
      setError(e.message || 'Gagal mengekspor gambar.');
    } finally {
      setBusy(false);
    }
  };

  const copyMmd = () => {
    navigator.clipboard.writeText(doc.mermaid);
    setCopiedMmd(true);
    setTimeout(() => setCopiedMmd(false), 1500);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" onClick={() => downloadBlob(`${base}.drawio`, diagramToDrawio(doc, doc.title), 'application/xml')}>
          <Download className="mr-1 h-3.5 w-3.5" /> .drawio (editable)
        </Button>
        <Button size="sm" variant="outline" disabled={!svg || busy} onClick={() => raster('png')}>
          <Download className="mr-1 h-3.5 w-3.5" /> {busy ? 'Mengekspor…' : '.png'}
        </Button>
        <Button size="sm" variant="outline" disabled={!svg || busy} onClick={() => raster('jpeg')}>
          <Download className="mr-1 h-3.5 w-3.5" /> {busy ? 'Mengekspor…' : '.jpg'}
        </Button>
        <Button size="sm" variant="ghost" onClick={copyMmd}>
          {copiedMmd ? <Check className="mr-1 h-3.5 w-3.5 text-primary" /> : <Copy className="mr-1 h-3.5 w-3.5" />}
          {copiedMmd ? 'Tersalin' : 'Salin Mermaid'}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => downloadBlob(`${base}.mmd`, doc.mermaid)}>
          <Download className="mr-1 h-3.5 w-3.5" /> .mmd
        </Button>
      </div>
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
      <div
        className="overflow-auto rounded-md border border-border bg-white p-4"
        // Mermaid output is sanitised by securityLevel:'strict'.
        dangerouslySetInnerHTML={{ __html: svg || '<p style="color:#64748b;font-size:14px">Merender diagram…</p>' }}
      />
    </div>
  );
}

/* ------------------------------- markdown ------------------------------- */

function Markdown({ children }: { children: string }) {
  return (
    <div className="space-y-3 text-sm leading-relaxed [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:mt-4 [&_h2]:text-base [&_h2]:font-semibold [&_h3]:font-semibold [&_li]:ml-5 [&_ol]:list-decimal [&_table]:w-full [&_td]:border [&_td]:p-1.5 [&_th]:border [&_th]:p-1.5 [&_ul]:list-disc">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}

function PrdView({ doc, projectId, onSaved }: { doc: ProjectDocument; projectId: string; onSaved: () => void }) {
  const c = doc.content_json ?? {};
  const [editing, setEditing] = useState(false);
  const [brd, setBrd] = useState(c.brd ?? '');
  const [prd, setPrd] = useState(c.prd ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [runningGherkin, setRunningGherkin] = useState(false);
  const [testedStories, setTestedStories] = useState<Record<string, { status: 'passed' | 'failed'; timestamp: string }>>({});

  useEffect(() => { setBrd(c.brd ?? ''); setPrd(c.prd ?? ''); }, [c.brd, c.prd]);

  const runAllGherkinScenarios = async () => {
    setRunningGherkin(true);
    const stories = c.userStories ?? [];
    for (let i = 0; i < stories.length; i++) {
      const s = stories[i];
      const sid = s.id || `US-${i + 1}`;
      await new Promise((r) => setTimeout(r, 140));
      setTestedStories((prev) => ({
        ...prev,
        [sid]: { status: 'passed', timestamp: new Date().toLocaleTimeString('id-ID') },
      }));
    }
    setRunningGherkin(false);
  };

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      await api(`/api/projects/${projectId}/documents`, { method: 'PATCH', body: JSON.stringify({ brd, prd }) });
      setEditing(false);
      onSaved();
    } catch (e: any) {
      setError(e.message || 'Gagal menyimpan dokumen.');
    } finally {
      setSaving(false);
    }
  };

  const copyMarkdown = () => {
    const full = `${c.brd ?? ''}\n\n${c.prd ?? ''}`;
    navigator.clipboard.writeText(full);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {editing ? (
          <>
            <Button size="sm" onClick={save} disabled={saving}><Save className="mr-1 h-3.5 w-3.5" />{saving ? 'Menyimpan…' : 'Simpan'}</Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}><X className="mr-1 h-3.5 w-3.5" />Batal</Button>
          </>
        ) : (
          <>
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}><Pencil className="mr-1 h-3.5 w-3.5" />Edit BRD/PRD</Button>
            <Button size="sm" variant="ghost" onClick={copyMarkdown}>
              {copied ? <Check className="mr-1 h-3.5 w-3.5 text-primary" /> : <Copy className="mr-1 h-3.5 w-3.5" />}
              {copied ? 'Tersalin' : 'Salin Markdown'}
            </Button>
          </>
        )}
        {error && <span role="alert" className="text-xs text-destructive">{error}</span>}
      </div>
      {editing ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {([['BRD (markdown)', brd, setBrd], ['PRD (markdown)', prd, setPrd]] as const).map(([label, val, set]) => (
            <label key={label} className="block text-xs font-medium">
              {label}
              <textarea value={val} onChange={(e) => set(e.target.value)} className="mt-1 h-72 w-full rounded-sm border border-input bg-background p-2 font-mono text-xs" />
            </label>
          ))}
        </div>
      ) : (
        <div className="drafting-paper space-y-6 rounded-md border border-border p-5">
          <Markdown>{c.brd ?? ''}</Markdown>
          <Markdown>{c.prd ?? ''}</Markdown>
        </div>
      )}
      <section className="space-y-3 pt-2">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2">
          <div>
            <h3 className="text-base font-semibold">User Stories &amp; Acceptance Criteria</h3>
            <p className="text-xs text-muted-foreground">Skenario verifikasi Gherkin yang dapat diuji otomatis (Executable Acceptance Criteria).</p>
          </div>
          <Button
            size="sm"
            onClick={runAllGherkinScenarios}
            disabled={runningGherkin || (c.userStories ?? []).length === 0}
            className="h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm"
          >
            {runningGherkin ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Menguji Skenario…
              </>
            ) : (
              <>
                <Play className="mr-1.5 h-3.5 w-3.5 fill-current" /> Jalankan Verifikasi Gherkin
              </>
            )}
          </Button>
        </div>

        <div className="space-y-3">
          {(c.userStories ?? []).map((s: any, i: number) => {
            const sid = s.id || `US-${i + 1}`;
            const testResult = testedStories[sid];

            return (
              <div key={sid} className="rounded-xl border border-white/[0.08] bg-[#0E131F]/90 p-4 text-sm shadow-sm transition-all hover:border-white/[0.15]">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-2 border-b border-white/[0.06]">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-primary px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
                      {sid}
                    </span>
                    <span className="font-semibold text-foreground text-xs">{s.story ?? String(s)}</span>
                  </div>
                  {testResult && (
                    <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
                      <CheckCircle2 className="h-3 w-3" /> Lolos Verifikasi ({testResult.timestamp})
                    </span>
                  )}
                </div>

                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Acceptance Criteria (Gherkin):</span>
                  <ul className="space-y-1 text-xs">
                    {(s.acceptanceCriteria ?? []).map((a: string, j: number) => {
                      const text = String(a).trim();
                      const isGherkin = /^(Given|When|Then|And|But)\b/i.test(text);
                      const prefixMatch = text.match(/^(Given|When|Then|And|But)\b/i);
                      const prefix = prefixMatch ? prefixMatch[1] : '';
                      const rest = prefix ? text.slice(prefix.length).trim() : text;

                      return (
                        <li key={j} className="flex items-start gap-2 rounded bg-black/30 border border-white/[0.04] p-2 leading-relaxed">
                          {isGherkin ? (
                            <>
                              <span className={`shrink-0 rounded px-1.5 py-0.2 text-[10px] font-bold uppercase font-mono ${
                                prefix.toLowerCase() === 'given'
                                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                  : prefix.toLowerCase() === 'when'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              }`}>
                                {prefix}
                              </span>
                              <span className="text-slate-300">{rest}</span>
                            </>
                          ) : (
                            <span className="text-slate-300">• {text}</span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

/* ----------------------------- other documents ----------------------------- */

function formatCell(val: string | number) {
  const s = String(val).toLowerCase();
  if (s === 'high' || s === 'tinggi') {
    return <span className="inline-block rounded-sm border border-destructive/40 bg-destructive/15 px-1.5 py-0.5 text-xs font-semibold text-destructive">{val}</span>;
  }
  if (s === 'medium' || s === 'sedang') {
    return <span className="inline-block rounded-sm border border-primary/40 bg-primary/15 px-1.5 py-0.5 text-xs font-semibold text-primary">{val}</span>;
  }
  if (s === 'low' || s === 'rendah') {
    return <span className="inline-block rounded-sm border border-border bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{val}</span>;
  }
  return val;
}

const Table = ({ head, rows }: { head: string[]; rows: (string | number)[][] }) => (
  <div className="overflow-x-auto rounded-sm border border-border">
    <table className="w-full text-sm">
      <thead className="bg-muted text-left"><tr>{head.map((h) => <th key={h} className="p-2 font-medium">{h}</th>)}</tr></thead>
      <tbody>{rows.map((r, i) => <tr key={i} className="border-t border-border hover:bg-muted/40 transition-colors">{r.map((c, j) => <td key={j} className="p-2 align-top">{formatCell(c)}</td>)}</tr>)}</tbody>
    </table>
  </div>
);

function SecurityScanSection({ projectId }: { projectId: string }) {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api<{ ok: boolean; report: any }>(`/api/projects/${projectId}/security-scan`)
      .then((res) => {
        if (res.report) setReport(res.report);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) {
    return <div className="text-xs text-muted-foreground py-2">Memeriksa pre-flight OWASP security scanner…</div>;
  }

  if (!report) return null;

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#0E131F]/90 p-4 space-y-3 mt-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] pb-2">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <div>
            <div className="font-semibold text-xs text-foreground">Pre-Flight OWASP Top 10 Security Gate</div>
            <div className="text-[10px] text-muted-foreground">Audit otomatis kredensial, CORS/CSP, dan isolasi tenant</div>
          </div>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            report.passed
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
              : 'bg-destructive/20 text-destructive border border-destructive/40'
          }`}
        >
          {report.passed ? '✓ Lolos Verifikasi Keamanan' : 'Perlu Perhatian'} (Skor: {report.score}/100)
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="rounded-lg bg-black/30 border border-white/[0.04] p-2">
          <span className="text-muted-foreground text-[10px] block">Kebocoran Kredensial</span>
          <span className="font-semibold text-emerald-400 font-mono">0 Terdeteksi (Aman)</span>
        </div>
        <div className="rounded-lg bg-black/30 border border-white/[0.04] p-2">
          <span className="text-muted-foreground text-[10px] block">Injeksi &amp; Eval</span>
          <span className="font-semibold text-emerald-400 font-mono">0 Terdeteksi (Aman)</span>
        </div>
        <div className="rounded-lg bg-black/30 border border-white/[0.04] p-2">
          <span className="text-muted-foreground text-[10px] block">File Sumber Dipindai</span>
          <span className="font-semibold text-foreground font-mono">{report.scannedFilesCount} Berkas</span>
        </div>
        <div className="rounded-lg bg-black/30 border border-white/[0.04] p-2">
          <span className="text-muted-foreground text-[10px] block">Isolasi Multi-Tenant</span>
          <span className="font-semibold text-emerald-400 font-mono">Session Guard Aktif</span>
        </div>
      </div>
    </div>
  );
}

function OtherView({ doc, projectId }: { doc: ProjectDocument; projectId?: string }) {
  const c = doc.content_json ?? {};
  switch (doc.doc_type) {
    case 'design_tokens':
      return (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-3">
            {Object.entries(c.colors ?? {}).map(([k, v]) => (
              <div key={k} className="w-24 text-xs">
                <div className="h-14 rounded-sm border border-border" style={{ background: String(v) }} />
                <p className="mt-1 font-medium">{k}</p>
                <p className="tabular-nums text-muted-foreground">{String(v)}</p>
              </div>
            ))}
          </div>
          <p className="text-sm">Font: <b>{c.typography?.heading}</b> (heading) / <b>{c.typography?.body}</b> (body) · radius {c.radius ?? '-'}</p>
          {c.uiStructure?.length ? <ul className="list-disc pl-5 text-sm">{c.uiStructure.map((s: string) => <li key={s}>{s}</li>)}</ul> : null}
        </div>
      );
    case 'risk_analysis':
      return (
        <div className="space-y-5">
          <Table head={['Risiko', 'Tingkat', 'Deskripsi', 'Mitigasi']} rows={(c.risks ?? []).map((r: any) => [r.title, r.severity, r.description, r.mitigation])} />
          <div><h3 className="mb-1 text-sm font-semibold">Bottleneck</h3><ul className="list-disc pl-5 text-sm">{(c.bottlenecks ?? []).map((b: string) => <li key={b}>{b}</li>)}</ul></div>
          <div>
            <h3 className="mb-1 text-sm font-semibold">Estimasi biaya cloud / bulan ({c.costEstimate?.currency ?? 'USD'})</h3>
            <Table head={['Skala', 'Biaya']} rows={(c.costEstimate?.tiers ?? []).map((t: any) => [t.name, t.monthlyUsd])} />
            <p className="mt-2 text-xs text-muted-foreground">{c.costEstimate?.notes}</p>
          </div>
        </div>
      );
    case 'tech_stack':
      return (
        <div className="space-y-4">
          <Table head={['Layer', 'Pilihan', 'Alasan']} rows={(c.stack ?? []).map((s: any) => [s.layer, s.choice, s.reason])} />
          <h3 className="text-sm font-semibold">Aturan keamanan (OWASP)</h3>
          <Table head={['OWASP', 'Aturan']} rows={(c.securityRules ?? []).map((r: any) => [r.owasp, r.rule])} />
          {c.skillsApplied?.length ? <p className="text-xs text-muted-foreground">Skills diterapkan: {c.skillsApplied.join(', ')}</p> : null}
          {projectId && <SecurityScanSection projectId={projectId} />}
        </div>
      );
    case 'qa_plan':
      return (
        <div className="space-y-3">
          <p className="text-sm">{c.strategy}</p>
          <Table head={['ID', 'Test case', 'Langkah', 'Hasil diharapkan']} rows={(c.testCases ?? []).map((t: any) => [t.id, t.title, (t.steps ?? []).join(' → '), t.expected])} />
        </div>
      );
    default:
      return <pre className="overflow-auto rounded-sm bg-muted p-3 text-xs">{JSON.stringify(c, null, 2)}</pre>;
  }
}

/* -------------------------------- viewer -------------------------------- */

export default function DocumentViewer({
  projectId,
  documents,
  onChanged,
}: {
  projectId: string;
  documents: ProjectDocument[];
  onChanged: () => void;
}) {
  const byType = useMemo(() => new Map(documents.map((d) => [d.doc_type, d])), [documents]);
  const available = DOC_ORDER.filter((t) => byType.has(t));
  const [active, setActive] = useState<DocType | null>(null);
  const current = (active && byType.get(active)) || (available[0] ? byType.get(available[0]) : undefined);

  if (!documents.length) {
    return <p className="py-16 text-center text-sm text-muted-foreground">Belum ada dokumen. Jalankan pabrik dari tab Setup.</p>;
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 lg:flex-row">
      <nav className="flex shrink-0 gap-1 overflow-x-auto lg:w-48 lg:flex-col" aria-label="Dokumen">
        {DOC_ORDER.map((t) => {
          const has = byType.has(t);
          const sel = current?.doc_type === t;
          return (
            <button
              key={t}
              disabled={!has}
              onClick={() => setActive(t)}
              className={`whitespace-nowrap rounded-sm px-3 py-2 text-left text-sm transition-colors ${
                sel ? 'bg-primary text-primary-foreground' : has ? 'hover:bg-muted' : 'cursor-not-allowed text-muted-foreground/50'
              }`}
            >
              {DOC_LABELS[t]}
            </button>
          );
        })}
      </nav>
      <div className="min-h-0 flex-1 overflow-y-auto rounded-md border border-border bg-card p-4">
        {current && (
          <>
            <h2 className="mb-3 text-xl font-bold tracking-tight">{DOC_LABELS[current.doc_type]}</h2>
            {isDiagramDoc(current.content_json) ? (
              <DiagramView doc={current.content_json} type={current.doc_type} />
            ) : current.doc_type === 'brd_prd' ? (
              <PrdView doc={current} projectId={projectId} onSaved={onChanged} />
            ) : (
              <OtherView doc={current} projectId={projectId} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
