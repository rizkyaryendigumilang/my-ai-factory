'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Building2, FolderGit2, Layers, Mic, MicOff, Settings, Terminal } from 'lucide-react';
import { api } from '@/lib/use-project';
import { GEM_PERSONAS, GEM_PERSONA_IDS, type AgentRole, type GemPersona } from '@/types';
import SettingsModal from '@/components/SettingsModal';

const PRESETS: { label: string; persona: GemPersona; prompt: string }[] = [
  {
    label: 'Kasir & Stok Warung',
    persona: 'mvp-speedrunner',
    prompt: 'Aplikasi kasir (POS) dan stok barang untuk warung makan: catat transaksi tunai/QRIS, peringatan bahan baku menipis, dan ringkasan laba bersih harian.',
  },
  {
    label: 'Klinik & Rekam Medis',
    persona: 'security-architect',
    prompt: 'Sistem antrean pasien dan rekam medis klinik pratama dengan jadwal dokter, riwayat tindakan terenkripsi, serta cetak resep.',
  },
  {
    label: 'Invoicing Freelancer',
    persona: 'fullstack-engineer',
    prompt: 'Platform pembuatan invoice dan pelacak pembayaran klien untuk studio kreatif, lengkap dengan pengingat jatuh tempo dan laporan arus kas bulanan.',
  },
];

const STATIONS: { role: AgentRole; step: string; title: string; artifact: string; sample: string }[] = [
  {
    role: 'agent-5-ux',
    step: 'Tahap 1–2',
    title: 'Ingesti Referensi & Token Desain',
    artifact: 'design_tokens.json',
    sample: 'colors: { primary: "#F59E0B", background: "#0C0F17", surface: "#131824" }\ntypography: { heading: "IBM Plex Sans", mono: "IBM Plex Mono" }\nuiStructure: ["HeaderNav", "TransactionGrid", "StockAlertDrawer"]',
  },
  {
    role: 'intelligence-risk',
    step: 'Tahap 3',
    title: 'Risiko Arsitektur & Estimasi Cloud',
    artifact: 'risk_analysis.md',
    sample: '[HIGH] Konflik tulis stok paralel saat jam sibuk -> Gunakan transaksi atomik SQLite WAL.\nEstimasi Cloud: MVP (<=100 pengguna) $12/bln | Growth (<=5k pengguna) $145/bln.',
  },
  {
    role: 'agent-1-pm',
    step: 'Tahap 4A',
    title: 'Dokumen BRD, PRD & User Stories',
    artifact: 'brd_prd.md',
    sample: 'US-01: Kasir mencatat pesanan dalam <=3 klik.\nKriteria Terima:\n- Stok otomatis berkurang saat transaksi lunas\n- Struk tetap tersimpan meski koneksi terputus',
  },
  {
    role: 'agent-4-analyst',
    step: 'Tahap 4B',
    title: 'Cetak Biru Sistem (.drawio & Mermaid)',
    artifact: 'erd.drawio + uml.mmd',
    sample: 'erDiagram\n  MERCHANT ||--o{ PRODUCT : manages\n  MERCHANT ||--o{ ORDER : records\n  ORDER ||--|{ ORDER_ITEM : contains',
  },
  {
    role: 'tech-stack-security',
    step: 'Tahap 5',
    title: 'Modul Skills, OWASP Top 10 & Rencana QA',
    artifact: 'tech_stack.md + qa_plan.md',
    sample: 'A01 Broken Access Control -> Isolasi sesi per pengguna di setiap rute API.\nA03 Injection -> Validasi skema Zod & parameter filter PocketBase.',
  },
  {
    role: 'agent-coder',
    step: 'Tahap 6–8',
    title: 'Direktori Kode Utuh, Sandbox & Arsip ZIP',
    artifact: 'package.json + app/ + preview.html',
    sample: 'app/layout.tsx\napp/page.tsx\napp/api/orders/route.ts\nlib/pocketbase.ts\npreview.html (tersedia untuk klik-dan-edit visual)',
  },
];

