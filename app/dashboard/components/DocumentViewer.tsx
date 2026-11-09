// deslop-ignore-file 34
'use client';

import { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Check, Copy, Download, Pencil, Save, X } from 'lucide-react';
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

  useEffect(() => { setBrd(c.brd ?? ''); setPrd(c.prd ?? ''); }, [c.brd, c.prd]);

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
      <section>
        <h3 className="mb-2 text-base font-semibold">User Stories & Acceptance Criteria</h3>
        <div className="space-y-2">
          {(c.userStories ?? []).map((s: any, i: number) => (
            <div key={s.id ?? i} className="rounded-sm border border-border p-3 text-sm">
              <p className="font-medium">{s.id} {s.story ?? String(s)}</p>
              <ul className="mt-1 list-disc pl-5 text-muted-foreground">
                {(s.acceptanceCriteria ?? []).map((a: string, j: number) => <li key={j}>{a}</li>)}
              </ul>
            </div>
          ))}
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

function OtherView({ doc }: { doc: ProjectDocument }) {
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
        <div className="space-y-3">
          <Table head={['Layer', 'Pilihan', 'Alasan']} rows={(c.stack ?? []).map((s: any) => [s.layer, s.choice, s.reason])} />
          <h3 className="text-sm font-semibold">Aturan keamanan (OWASP)</h3>
          <Table head={['OWASP', 'Aturan']} rows={(c.securityRules ?? []).map((r: any) => [r.owasp, r.rule])} />
          {c.skillsApplied?.length ? <p className="text-xs text-muted-foreground">Skills diterapkan: {c.skillsApplied.join(', ')}</p> : null}
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
              <OtherView doc={current} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
