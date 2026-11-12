'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  Check,
  Clock,
  ExternalLink,
  Monitor,
  MousePointerClick,
  Play,
  RotateCw,
  Server,
  Smartphone,
  Square,
  Tablet,
  Terminal,
  Wand2,
  X,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/use-project';
import type { Project, ProjectFile } from '@/types';
import type { SandboxStatus } from '@/lib/vps-runner';

interface Selection {
  selector: string;
  tag: string;
  text: string;
  html: string;
}

/** Runs inside the sandboxed iframe (no same-origin): reports clicks to the parent via postMessage. */
const BRIDGE = `<script>(function(){
var on=false,last=null;
function sel(el){if(el.id)return '#'+el.id;var p=[];while(el&&el.nodeType===1&&el.tagName!=='BODY'){var i=1,s=el;while((s=s.previousElementSibling))if(s.tagName===el.tagName)i++;p.unshift(el.tagName.toLowerCase()+':nth-of-type('+i+')');el=el.parentElement}return p.join(' > ')}
function clear(){if(last){last.style.outline=last.__o||'';last.style.outlineOffset='';last=null}}
addEventListener('message',function(e){if(e.data&&e.data.type==='mode'){on=!!e.data.on;if(!on)clear();document.body.style.cursor=on?'crosshair':''}});
document.addEventListener('mouseover',function(e){if(!on)return;clear();last=e.target;last.__o=last.style.outline;last.style.outline='2px solid #f59e0b';last.style.outlineOffset='2px'},true);
document.addEventListener('click',function(e){if(!on)return;e.preventDefault();e.stopPropagation();var el=e.target;
parent.postMessage({type:'select',selector:sel(el),tag:el.tagName.toLowerCase(),text:(el.textContent||'').trim().slice(0,200),html:el.outerHTML.slice(0,1500)},'*')},true);
})()</script>`;

const WIDTHS = { desktop: '100%', tablet: '768px', mobile: '390px' } as const;