const PIPELINE_ROWS = [
  ['1. Inisialisasi', 'Pemilihan Mode Gem', 'Ide mentah & prioritas teknis', 'Direktif arsitektur (MVP, Keamanan, Fullstack, atau Desain)'],
  ['2. Ingesti Visual', 'Token Desain & Google Stitch', 'Foto sketsa, wireframe, tautan acuan', 'Palet hex, pasangan tipografi, daftar komponen UI'],
  ['3. Riset Risiko', 'Analis Risiko & Biaya Cloud', 'Profil beban & arsitektur target', 'Daftar bottleneck, mitigasi teknis, estimasi biaya 3 skala'],
  ['4. Cetak Biru', 'Product Manager & System Analyst', 'Token desain & profil risiko', 'BRD/PRD, kriteria terima, diagram ERD/DFD/UML (.drawio & .png)'],
  ['5. Kapabilitas', 'Modul Skills & Arsitek Keamanan', 'Pilihan modul (Auth, Payment, OWASP)', 'Aturan keamanan OWASP Top 10 & skenario uji QA'],
  ['6–8. Konstruksi', 'Generator Kode, Sandbox & Ekspor', 'Manifest direktori terkompresi', 'Direktori Next.js utuh, klik-edit visual, Version History & .zip'],
] as const;

