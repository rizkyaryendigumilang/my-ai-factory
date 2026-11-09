// deslop-ignore-file 34
'use client';

import { useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronRight, Copy, File as FileIcon, RefreshCw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/use-project';
import type { FileTreeNode, ProjectFile } from '@/types';

export function buildTree(files: ProjectFile[]): FileTreeNode[] {
  const root: FileTreeNode = { name: '', path: '', type: 'directory', children: [] };
  for (const f of files) {
    const parts = f.file_path.split('/');
    let node = root;
    parts.forEach((part, i) => {
      const path = parts.slice(0, i + 1).join('/');
      const isFile = i === parts.length - 1;
      let child = node.children!.find((c) => c.name === part && c.type === (isFile ? 'file' : 'directory'));
      if (!child) {
        child = { name: part, path, type: isFile ? 'file' : 'directory', children: isFile ? undefined : [], content: isFile ? f.file_content : undefined };
        node.children!.push(child);
      }
      node = child;
    });
  }
  const sort = (n: FileTreeNode) => {
    n.children?.sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'directory' ? -1 : 1));
    n.children?.forEach(sort);
  };
  sort(root);
  return root.children!;
}

function Tree({ nodes, depth, selected, onSelect }: { nodes: FileTreeNode[]; depth: number; selected: string | null; onSelect: (p: string) => void }) {
  const [closed, setClosed] = useState<Set<string>>(new Set());
  return (
    <ul>
      {nodes.map((n) =>
        n.type === 'directory' ? (
          <li key={n.path}>
            <button
              className="flex w-full items-center gap-1 rounded-sm px-1 py-1 text-left text-sm hover:bg-muted"
              style={{ paddingLeft: depth * 12 + 4 }}
              onClick={() => setClosed((s) => { const x = new Set(s); x.has(n.path) ? x.delete(n.path) : x.add(n.path); return x; })}
            >
              {closed.has(n.path) ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {n.name}
            </button>
            {!closed.has(n.path) && <Tree nodes={n.children!} depth={depth + 1} selected={selected} onSelect={onSelect} />}
          </li>
        ) : (
          <li key={n.path}>
            <button
              className={`flex w-full items-center gap-1 rounded-sm px-1 py-1 text-left text-sm ${selected === n.path ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
              style={{ paddingLeft: depth * 12 + 4 }}
              onClick={() => onSelect(n.path)}
            >
              <FileIcon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{n.name}</span>
            </button>
          </li>
        )
      )}
    </ul>
  );
}

export default function CodeExplorer({
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
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [confirmRegen, setConfirmRegen] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const filteredFiles = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? files.filter((f) => f.file_path.toLowerCase().includes(q)) : files;
  }, [files, search]);

  const tree = useMemo(() => buildTree(filteredFiles), [filteredFiles]);
  const file = files.find((f) => f.file_path === (selected ?? files[0]?.file_path));
  const lineCount = file ? file.file_content.split('\n').length : 0;

  const regenerate = async () => {
    setError('');
    setConfirmRegen(false);
    try {
      await api('/api/generator', { method: 'POST', body: JSON.stringify({ projectId }) });
      onChanged();
    } catch (e: any) {
      setError(e.message || 'Gagal meregenerasi kode.');
    }
  };

  if (!files.length) {
    return <p className="py-16 text-center text-sm text-muted-foreground">Belum ada kode. Jalankan pabrik dari tab Setup.</p>;
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 md:flex-row">
      <div className="flex min-h-0 shrink-0 flex-col rounded-md border border-border bg-card md:w-64">
        <div className="flex flex-wrap items-center justify-between gap-1 border-b border-border p-2 text-xs text-muted-foreground">
          <span className="tabular-nums">{files.length} file</span>
          {confirmRegen ? (
            <div className="flex items-center gap-1">
              <Button size="sm" variant="destructive" className="h-7 px-2 text-xs" disabled={busy} onClick={regenerate}>
                Ya, regenerasi
              </Button>
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setConfirmRegen(false)}>
                Batal
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => setConfirmRegen(true)}>
              <RefreshCw className="mr-1 h-3.5 w-3.5" /> Regenerasi
            </Button>
          )}
        </div>
        <div className="border-b border-border p-2">
          <div className="relative">
            <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari file…"
              aria-label="Cari file"
              className="h-7.5 w-full rounded-sm border border-input bg-background pl-7 pr-2 text-xs"
            />
          </div>
        </div>
        {error && <p role="alert" className="border-b border-border px-2 py-1 text-xs text-destructive">{error}</p>}
        <div className="min-h-0 flex-1 overflow-y-auto p-1">
          {filteredFiles.length === 0 ? (
            <p className="p-3 text-center text-xs text-muted-foreground">Tidak ada file cocok.</p>
          ) : (
            <Tree nodes={tree} depth={0} selected={file?.file_path ?? null} onSelect={setSelected} />
          )}
        </div>
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col rounded-md border border-border bg-[#0c0f17] text-slate-200">
        <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2 text-xs">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate font-mono">{file?.file_path}</span>
            {lineCount > 0 && <span className="tabular-nums text-slate-400">({lineCount} baris)</span>}
          </div>
          <button
            className="inline-flex items-center gap-1 text-slate-400 hover:text-white"
            onClick={() => {
              if (!file) return;
              navigator.clipboard.writeText(file.file_content);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Tersalin' : 'Salin'}
          </button>
        </div>
        <pre className="min-h-0 flex-1 overflow-auto p-3 font-mono text-xs leading-5"><code>{file?.file_content}</code></pre>
      </div>
    </div>
  );
}