export default function VisualEditor({
  projectId,
  project,
  files,
  busy,
  onChanged,
}: {
  projectId: string;
  project?: Project;
  files: ProjectFile[];
  busy: boolean;
  onChanged: () => void;
}) {
  const [viewMode, setViewMode] = useState<'instant' | 'live-vps'>('instant');
  const [runner, setRunner] = useState<SandboxStatus | null>(null);
  const [runnerBusy, setRunnerBusy] = useState(false);
  const [showLogs, setShowLogs] = useState(false);

  const html = files.find((f) => f.file_path === 'preview.html')?.file_content;
  const srcDoc = useMemo(() => {
    if (!html) return '';
    return /<\/body>/i.test(html) ? html.replace(/<\/body>/i, BRIDGE + '</body>') : html + BRIDGE;
  }, [html]);

  const frame = useRef<HTMLIFrameElement>(null);
  const [editMode, setEditMode] = useState(false);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [instruction, setInstruction] = useState('');
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [device, setDevice] = useState<keyof typeof WIDTHS>('desktop');

  const fetchRunnerStatus = useCallback(async () => {
    try {
      const res = await api<{ ok: boolean; runner: SandboxStatus }>(`/api/projects/${projectId}/runner`);
      if (res.runner) setRunner(res.runner);
    } catch {}
  }, [projectId]);

  useEffect(() => {
    fetchRunnerStatus();
    const interval = setInterval(fetchRunnerStatus, 4000);
    return () => clearInterval(interval);
  }, [fetchRunnerStatus]);

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.source !== frame.current?.contentWindow || e.data?.type !== 'select') return;
      const { selector, tag, text, html } = e.data;
      setSelection({ selector: String(selector), tag: String(tag), text: String(text), html: String(html) });
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);

  const pushMode = (on: boolean) => frame.current?.contentWindow?.postMessage({ type: 'mode', on }, '*');
  useEffect(() => {
    if (viewMode === 'instant') pushMode(editMode);
  }, [editMode, srcDoc, reloadKey, viewMode]);

  const apply = async () => {
    setApplying(true);
    setError('');
    setSuccess('');
    try {
      await api('/api/generator', {
        method: 'PATCH',
        body: JSON.stringify({ projectId, instruction, selection: selection ?? undefined }),
      });
      setInstruction('');
      setSelection(null);
      setSuccess('Perubahan berhasil diterapkan ke preview!');
      setTimeout(() => setSuccess(''), 3000);
      onChanged();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setApplying(false);
    }
  };

  const handleRunnerAction = async (action: 'start' | 'stop' | 'restart') => {
    setRunnerBusy(true);
    setError('');
    try {
      const res = await api<{ ok: boolean; runner: SandboxStatus }>(`/api/projects/${projectId}/runner`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      });
      if (res.runner) setRunner(res.runner);
      if (action === 'start') {
        setViewMode('live-vps');
        setReloadKey((k) => k + 1);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setRunnerBusy(false);
    }
  };

  if (project?.files_expired && files.length === 0) {
    return (
      <div className="flex h-full min-h-[300px] flex-col items-center justify-center p-8 text-center border rounded-md border-amber-500/30 bg-amber-500/5">
        <Clock className="h-10 w-10 text-amber-500 mb-3" />
        <h3 className="text-sm font-semibold text-foreground">File Temporary VPS Telah Dihapus</h3>
        <p className="mt-1.5 max-w-md text-xs text-muted-foreground leading-relaxed">
          File kode dan server sandbox di VPS otomatis dibersihkan karena batas 5 jam telah terlampaui tanpa diunduh.
          Dokumen PRD &amp; arsitektur tetap aman. Anda dapat melakukan regenerasi kode dari tab Spesifikasi &amp; Setup.
        </p>
      </div>
    );
  }

  if (!html && files.length === 0) {
    return <p className="py-16 text-center text-sm text-muted-foreground">Belum ada preview. Jalankan perakitan dari tab Setup.</p>;
  }

  const isRunnerActive = runner?.status === 'running';

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {/* Top Header Mode Switcher & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2.5">
        <div className="flex items-center gap-1.5 rounded-sm bg-muted/60 p-1">
          <Button
            size="sm"
            variant={viewMode === 'instant' ? 'default' : 'ghost'}
            className="h-7 text-xs font-medium"
            onClick={() => setViewMode('instant')}
          >
            <Layers className="mr-1.5 h-3.5 w-3.5" />
            Preview Instan (HTML)
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'live-vps' ? 'default' : 'ghost'}
            className="h-7 text-xs font-medium"
            onClick={() => setViewMode('live-vps')}
          >
            <Server className="mr-1.5 h-3.5 w-3.5" />
            Live Sandbox VPS (Next.js)
            {isRunnerActive && (
              <span className="ml-1.5 flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </Button>
        </div>

        {/* Live Runner VPS Controls */}
        {viewMode === 'live-vps' && (
          <div className="flex items-center gap-2">
            {runner?.status === 'running' ? (
              <div className="flex items-center gap-1.5">
                <span className="flex items-center gap-1 rounded bg-emerald-950/60 border border-emerald-800/80 px-2 py-0.5 text-xs text-emerald-300 font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping mr-0.5" />
                  Port {runner.port} Online
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs border-destructive text-destructive hover:bg-destructive/10"
                  disabled={runnerBusy}
                  onClick={() => handleRunnerAction('stop')}
                >
                  <Square className="mr-1 h-3.5 w-3.5" /> Hentikan Server
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs"
                  disabled={runnerBusy}
                  onClick={() => handleRunnerAction('restart')}
                >
                  <RotateCw className="mr-1 h-3.5 w-3.5" /> Restart
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="default"
                className="h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                disabled={runnerBusy || runner?.status === 'starting'}
                onClick={() => handleRunnerAction('start')}
              >
                <Play className="mr-1.5 h-3.5 w-3.5 fill-current" />
                {runner?.status === 'starting' ? 'Menyiapkan Node.js…' : 'Jalankan di VPS (Next.js)'}
              </Button>
            )}

            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={() => setShowLogs((s) => !s)}
            >
              <Terminal className="mr-1.5 h-3.5 w-3.5" /> Log Terminal
            </Button>
          </div>
        )}

        {/* Instant Mode Controls */}
        {viewMode === 'instant' && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={editMode ? 'default' : 'outline'}
              className="h-8 text-xs"
              onClick={() => setEditMode((v) => !v)}
            >
              <MousePointerClick className="mr-1 h-3.5 w-3.5" />
              {editMode ? 'Mode pilih elemen: aktif' : 'Pilih elemen visual'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs"
              title="Muat ulang preview"
              onClick={() => setReloadKey((k) => k + 1)}
            >
              <RotateCw className="mr-1 h-3.5 w-3.5" /> Muat ulang
            </Button>
          </div>
        )}

        {/* Responsive Device Width Switcher & Popout */}
        <div className="flex items-center gap-1" role="group" aria-label="Ukuran layar">
          {([['desktop', Monitor], ['tablet', Tablet], ['mobile', Smartphone]] as const).map(([k, Icon]) => (
            <Button
              key={k}
              size="icon"
              variant={device === k ? 'default' : 'ghost'}
              className="h-8 w-8"
              aria-label={k}
              onClick={() => setDevice(k)}
            >
              <Icon className="h-4 w-4" />
            </Button>
          ))}
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            aria-label="Buka di tab baru"
            title="Buka aplikasi di tab baru"
            onClick={() => {
              if (viewMode === 'live-vps' && runner?.url) {
                window.open(runner.url, '_blank');
              } else if (html) {
                const w = window.open('', '_blank');
                if (w) {
                  w.document.write(html);
                  w.document.close();
                }
              }
            }}
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Canvas Viewer */}
      <div className="flex min-h-0 flex-1 justify-center overflow-auto rounded-md border border-border bg-muted/40 p-3">
        {viewMode === 'instant' ? (
          <iframe
            key={reloadKey}
            ref={frame}
            title="Instant preview"
            srcDoc={srcDoc}
            sandbox="allow-scripts"
            onLoad={() => pushMode(editMode)}
            className="h-full min-h-[460px] rounded-md border border-border bg-white shadow-sm transition-[width]"
            style={{ width: WIDTHS[device] }}
          />
        ) : isRunnerActive ? (
          <iframe
            key={`runner-${reloadKey}`}
            title="Live Sandbox VPS"
            src={runner?.url}
            className="h-full min-h-[460px] rounded-md border border-border bg-white shadow-sm transition-[width]"
            style={{ width: WIDTHS[device] }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
            <Server className="h-10 w-10 text-muted-foreground/60 mb-3" />
            <h4 className="font-semibold text-foreground text-sm">Server Sandbox Belum Dijalankan</h4>
            <p className="mt-1 text-xs max-w-md">
              Aplikasi Next.js ini belum aktif di port VPS. Klik tombol <strong>&ldquo;Jalankan di VPS (Next.js)&rdquo;</strong> di atas untuk mem-boot dev server pada port {runner?.port ?? 3006}.
            </p>
            <Button
              size="sm"
              variant="default"
              className="mt-4 bg-primary text-primary-foreground text-xs"
              disabled={runnerBusy || runner?.status === 'starting'}
              onClick={() => handleRunnerAction('start')}
            >
              <Play className="mr-1.5 h-3.5 w-3.5 fill-current" /> Mulai Server Next.js
            </Button>
          </div>
        )}
      </div>

      {/* Terminal Log Drawer (Collapsible) */}
      {showLogs && viewMode === 'live-vps' && (
        <div className="rounded-md border border-border bg-slate-950 p-3 font-mono text-xs text-slate-200">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
            <span className="flex items-center gap-1.5 font-semibold text-slate-300">
              <Terminal className="h-3.5 w-3.5 text-primary" /> Konsol Node.js / Next.js Runner
            </span>
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-slate-400" onClick={() => setShowLogs(false)}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
          <pre className="max-h-40 overflow-auto whitespace-pre-wrap leading-relaxed text-[11px] text-slate-400">
            {runner?.logs?.length ? runner.logs.join('\n') : '(Belum ada log server)'}
          </pre>
        </div>
      )}

      {/* Visual Editor Form (Instant Mode) */}
      {viewMode === 'instant' && (
        <div className="rounded-md border border-border bg-card p-3">
          {selection ? (
            <div className="mb-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span className="truncate">
                Dipilih: <code className="rounded bg-muted px-1">&lt;{selection.tag}&gt;</code> {selection.text && `"${selection.text.slice(0, 50)}"`}
              </span>
              <button
                type="button"
                onClick={() => setSelection(null)}
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                <X className="h-3 w-3" /> Batal pilih
              </button>
            </div>
          ) : (
            <p className="mb-2 text-xs text-muted-foreground">Aktifkan “Pilih elemen visual”, klik bagian preview, lalu tulis perubahan. Tanpa pilihan, perubahan berlaku global.</p>
          )}
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (instruction.trim()) apply(); }}>
            <input
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              disabled={applying || busy}
              placeholder="Contoh: ubah tombol jadi hijau dan tambahkan efek hover"
              className="h-10 flex-1 rounded-sm border border-input bg-background px-3 text-sm"
            />
            <Button type="submit" disabled={applying || busy || instruction.trim().length < 2}>
              <Wand2 className="mr-1 h-4 w-4" /> {applying ? 'Menerapkan…' : 'Terapkan'}
            </Button>
          </form>
          {success && <p className="mt-2 flex items-center gap-1 text-xs text-primary"><Check className="h-3.5 w-3.5" />{success}</p>}
          {error && <p role="alert" className="mt-2 text-xs text-destructive">{error}</p>}
        </div>
      )}
    </div>
  );
}
