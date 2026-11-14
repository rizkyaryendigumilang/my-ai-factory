'use client';

import { useEffect, useState } from 'react';
import {
  Rocket,
  Check,
  Copy,
  Sparkles,
  Share2,
  Code,
  FileText,
  RotateCw,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/use-project';
import type { LaunchKit } from '@/lib/marketing-kit';

export default function MarketingKitPanel({
  projectId,
}: {
  projectId: string;
}) {
  const [kit, setKit] = useState<LaunchKit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'ph' | 'social' | 'github' | 'seo'>('ph');

  const fetchKit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ ok: boolean; kit: LaunchKit }>(`/api/projects/${projectId}/launch-kit`);
      if (res.kit) setKit(res.kit);
    } catch (err: any) {
      setError(err?.message || 'Gagal memuat Marketing & Launch Kit');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKit();
  }, [projectId]);

  const copy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  if (loading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="text-xs">Menyusun Marketing &amp; Launch Kit otomatis…</span>
      </div>
    );
  }

  if (error || !kit) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center text-xs text-destructive">
        <p>{error || 'Launch kit belum tersedia.'}</p>
        <Button size="sm" variant="outline" onClick={fetchKit} className="mt-3">
          Coba Lagi
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-[#0E131F]/90 p-4 shadow-sm backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 border border-primary/30 text-primary">
            <Rocket className="h-5 w-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold tracking-tight text-foreground">
                GTM &amp; Marketing Launch Kit
              </h2>
              <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                Siap Rilis
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Aset publikasi produk otomatis untuk Product Hunt, Twitter/X, LinkedIn, GitHub, dan SEO.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={fetchKit}>
            <RotateCw className="mr-1 h-3.5 w-3.5" /> Segarkan Aset
          </Button>
        </div>
      </div>

      {/* Sub-Tabs */}
      <div className="flex gap-1.5 border-b border-white/[0.08] pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveSubTab('ph')}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
            activeSubTab === 'ph'
              ? 'bg-primary/15 text-primary border border-primary/30 shadow-sm font-semibold'
              : 'text-muted-foreground hover:bg-white/[0.04] hover:text-foreground'
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" /> Product Hunt
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('social')}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
            activeSubTab === 'social'
              ? 'bg-primary/15 text-primary border border-primary/30 shadow-sm font-semibold'
              : 'text-muted-foreground hover:bg-white/[0.04] hover:text-foreground'
          }`}
        >
          <Share2 className="h-3.5 w-3.5" /> X (Twitter) &amp; LinkedIn
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('github')}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
            activeSubTab === 'github'
              ? 'bg-primary/15 text-primary border border-primary/30 shadow-sm font-semibold'
              : 'text-muted-foreground hover:bg-white/[0.04] hover:text-foreground'
          }`}
        >
          <FileText className="h-3.5 w-3.5" /> GitHub Release Notes
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('seo')}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
            activeSubTab === 'seo'
              ? 'bg-primary/15 text-primary border border-primary/30 shadow-sm font-semibold'
              : 'text-muted-foreground hover:bg-white/[0.04] hover:text-foreground'
          }`}
        >
          <Code className="h-3.5 w-3.5" /> Tag Meta &amp; SEO JSON-LD
        </button>
      </div>

      {/* Tab Panels */}
      <div className="flex-1 overflow-y-auto space-y-4">
        {/* Product Hunt */}
        {activeSubTab === 'ph' && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-4">
              <div className="rounded-xl border border-white/[0.08] bg-[#0E131F]/90 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">Tagline Produk (&lt; 60 karakter)</span>
                  <button
                    type="button"
                    onClick={() => copy('ph-tagline', kit.productHunt.tagline)}
                    className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                  >
                    {copiedKey === 'ph-tagline' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copiedKey === 'ph-tagline' ? 'Tersalin' : 'Salin'}
                  </button>
                </div>
                <div className="rounded-lg bg-black/40 border border-white/[0.06] p-3 text-xs text-foreground font-mono">
                  {kit.productHunt.tagline}
                </div>
              </div>

              <div className="rounded-xl border border-white/[0.08] bg-[#0E131F]/90 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">Deskripsi Singkat (Pitch)</span>
                  <button
                    type="button"
                    onClick={() => copy('ph-desc', kit.productHunt.shortDescription)}
                    className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                  >
                    {copiedKey === 'ph-desc' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copiedKey === 'ph-desc' ? 'Tersalin' : 'Salin'}
                  </button>
                </div>
                <div className="rounded-lg bg-black/40 border border-white/[0.06] p-3 text-xs text-foreground leading-relaxed">
                  {kit.productHunt.shortDescription}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-white/[0.08] bg-[#0E131F]/90 p-4 space-y-2 flex flex-col">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">Komentar Pembuka Pembuat (Maker&apos;s First Comment)</span>
                <button
                  type="button"
                  onClick={() => copy('ph-comment', kit.productHunt.firstComment)}
                  className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                >
                  {copiedKey === 'ph-comment' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copiedKey === 'ph-comment' ? 'Tersalin' : 'Salin'}
                </button>
              </div>
              <pre className="flex-1 overflow-auto rounded-lg bg-black/40 border border-white/[0.06] p-3 text-xs text-slate-300 font-sans whitespace-pre-wrap leading-relaxed">
                {kit.productHunt.firstComment}
              </pre>
            </div>
          </div>
        )}

        {/* Social */}
        {activeSubTab === 'social' && (
          <div className="grid gap-4 md:grid-cols-2">
            {/* Twitter Thread */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">Utas X / Twitter (Thread Narasi)</span>
                <button
                  type="button"
                  onClick={() => copy('tw-all', kit.social.twitterThread.join('\n\n---\n\n'))}
                  className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                >
                  {copiedKey === 'tw-all' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copiedKey === 'tw-all' ? 'Tersalin' : 'Salin Semua Utas'}
                </button>
              </div>
              <div className="space-y-2">
                {kit.social.twitterThread.map((tweet, idx) => (
                  <div
                    key={idx}
                    className="relative rounded-xl border border-white/[0.08] bg-[#0E131F]/90 p-3 text-xs leading-relaxed"
                  >
                    <div className="flex justify-between items-center pb-1 text-[11px] text-muted-foreground font-semibold">
                      <span>Tweet #{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => copy(`tw-${idx}`, tweet)}
                        className="text-primary hover:underline"
                      >
                        {copiedKey === `tw-${idx}` ? 'Disalin' : 'Salin'}
                      </button>
                    </div>
                    <p className="text-foreground whitespace-pre-wrap">{tweet}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* LinkedIn */}
            <div className="space-y-3 flex flex-col">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">Postingan Pengumuman LinkedIn</span>
                <button
                  type="button"
                  onClick={() => copy('li-post', kit.social.linkedInPost)}
                  className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                >
                  {copiedKey === 'li-post' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copiedKey === 'li-post' ? 'Tersalin' : 'Salin'}
                </button>
              </div>
              <pre className="flex-1 overflow-auto rounded-xl border border-white/[0.08] bg-[#0E131F]/90 p-4 text-xs text-foreground font-sans whitespace-pre-wrap leading-relaxed">
                {kit.social.linkedInPost}
              </pre>
            </div>
          </div>
        )}

        {/* GitHub Release Notes */}
        {activeSubTab === 'github' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">Markdown GitHub Release Notes &amp; Changelog</span>
              <button
                type="button"
                onClick={() => copy('gh-notes', kit.technical.githubReleaseNotes)}
                className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
              >
                {copiedKey === 'gh-notes' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copiedKey === 'gh-notes' ? 'Tersalin' : 'Salin Markdown'}
              </button>
            </div>
            <pre className="overflow-auto rounded-xl border border-white/[0.08] bg-[#080B11] p-4 font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed max-h-[500px]">
              {kit.technical.githubReleaseNotes}
            </pre>
          </div>
        )}

        {/* SEO & JSON-LD */}
        {activeSubTab === 'seo' && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">Meta Tags HTML &amp; OpenGraph</span>
                <button
                  type="button"
                  onClick={() => copy('seo-meta', kit.technical.seoMetaTags)}
                  className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                >
                  {copiedKey === 'seo-meta' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copiedKey === 'seo-meta' ? 'Tersalin' : 'Salin Meta'}
                </button>
              </div>
              <pre className="overflow-auto rounded-xl border border-white/[0.08] bg-[#080B11] p-3 font-mono text-xs text-emerald-400 whitespace-pre-wrap leading-relaxed max-h-[400px]">
                {kit.technical.seoMetaTags}
              </pre>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">JSON-LD Structured Data Schema</span>
                <button
                  type="button"
                  onClick={() => copy('seo-jsonld', kit.technical.jsonLdSchema)}
                  className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                >
                  {copiedKey === 'seo-jsonld' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copiedKey === 'seo-jsonld' ? 'Tersalin' : 'Salin JSON-LD'}
                </button>
              </div>
              <pre className="overflow-auto rounded-xl border border-white/[0.08] bg-[#080B11] p-3 font-mono text-xs text-amber-300 whitespace-pre-wrap leading-relaxed max-h-[400px]">
                {kit.technical.jsonLdSchema}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