export default function LandingPage() {
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const [persona, setPersona] = useState<GemPersona>('mvp-speedrunner');
  const [activeStation, setActiveStation] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [listening, setListening] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const recognitionRef = useRef<any>(null);

  const toggleListening = () => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const SpeechRec = typeof window !== 'undefined' && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
    if (!SpeechRec) {
      alert('Browser Anda belum mendukung input suara Web Speech API. Gunakan Google Chrome atau Edge.');
      return;
    }

    try {
      const rec = new SpeechRec();
      rec.lang = 'id-ID';
      rec.continuous = true;
      rec.interimResults = false;

      rec.onresult = (e: any) => {
        const text = Array.from(e.results)
          .map((r: any) => r[0]?.transcript)
          .join(' ')
          .trim();
        if (text) {
          setPrompt((prev) => (prev ? `${prev} ${text}` : text));
        }
      };

      rec.onerror = () => setListening(false);
      rec.onend = () => setListening(false);

      rec.start();
      recognitionRef.current = rec;
      setListening(true);
    } catch {
      setListening(false);
    }
  };

  const currentStation = STATIONS[activeStation];

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { project } = await api('/api/projects', {
        method: 'POST',
        body: JSON.stringify({ raw_prompt: prompt, gem_persona: persona }),
      });
      router.push(`/dashboard?project=${project.id}`);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-[#080B11]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground shadow-sm">AF</span>
            <div className="flex items-baseline gap-2">
              <span className="font-bold tracking-tight text-foreground text-sm">My AI Factory</span>
              <span className="hidden text-[11px] text-muted-foreground sm:inline font-medium tracking-wide">/ Autonomous Software House</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSettingsModal(true)}
              className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-foreground transition-all duration-100 ease-out hover:bg-white/[0.08] hover:border-white/[0.15] active:scale-[0.98]"
              title="Buka Pengaturan Pabrik & Integrasi Sistem (AI, VPS, GitHub)"
            >
              <Settings className="h-3.5 w-3.5 text-primary" />
              <span>Pengaturan</span>
            </button>
            <Link
              href="/office"
              className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-foreground transition-all duration-100 ease-out hover:bg-white/[0.08] hover:border-white/[0.15] active:scale-[0.98]"
              title="Buka Software House Virtual Office Layar Penuh"
            >
              <Building2 className="h-3.5 w-3.5 text-primary" />
              <span>Virtual Office</span>
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-foreground transition-all duration-100 ease-out hover:bg-primary/20 hover:border-primary/50 active:scale-[0.98]"
            >
              <FolderGit2 className="h-3.5 w-3.5 text-primary" /> Buka Workspace
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-4 sm:px-6 py-10 lg:py-14">
          <div className="grid items-start gap-10 lg:grid-cols-12">
            <div className="lg:col-span-6 space-y-5">
              <div>
                <p className="mb-2 text-xs font-semibold tracking-wider text-primary uppercase">Virtual CTO &amp; Autonomous Software Foundry</p>
                <h1 className="text-balance text-3xl font-extrabold tracking-tight sm:text-4xl text-foreground leading-[1.15]">
                  Rakit dokumen produk, skema arsitektur, dan kode Next.js utuh.
                </h1>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  Jelaskan kebutuhan aplikasi Anda. Enam spesialis AI berkolaborasi menyusun BRD/PRD, diagram ERD &amp; UML, menghitung estimasi cloud, dan merakit direktori kode Next.js yang siap dijalankan di sandbox.
                </p>
              </div>

              <form onSubmit={create} className="space-y-5">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label htmlFor="raw-prompt" className="text-xs font-semibold text-foreground tracking-tight">Spesifikasi Aplikasi</label>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={toggleListening}
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-all duration-100 ease-out active:scale-[0.98] ${
                          listening
                            ? 'border-rose-500/80 bg-rose-500/15 text-rose-300 animate-pulse'
                            : 'border-white/[0.08] bg-white/[0.03] text-muted-foreground hover:border-primary hover:text-foreground'
                        }`}
                        title={listening ? 'Klik untuk berhenti mendikte' : 'Dikte spesifikasi dengan suara (Bahasa Indonesia)'}
                      >
                        {listening ? <MicOff className="h-3 w-3 text-rose-400" /> : <Mic className="h-3 w-3 text-primary" />}
                        <span>{listening ? 'Mendengarkan…' : 'Dikte Suara'}</span>
                      </button>
                      {PRESETS.map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => { setPrompt(preset.prompt); setPersona(preset.persona); }}
                          className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-0.5 text-[11px] text-muted-foreground transition-all duration-100 ease-out hover:border-primary/50 hover:bg-white/[0.06] hover:text-foreground active:scale-[0.98]"
                        >
                          + {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea
                    id="raw-prompt"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={4}
                    required
                    minLength={3}
                    maxLength={8000}
                    placeholder="Contoh: Sistem kasir toko dengan cetak struk, pelacakan stok menipis, diskon otomatis, dan dashboard laba harian..."
                    className="w-full resize-y rounded-xl border border-white/[0.09] bg-[#0E131F]/90 p-3.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/40 shadow-inner"
                  />
                </div>

                <fieldset>
                  <legend className="mb-2 text-xs font-semibold text-foreground tracking-tight">Mode Kerja Arsitek AI</legend>
                  <div role="radiogroup" className="grid gap-2 sm:grid-cols-2">
                    {GEM_PERSONA_IDS.map((k) => (
                      <button
                        key={k}
                        type="button"
                        role="radio"
                        aria-checked={persona === k}
                        onClick={() => setPersona(k)}
                        className={`rounded-xl border p-3 text-left transition-all duration-150 ease-out active:scale-[0.98] select-none cursor-pointer ${
                          persona === k
                            ? 'border-primary/50 bg-primary/10 shadow-sm'
                            : 'border-white/[0.07] bg-[#0E131F]/60 text-muted-foreground hover:border-white/[0.15] hover:bg-white/[0.04]'
                        }`}
                      >
                        <span className="block font-semibold text-xs text-foreground tracking-tight">{GEM_PERSONAS[k].label}</span>
                        <span className="text-[11px] text-muted-foreground leading-snug mt-0.5 block">{GEM_PERSONAS[k].desc}</span>
                      </button>
                    ))}
                  </div>
                </fieldset>

                {error && <p role="alert" className="text-xs text-destructive rounded-md bg-destructive/10 p-2.5 border border-destructive/20">{error}</p>}

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    type="submit"
                    disabled={loading || prompt.trim().length < 3}
                    className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-5 text-xs font-semibold text-primary-foreground shadow-sm transition-all duration-100 ease-out hover:bg-primary/95 active:scale-[0.98] select-none disabled:opacity-40 cursor-pointer"
                  >
                    {loading ? 'Menyiapkan ruang kerja…' : 'Rakit Proyek Sekarang'}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <span className="text-[11px] text-muted-foreground">Lanjut ke unggah wireframe &amp; persetujuan alur kerja.</span>
                </div>
              </form>
            </div>

            <div className="lg:col-span-6 space-y-3">
              <div className="rounded-xl border border-white/[0.08] bg-[#0E131F]/80 p-4 shadow-lg backdrop-blur-md">
                <div className="mb-3 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-semibold text-foreground tracking-tight">
                    <Layers className="h-3.5 w-3.5 text-primary" /> Stasiun Produksi AI (Klik untuk simulasi)
                  </span>
                  <span className="text-[11px] font-medium text-muted-foreground bg-white/[0.04] px-2 py-0.5 rounded-full">{currentStation.step}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {STATIONS.map((s, idx) => (
                    <button
                      key={s.role}
                      type="button"
                      onClick={() => setActiveStation(idx)}
                      className={`min-w-[130px] flex-1 rounded-lg border px-3 py-2 text-left text-xs transition-all duration-100 ease-out active:scale-[0.98] select-none cursor-pointer ${
                        activeStation === idx
                          ? 'border-primary/50 bg-primary/10 font-semibold text-foreground shadow-sm'
                          : 'border-white/[0.06] bg-black/25 text-muted-foreground hover:border-white/[0.12] hover:text-foreground'
                      }`}
                    >
                      <span className="block text-[10px] font-semibold text-primary uppercase tracking-wider">{s.step}</span>
                      <span className="block truncate text-xs text-foreground mt-0.5">{s.title}</span>
                    </button>
                  ))}
                </div>
                <div className="mt-3.5 rounded-lg border border-white/[0.07] bg-[#070A10] p-3.5 font-mono text-xs shadow-inner">
                  <div className="mb-2 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1.5 font-medium text-foreground">
                      <Terminal className="h-3.5 w-3.5 text-primary" /> Artefak: {currentStation.artifact}
                    </span>
                    <span className="text-[10px] opacity-60">{currentStation.title}</span>
                  </div>
                  <pre className="overflow-x-auto text-[11px] leading-5 text-slate-300 font-mono"><code>{currentStation.sample}</code></pre>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-border bg-card/50 py-10">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-xl font-bold tracking-tight">Skema Pipa Produksi (End-to-End)</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Setiap tahap meneruskan artefak terstruktur ke spesialis berikutnya agar nama entitas, skema database, dan komponen UI tetap sinkron.
            </p>
            <div className="mt-5 overflow-x-auto rounded-sm border border-border bg-card">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-secondary text-xs text-muted-foreground">
                  <tr>
                    <th className="p-3 font-medium">Tahap</th>
                    <th className="p-3 font-medium">Stasiun Spesialis</th>
                    <th className="p-3 font-medium">Input</th>
                    <th className="p-3 font-medium">Keluaran Terukur</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-xs sm:text-sm">
                  {PIPELINE_ROWS.map(([stage, station, input, output]) => (
                    <tr key={stage}>
                      <td className="p-3 font-medium text-primary">{stage}</td>
                      <td className="p-3 font-medium">{station}</td>
                      <td className="p-3 text-muted-foreground">{input}</td>
                      <td className="p-3">{output}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-10">
          <h2 className="text-xl font-bold tracking-tight">Alokasi Kapasitas Pabrik</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-sm border border-border bg-card p-5">
              <div className="flex items-baseline justify-between">
                <h3 className="text-lg font-semibold">Paket Free</h3>
                <span className="text-xs text-muted-foreground">5 proyek / bulan</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Menggunakan kuota Google AI Studio &amp; PocketBase lokal untuk validasi MVP, lengkap dengan seluruh dokumen BRD/PRD, diagram <code>.drawio</code>, dan unduhan <code>.zip</code>.
              </p>
            </div>
            <div className="rounded-sm border border-primary bg-card p-5">
              <div className="flex items-baseline justify-between">
                <h3 className="text-lg font-semibold">Paket Pro / Enterprise</h3>
                <span className="text-xs font-medium text-primary">Tanpa batas kuota</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Membuka modul <strong>Security Hardening</strong> tingkat lanjut (CSP, HSTS, rate limiting, model ancaman <code>SECURITY.md</code>) dan prioritas pemrosesan cloud.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-5 text-center text-xs text-muted-foreground">
        My AI Factory ({new Date().getFullYear()}) — Autonomous Software Foundry
      </footer>

      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />
    </div>
  );
}
