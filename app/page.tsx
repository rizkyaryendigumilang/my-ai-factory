'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Building2, ExternalLink, FolderGit2, Layers, Terminal } from 'lucide-react';
import VirtualOffice from './dashboard/components/VirtualOffice';
import { ROLE_ORDER, type OfficeState } from '@/lib/activity';
import { api } from '@/lib/use-project';
import { GEM_PERSONAS, GEM_PERSONA_IDS, type AgentRole, type GemPersona } from '@/types';

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

  const currentStation = STATIONS[activeStation];
  const prevRole = ROLE_ORDER[Math.max(0, activeStation - 1)];
  const stageActivity: Partial<Record<AgentRole, OfficeState>> = {
    [currentStation.role]: 'typing',
    ...(activeStation > 0 ? { [prevRole]: 'discussing' } : {}),
  };

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
      <header className="border-b border-border bg-card/80">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-sm bg-primary text-xs font-bold text-primary-foreground">AF</span>
            <span className="font-semibold tracking-tight">My AI Factory</span>
            <span className="hidden text-xs text-muted-foreground sm:inline">/ Autonomous Software Foundry</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/office"
              className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-[transform,background-color,border-color,color] duration-150 ease-out hover:border-primary active:scale-[0.98]"
              title="Buka Software House Virtual Office Layar Penuh"
            >
              <Building2 className="h-3.5 w-3.5 text-primary" />
              <span>Virtual Office</span>
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-foreground transition-[transform,background-color,border-color,color] duration-150 ease-out hover:border-primary active:scale-[0.98]"
            >
              <FolderGit2 className="h-3.5 w-3.5 text-primary" /> Buka Workspace
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-4 py-10 lg:py-14">
          <div className="grid items-start gap-8 lg:grid-cols-12">
            <div className="lg:col-span-6">
              <p className="mb-2 text-xs font-medium text-primary">Virtual CTO &amp; Full-Directory Code Foundry</p>
              <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
                Rakit dokumen produk, skema diagram, dan direktori kode dari satu spesifikasi.
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
                Masukkan kebutuhan aplikasi Anda. Enam spesialis AI menyusun BRD/PRD, cetak biru{' '}
                <code>.drawio</code> &amp; Mermaid, menganalisis biaya cloud, lalu menulis seluruh file
                Next.js + PocketBase yang siap dijalankan dan diedit langsung.
              </p>

              <form onSubmit={create} className="mt-6 space-y-5">
                <div>
                  <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                    <label htmlFor="raw-prompt" className="text-sm font-medium">Spesifikasi aplikasi</label>
                    <div className="flex flex-wrap gap-1.5">
                      {PRESETS.map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => { setPrompt(preset.prompt); setPersona(preset.persona); }}
                          className="rounded-sm border border-border bg-card px-2 py-0.5 text-xs text-muted-foreground transition-[transform,background-color,border-color,color] duration-150 ease-out hover:border-primary hover:text-foreground active:scale-[0.98]"
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
                    placeholder="Jelaskan alur pengguna utama, data yang disimpan, dan fitur kunci aplikasi yang ingin Anda bangun…"
                    className="w-full resize-y rounded-sm border border-input bg-card p-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                  />
                </div>

                <fieldset>
                  <legend className="mb-2 text-sm font-medium">Mode kerja arsitek (Gem)</legend>
                  <div role="radiogroup" className="grid gap-2 sm:grid-cols-2">
                    {GEM_PERSONA_IDS.map((k) => (
                      <button
                        key={k}
                        type="button"
                        role="radio"
                        aria-checked={persona === k}
                        onClick={() => setPersona(k)}
                        className={`rounded-sm border p-2.5 text-left text-sm transition-[transform,background-color,border-color,color] duration-150 ease-out active:scale-[0.98] select-none ${
                          persona === k ? 'border-primary bg-primary/10 text-foreground' : 'border-border bg-card text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <span className="block font-semibold text-foreground">{GEM_PERSONAS[k].label}</span>
                        <span className="text-xs text-muted-foreground">{GEM_PERSONAS[k].desc}</span>
                      </button>
                    ))}
                  </div>
                </fieldset>

                {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="submit"
                    disabled={loading || prompt.trim().length < 3}
                    className="inline-flex h-10 items-center gap-2 rounded-sm bg-primary px-5 text-sm font-semibold text-primary-foreground transition-[transform,background-color,border-color,color] duration-150 ease-out hover:bg-primary/90 active:scale-[0.98] select-none disabled:opacity-50"
                  >
                    {loading ? 'Menyiapkan ruang kerja…' : 'Rakit Proyek Sekarang'}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <span className="text-xs text-muted-foreground">Lanjut ke unggah wireframe &amp; modul Skills di ruang kerja.</span>
                </div>
              </form>
            </div>

            <div className="lg:col-span-6 space-y-3">
              <div className="flex items-center justify-between rounded-sm border border-border bg-card/70 px-3 py-2 text-xs">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  <div>
                    <span className="font-semibold text-foreground">Kantor Software House AI</span>
                    <span className="hidden text-[11px] text-muted-foreground md:inline"> • Virtual Office 2D</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Link
                    href="/office"
                    className="inline-flex items-center gap-1 rounded-sm border border-border bg-card px-2 py-0.5 text-[11px] font-medium text-foreground transition-[transform,background-color,border-color,color] duration-150 ease-out hover:border-primary active:scale-[0.98]"
                    title="Buka Virtual Office Layar Penuh"
                  >
                    Buka Layar Penuh
                  </Link>
                  <a
                    href="/virtual-office/index.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-sm border border-border bg-background px-2 py-0.5 text-[11px] text-muted-foreground transition-[transform,background-color,border-color,color] duration-150 ease-out hover:border-primary hover:text-foreground active:scale-[0.98]"
                    title="Buka Virtual Office di Tab Baru Mandiri"
                  >
                    <span>Tab Baru</span>
                    <ExternalLink className="h-3 w-3 opacity-60" />
                  </a>
                </div>
              </div>
              <VirtualOffice activity={stageActivity} />
              <div className="rounded-sm border border-border bg-card p-3">
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-semibold text-foreground">
                    <Layers className="h-3.5 w-3.5 text-primary" /> Inspeksi Stasiun Produksi (Klik untuk simulasi)
                  </span>
                  <span className="text-muted-foreground">{currentStation.step}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {STATIONS.map((s, idx) => (
                    <button
                      key={s.role}
                      type="button"
                      onClick={() => setActiveStation(idx)}
                      className={`min-w-[140px] flex-1 rounded-sm border px-2.5 py-1.5 text-left text-xs transition-[transform,background-color,border-color,color] duration-150 ease-out active:scale-[0.98] select-none ${
                        activeStation === idx ? 'border-primary bg-primary/10 font-medium text-foreground' : 'border-border bg-background text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <span className="block text-[11px] text-primary">{s.step}</span>
                      <span className="block truncate">{s.title}</span>
                    </button>
                  ))}
                </div>
                <div className="mt-3 rounded-sm border border-border bg-[#090c14] p-3">
                  <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5 font-medium text-foreground">
                      <Terminal className="h-3.5 w-3.5 text-primary" /> Output Artefak: {currentStation.artifact}
                    </span>
                    <span>{currentStation.title}</span>
                  </div>
                  <pre className="overflow-x-auto text-xs leading-5 text-slate-300"><code>{currentStation.sample}</code></pre>
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
    </div>
  );
}
