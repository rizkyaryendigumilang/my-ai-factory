'use client';

import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Link2, Lock, Play, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fileToDataUrl } from '@/lib/download';
import { api } from '@/lib/use-project';
import {
  GEM_PERSONAS,
  GEM_PERSONA_IDS,
  type DesignReference,
  type DesignToken,
  type GemPersona,
  type Project,
} from '@/types';

interface SkillInfo {
  id: string;
  name: string;
  description: string;
  tier: 'free' | 'pro';
  locked: boolean;
}

const Section = ({ n, title, children }: { n: number; title: string; children: React.ReactNode }) => (
  <section className="rounded-xl border border-white/[0.08] bg-[#0E131F]/90 p-5 shadow-sm backdrop-blur-sm">
    <h2 className="mb-3.5 flex items-center gap-2.5 text-lg font-bold tracking-tight text-foreground">
      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground shadow-sm">{n}</span>
      {title}
    </h2>
    {children}
  </section>
);

export default function ProjectSetup({
  project,
  running,
  demo,
  onSaved,
  onStarted,
}: {
  project: Project;
  running: boolean;
  demo: boolean;
  onSaved: () => void;
  onStarted: () => void;
}) {
  const [prompt, setPrompt] = useState(project.raw_prompt);
  const [persona, setPersona] = useState<GemPersona>(project.gem_persona);
  const [refs, setRefs] = useState<DesignReference[]>(project.design_ref_url);
  const [skills, setSkills] = useState<string[]>(project.skills);
  const [executionMode, setExecutionMode] = useState<'auto' | 'step'>(project.execution_mode || 'auto');
  const [catalog, setCatalog] = useState<SkillInfo[]>([]);
  const [plan, setPlan] = useState('free');
  const [linkInput, setLinkInput] = useState('');
  const [tokens, setTokens] = useState<DesignToken | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPrompt(project.raw_prompt);
    setPersona(project.gem_persona);
    setRefs(project.design_ref_url);
    setSkills(project.skills);
    setExecutionMode(project.execution_mode || 'auto');
    setTokens(null);
    setError('');
  }, [project.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    api<{ skills: SkillInfo[]; plan: string }>('/api/skills')
      .then((d) => { setCatalog(d.skills); setPlan(d.plan); })
      .catch(() => {});
  }, []);

  const disabled = running || starting;

  const addImages = async (files: FileList | null) => {
    if (!files) return;
    setError('');
    try {
      const next = [...refs];
      for (const f of Array.from(files)) {
        if (next.length >= 6) break;
        if (f.type.startsWith('image/')) next.push({ type: 'image', url: await fileToDataUrl(f), name: f.name });
      }
      setRefs(next);
    } catch {
      setError('Gagal membaca gambar.');
    }
    if (fileInput.current) fileInput.current.value = '';
  };

  const addLink = () => {
    const v = linkInput.trim();
    if (!/^https?:\/\/\S+$/i.test(v)) return setError('Tautan harus diawali http:// atau https://');
    if (refs.length >= 6) return setError('Maksimal 6 referensi.');
    setRefs([...refs, { type: 'url', url: v }]);
    setLinkInput('');
    setError('');
  };

  const extract = async () => {
    setExtracting(true);
    setError('');
    try {
      const r = await api<{ designToken: DesignToken }>('/api/agents/stitch', {
        method: 'POST',
        body: JSON.stringify({ projectId: project.id, prompt, gem_persona: persona, refs }),
      });
      setTokens(r.designToken);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setExtracting(false);
    }
  };

  const saveAndRun = async (resume = false) => {
    setStarting(true);
    setError('');
    try {
      if (!resume) {
        await api(`/api/projects/${project.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            raw_prompt: prompt,
            gem_persona: persona,
            design_ref_url: refs,
            skills,
            execution_mode: executionMode,
          }),
        });
        onSaved();
      }
      await api('/api/agents', { method: 'POST', body: JSON.stringify({ projectId: project.id, resume }) });
      onStarted();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setStarting(false);
    }
  };

  const hasResult = project.status === 'completed' || project.status === 'failed';

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {demo && (
        <div className="rounded-sm border border-border bg-secondary p-3 text-sm text-foreground">
          <strong>Mode Demo Offline:</strong> <code>GEMINI_API_KEY</code> belum diisi di <code>.env.local</code>. Pabrik akan menghasilkan artefak contoh agar seluruh alur dapat diuji tanpa biaya API.
        </div>
      )}

      <Section n={1} title="Spesifikasi & Mode Kerja (Gem)">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={disabled}
          rows={4}
          maxLength={8000}
          aria-label="Ide aplikasi"
          placeholder="Jelaskan produk yang ingin dibangun…"
          className="mb-3 w-full resize-y rounded-sm border border-input bg-background p-3 text-sm"
        />
        <div role="radiogroup" aria-label="AI Persona" className="grid gap-2 sm:grid-cols-2">
          {GEM_PERSONA_IDS.map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={persona === k}
              disabled={disabled}
              onClick={() => setPersona(k)}
              className={`rounded-sm border p-3 text-left text-sm transition-colors ${
                persona === k ? 'border-primary bg-primary/10' : 'border-border hover:bg-secondary'
              }`}
            >
              <span className="block font-semibold">{GEM_PERSONAS[k].label}</span>
              <span className="text-xs text-muted-foreground">{GEM_PERSONAS[k].desc}</span>
            </button>
          ))}
        </div>
      </Section>

      <Section n={2} title="Referensi Visual & Design Tokens (Google Stitch)">
        <p className="mb-3 text-sm text-muted-foreground">
          Unggah foto sketsa tangan, wireframe, atau screenshot untuk diekstrak menjadi palet warna dan skala tipografi. Tautan web digunakan sebagai petunjuk penamaan sistem desain.
        </p>
        <div className="mb-3 flex flex-wrap gap-2">
          <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" multiple hidden onChange={(e) => addImages(e.target.files)} />
          <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => fileInput.current?.click()}>
            <ImagePlus className="mr-1 h-4 w-4" /> Unggah Gambar
          </Button>
          <form className="flex flex-1 gap-2" onSubmit={(e) => { e.preventDefault(); addLink(); }}>
            <input
              value={linkInput}
              onChange={(e) => setLinkInput(e.target.value)}
              disabled={disabled}
              placeholder="https://… (tautan design system)"
              aria-label="Tautan referensi"
              className="h-9 min-w-0 flex-1 rounded-sm border border-input bg-background px-3 text-sm"
            />
            <Button type="submit" variant="outline" size="sm" disabled={disabled || !linkInput.trim()}>
              <Link2 className="mr-1 h-4 w-4" /> Tambah
            </Button>
          </form>
        </div>
        {refs.length > 0 && (
          <ul className="mb-3 flex flex-wrap gap-2">
            {refs.map((r, i) => (
              <li key={i} className="relative">
                {r.type === 'image' ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.url} alt={r.name ?? 'Referensi'} className="h-20 w-20 rounded-sm border border-border object-cover" />
                ) : (
                  <span className="flex h-20 w-40 items-center rounded-sm border border-border bg-secondary p-2 text-xs break-all">{r.url}</span>
                )}
                <button
                  type="button"
                  aria-label="Hapus referensi"
                  disabled={disabled}
                  onClick={() => setRefs(refs.filter((_, j) => j !== i))}
                  className="absolute -right-1.5 -top-1.5 rounded-sm bg-foreground p-0.5 text-background"
                >
                  <X className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <Button type="button" size="sm" variant="secondary" disabled={disabled || extracting || (!refs.length && !prompt.trim())} onClick={extract}>
          <Sparkles className="mr-1 h-4 w-4" />
          {extracting ? 'Mengekstrak token…' : 'Pratinjau Design Tokens'}
        </Button>
        {tokens && (
          <div className="mt-3 space-y-2 rounded-sm border border-border bg-background p-3">
            <div className="flex flex-wrap gap-2">
              {Object.entries(tokens.colors).map(([k, v]) => (
                <div key={k} className="text-center text-[11px]">
                  <div className="h-10 w-14 rounded-sm border border-border" style={{ background: v }} />
                  {k}<br /><span className="text-muted-foreground">{v}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Tipografi: {tokens.typography?.heading} / {tokens.typography?.body}</p>
          </div>
        )}
      </Section>

      <Section n={3} title="Modul Kapabilitas (Skills)">
        <div className="grid gap-2 sm:grid-cols-2">
          {catalog.map((s) => {
            const on = skills.includes(s.id);
            return (
              <label
                key={s.id}
                className={`flex gap-2 rounded-sm border p-3 text-sm ${
                  s.locked ? 'opacity-60' : 'cursor-pointer hover:bg-secondary'
                } ${on ? 'border-primary bg-primary/10' : 'border-border'}`}
              >
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={on}
                  disabled={disabled || s.locked}
                  onChange={() => setSkills(on ? skills.filter((x) => x !== s.id) : [...skills, s.id])}
                />
                <span>
                  <span className="flex items-center gap-1.5 font-semibold">
                    {s.name}
                    {s.tier === 'pro' && <span className="rounded-sm border border-primary px-1 text-[10px] text-primary">Tier Pro</span>}
                    {s.locked && <Lock className="h-3 w-3" />}
                  </span>
                  <span className="text-xs text-muted-foreground">{s.description}</span>
                </span>
              </label>
            );
          })}
        </div>
        {plan === 'free' && (
          <p className="mt-2 text-xs text-muted-foreground">
            Paket Free aktif. Setel <code>FACTORY_PLAN=pro</code> di <code>.env.local</code> untuk membuka modul Tier Pro.
          </p>
        )}
      </Section>

      <Section n={4} title="Kendali Alur Kerja & Otorisasi Kiky (AGENTS.md)">
        <div className="grid gap-3 sm:grid-cols-2">
          <label
            className={`flex cursor-pointer gap-2.5 rounded-sm border p-3.5 transition-colors ${
              executionMode === 'auto' ? 'border-primary bg-primary/10' : 'border-border hover:bg-secondary'
            }`}
          >
            <input
              type="radio"
              name="executionMode"
              value="auto"
              checked={executionMode === 'auto'}
              onChange={() => setExecutionMode('auto')}
              className="mt-1"
            />
            <div>
              <span className="block font-semibold text-sm">⚡ Auto-Pilot Penuh</span>
              <span className="block text-xs text-muted-foreground mt-0.5">
                Semua agen bekerja estafet secara otomatis dari UX, PM, Arsitek, Keamanan hingga Kode Next.js selesai.
              </span>
            </div>
          </label>

          <label
            className={`flex cursor-pointer gap-2.5 rounded-sm border p-3.5 transition-colors ${
              executionMode === 'step' ? 'border-primary bg-primary/10' : 'border-border hover:bg-secondary'
            }`}
          >
            <input
              type="radio"
              name="executionMode"
              value="step"
              checked={executionMode === 'step'}
              onChange={() => setExecutionMode('step')}
              className="mt-1"
            />
            <div>
              <span className="block font-semibold text-sm">🛡️ Step-by-Step (Approval Gates)</span>
              <span className="block text-xs text-muted-foreground mt-0.5">
                Agen berhenti di setiap tahapan (PRD, Arsitektur, Keamanan) untuk Anda review &amp; setujui sebelum kode dirakit.
              </span>
            </div>
          </label>
        </div>
      </Section>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-wrap items-center gap-3">
        {project.status === 'failed' && (
          <Button size="lg" disabled={disabled} onClick={() => saveAndRun(true)}>
            <Play className="mr-2 h-4 w-4" /> Lanjutkan dari Tahap Terakhir
          </Button>
        )}
        <Button
          size="lg"
          variant={project.status === 'failed' ? 'outline' : 'default'}
          disabled={disabled || prompt.trim().length < 3}
          onClick={() => saveAndRun(false)}
        >
          <Play className="mr-2 h-4 w-4" />
          {running ? 'Pabrik Sedang Merakit…' : hasResult ? 'Rakit Ulang dari Awal' : 'Jalankan Pabrik'}
        </Button>
        {hasResult && <span className="text-xs text-muted-foreground">Kondisi sebelumnya disimpan otomatis ke Version History.</span>}
      </div>
    </div>
  );
}
