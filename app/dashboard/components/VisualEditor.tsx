'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ExternalLink, Monitor, MousePointerClick, RotateCw, Smartphone, Tablet, Wand2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/use-project';
import type { ProjectFile } from '@/types';

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
  files,
  busy,
  onChanged,
}: {
  projectId: string;
  files: ProjectFile[];
  busy: boolean;
  onChanged: () => void;
}) {
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
  useEffect(() => { pushMode(editMode); }, [editMode, srcDoc, reloadKey]);

  const apply = async () => {
    setApplying(true);
    setError('');
    setSuccess('');
    try {
      await api('/api/generator', { method: 'PATCH', body: JSON.stringify({ projectId, instruction, selection: selection ?? undefined }) });
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

  if (!html) {
    return <p className="py-16 text-center text-sm text-muted-foreground">Belum ada preview. Jalankan pabrik dari tab Setup.</p>;
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant={editMode ? 'default' : 'outline'} onClick={() => setEditMode((v) => !v)}>
          <MousePointerClick className="mr-1 h-3.5 w-3.5" /> {editMode ? 'Mode pilih elemen: aktif' : 'Pilih elemen'}
        </Button>
        <Button size="sm" variant="ghost" title="Muat ulang preview" onClick={() => setReloadKey((k) => k + 1)}>
          <RotateCw className="mr-1 h-3.5 w-3.5" /> Muat ulang
        </Button>
        <div className="ml-auto flex gap-1" role="group" aria-label="Ukuran layar">
          {([['desktop', Monitor], ['tablet', Tablet], ['mobile', Smartphone]] as const).map(([k, Icon]) => (
            <Button key={k} size="icon" variant={device === k ? 'default' : 'ghost'} className="h-8 w-8" aria-label={k} onClick={() => setDevice(k)}>
              <Icon className="h-4 w-4" />
            </Button>
          ))}
          <Button
            size="icon" variant="ghost" className="h-8 w-8" aria-label="Buka di tab baru"
            onClick={() => { const w = window.open('', '_blank'); if (w) { w.document.write(html); w.document.close(); } }}
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 justify-center overflow-auto rounded-md border border-border bg-muted/50 p-3">
        <iframe
          key={reloadKey}
          ref={frame}
          title="Live preview"
          srcDoc={srcDoc}
          sandbox="allow-scripts"
          onLoad={() => pushMode(editMode)}
          className="h-full min-h-[420px] rounded-md border border-border bg-white shadow-sm transition-[width]"
          style={{ width: WIDTHS[device] }}
        />
      </div>

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
          <p className="mb-2 text-xs text-muted-foreground">Aktifkan “Pilih elemen”, klik bagian preview, lalu tulis perubahan. Tanpa pilihan, perubahan berlaku global.</p>
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
    </div>
  );
}
