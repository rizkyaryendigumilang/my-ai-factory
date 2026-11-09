'use client';

import { useEffect, useState } from 'react';
import {
  ArrowRight,
  Bot,
  Building2,
  Code2,
  Cpu,
  Database,
  ExternalLink,
  FileText,
  Layers,
  Palette,
  Server,
  ShieldCheck,
  TrendingUp,
  Workflow,
  X,
} from 'lucide-react';

interface SoftwareHouseSchemeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DIVISIONS = [
  {
    step: 'Tahap 1',
    id: 'agent-1-pm',
    title: 'Product Management (PM)',
    lead: 'PM Specialist',
    desk: 'Meja Eksekutif Barat',
    icon: FileText,
    provider: 'Hermes VPS (Port 8444)',
    input: 'Brief Klien & Persona Gem (Raw Prompt)',
    output: 'BRD, PRD, User Stories & Acceptance Criteria (brd_prd.md)',
    sla: '< 45 detik',
    description:
      'Menganalisis kebutuhan bisnis, menyusun spesifikasi fungsional, dan mendefinisikan kriteria penerimaan yang terukur untuk setiap fitur.',
  },
  {
    step: 'Tahap 2',
    id: 'agent-5-ux',
    title: 'UI/UX & Design System',
    lead: 'Stitch Designer',
    desk: 'Studio Desain Timur',
    icon: Palette,
    provider: 'Native AI Factory / 9Router',
    input: 'Referensi Visual, URL Acuan & Sketsa Wireframe',
    output: 'Design Tokens, Palet Warna Hex, Tipografi, Atomic UI (design_tokens.json)',
    sla: '< 30 detik',
    description:
      'Mengekstrak token desain antarmuka, menetapkan hierarki tipografi IBM Plex, dan menentukan struktur komponen antarmuka responsif.',
  },
  {
    step: 'Tahap 3',
    id: 'intelligence-risk',
    title: 'Cloud Architecture & Risk Intelligence',
    lead: 'Risk Scout',
    desk: 'Stasiun Analisis Infrastruktur',
    icon: TrendingUp,
    provider: 'Hermes VPS (Port 8444)',
    input: 'Spesifikasi Produk & Profil Beban Pengguna',
    output: 'Daftar Bottleneck, Mitigasi Risiko, Estimasi Biaya Cloud 3 Skala (risk_analysis.md)',
    sla: '< 40 detik',
    description:
      'Menganalisis potensi kegagalan paralel, batas kuota transaksi, dan mengestimasi biaya cloud AWS/GCP pada skala MVP, Growth, dan Enterprise.',
  },
  {
    step: 'Tahap 4',
    id: 'agent-4-analyst',
    title: 'System Analyst & Data Architect',
    lead: 'System Analyst',
    desk: 'Meja Arsitektur Data',
    icon: Database,
    provider: '9Router Gateway (Claude 3.5)',
    input: 'User Stories PRD & Token Desain',
    output: 'ERD Database, Class UML, DFD Level 1, Format DrawIO XML (erd.drawio, uml.mmd)',
    sla: '< 60 detik',
    description:
      'Merancang skema relasi entitas database terintegrasi, diagram aliran data proses, dan visualisasi format Draw.io siap buka.',
  },
  {
    step: 'Tahap 5',
    id: 'tech-stack-security',
    title: 'Security Architecture & QA Hardening',
    lead: 'Security Architect',
    desk: 'Stasiun Audit Keamanan',
    icon: ShieldCheck,
    provider: 'Hermes VPS (Port 8444)',
    input: 'Skema ERD & Fitur PRD',
    output: 'Audit OWASP Top 10, Validasi Skema Zod, QA Test Matrix (tech_stack.md, qa_plan.md)',
    sla: '< 45 detik',
    description:
      'Menerapkan proteksi keamanan tingkat tinggi (A01 Broken Access Control, A03 Injection, CORS/CSRF) dan skenario uji verifikasi otomatis.',
  },
  {
    step: 'Tahap 6',
    id: 'agent-coder',
    title: 'Engineering & Fullstack Construction',
    lead: 'Fullstack Coder',
    desk: 'Engineering Bay Selatan',
    icon: Code2,
    provider: '9Router Gateway (DeepSeek Coder)',
    input: 'Semua Artefak Sebelumnya (Tokens, PRD, ERD, Security)',
    output: 'Direktori Kode Lengkap Next.js 15, TypeScript, Unit Tests, Live Sandbox (package.json, app/)',
    sla: '< 90 detik',
    description:
      'Mengonstruksi seluruh berkas sumber aplikasi Next.js App Router yang sinkron dengan spesifikasi, tanpa placeholder TODO, dan siap diekspor.',
  },
];

const OFFICE_ZONES = [
  {
    name: 'Zona Manajemen & Produk (Executive Wing)',
    items: ['Meja Kerja CEO Kiky (Boss Desk)', 'Meja Kerja Product Manager (PM)', 'Papan Perencanaan Kanban', 'Dokumentasi Spesifikasi PRD'],
    color: 'border-l-primary',
  },
  {
    name: 'Zona Desain & Frontend (Creative Studio)',
    items: ['Meja UI/UX Stitch', 'Display Palet Warna & Token Tipografi', 'Preview Antarmuka'],
    color: 'border-l-sky-500',
  },
  {
    name: 'Ruang Rapat Sentral (Central Meeting Table)',
    items: ['Meja Diskusi 8 Kursi', 'Tempat Serah-Terima Artefak Antar Divisi', 'Review Kode & Kesepakatan Tim'],
    color: 'border-l-amber-500',
  },
  {
    name: 'Engineering & Data Bay (Konstruksi Kode)',
    items: ['Meja System Analyst', 'Meja Security Architect', 'Meja Fullstack Coder Next.js'],
    color: 'border-l-emerald-500',
  },
  {
    name: 'Ruang Server VPS & Telemetri (Infrastructure Hub)',
    items: ['Hermes Agent Bridge (Port 8444)', '9Router Multi-Model Gateway (Port 8443)', 'Server Racks & Health Monitor'],
    color: 'border-l-purple-500',
  },
  {
    name: 'Pantry & Break Area (Relaxation Lounge)',
    items: ['Mesin Kopi & Water Dispenser', 'Meja Ping Pong & Sofa Santai', 'Tanaman Hias & Rak Buku'],
    color: 'border-l-muted-foreground',
  },
];

export default function SoftwareHouseSchemeModal({
  isOpen,
  onClose,
}: SoftwareHouseSchemeModalProps) {
  const [activeTab, setActiveTab] = useState<'workflow' | 'divisions' | 'office' | 'handover'>('workflow');

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 animate-scrim-in"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[92vh] w-full max-w-5xl flex-col rounded-lg border border-white/10 bg-card/95 shadow-2xl backdrop-blur-xl animate-modal-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-sm bg-primary text-primary-foreground">
              <Building2 className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                Skema Kantor Software House AI
              </h2>
              <p className="text-xs text-muted-foreground">
                Koreografi 6 divisi spesialis, ruang rapat serah-terima artefak, dan orkestrasi VPS mandiri.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-sm p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label="Tutup jendela skema"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex shrink-0 items-center gap-1 border-b border-border bg-secondary/30 px-5 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('workflow')}
            className={`border-b-2 px-3 py-2 text-xs font-medium transition-colors ${
              activeTab === 'workflow'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Alur Kerja Produksi
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('divisions')}
            className={`border-b-2 px-3 py-2 text-xs font-medium transition-colors ${
              activeTab === 'divisions'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            6 Divisi & Tanggung Jawab
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('office')}
            className={`border-b-2 px-3 py-2 text-xs font-medium transition-colors ${
              activeTab === 'office'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Tata Letak Kantor (2D Layout)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('handover')}
            className={`border-b-2 px-3 py-2 text-xs font-medium transition-colors ${
              activeTab === 'handover'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Protokol Serah-Terima Artefak
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* TAB 1: WORKFLOW */}
          {activeTab === 'workflow' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Alur Produksi Software House dari Meja ke Meja
                </h3>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  Setiap proyek dieksekusi secara berurutan. Saat satu divisi menyelesaikan tugasnya, agen berjalan ke meja rapat tengah untuk memvalidasi dan menyerahkan artefak ke divisi berikutnya.
                </p>
              </div>

              {/* Sequential Pipeline Flow Diagram */}
              <div className="grid gap-3">
                {DIVISIONS.map((div, i) => {
                  const Icon = div.icon;
                  return (
                    <div key={div.id} className="relative flex flex-col md:flex-row items-stretch gap-3">
                      <div className="flex flex-1 items-start gap-3 rounded-sm border border-border bg-card p-3.5 transition-colors hover:border-primary">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-secondary text-primary font-bold text-xs">
                          {i + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-1">
                            <span className="font-semibold text-xs text-foreground">
                              {div.title}
                            </span>
                            <span className="rounded-sm border border-border bg-secondary px-1.5 py-0.5 text-[10px] text-primary">
                              {div.provider}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {div.description}
                          </p>

                          <div className="mt-2.5 grid gap-2 sm:grid-cols-2 rounded-sm bg-secondary/50 p-2 text-[11px]">
                            <div>
                              <span className="font-medium text-muted-foreground block text-[10px]">
                                Input Divisi:
                              </span>
                              <span className="text-foreground">{div.input}</span>
                            </div>
                            <div>
                              <span className="font-medium text-muted-foreground block text-[10px]">
                                Keluaran Artefak:
                              </span>
                              <span className="text-primary font-medium">{div.output}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {i < DIVISIONS.length - 1 && (
                        <div className="hidden md:flex items-center justify-center px-1 text-muted-foreground">
                          <ArrowRight className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Telemetry & Meeting Integration Note */}
              <div className="rounded-sm border border-border bg-secondary/30 p-3.5 text-xs text-muted-foreground">
                <div className="flex items-center gap-2 text-foreground font-semibold mb-1">
                  <Workflow className="h-4 w-4 text-primary" />
                  <span>Koreografi Meja Rapat & Orkestrasi VPS</span>
                </div>
                <p className="leading-relaxed">
                  Selama alur berlangsung, status agen disinkronkan ke kanvas 2D Virtual Office: status <strong>Mengetik</strong> saat bekerja di meja masing-masing, dan status <strong>Rapat</strong> saat bertemu di meja sentral untuk transfer artefak. Seluruh telemetri dipantau oleh Hermes VPS (port 8444) dan 9Router Gateway (port 8443).
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: 6 DIVISIONS */}
          {activeTab === 'divisions' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Struktur Kepemimpinan & 6 Divisi Spesialis Software House
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Dipimpin oleh CEO di Boss Desk sentral, didukung 6 divisi spesialis terintegrasi dan agen telemetri VPS.
                </p>
              </div>

              {/* CEO Leadership Card */}
              <div className="rounded-sm border border-primary/50 bg-primary/5 p-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-sm bg-primary text-xs font-bold text-primary-foreground">
                      CEO
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-xs text-foreground">kiky</span>
                        <span className="rounded-sm border border-primary/30 bg-primary/10 px-1 py-0.5 text-[10px] text-primary font-medium">
                          Chief Executive Officer
                        </span>
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        Stasiun: Boss Desk Sentral (x: 500, y: 140) · Trophy & Jam Kantor
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-medium text-primary">
                    Kepemimpinan & Pengawasan Produksi
                  </span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                  Menetapkan visi produk, memimpin orkestrasi 6 divisi, menyetujui serah-terima fase di meja rapat, dan mengawasi jalannya kantor software house secara menyeluruh.
                </p>
              </div>

              <div className="grid gap-3.5 md:grid-cols-2">
                {DIVISIONS.map((div) => {
                  const Icon = div.icon;
                  return (
                    <div
                      key={div.id}
                      className="flex flex-col justify-between rounded-sm border border-border bg-card p-4 transition-colors hover:border-border/80"
                    >
                      <div>
                        <div className="flex items-center justify-between border-b border-border pb-2.5">
                          <div className="flex items-center gap-2">
                            <span className="flex h-7 w-7 items-center justify-center rounded-sm bg-primary/10 text-primary">
                              <Icon className="h-4 w-4" />
                            </span>
                            <div>
                              <div className="font-semibold text-xs text-foreground">
                                {div.title}
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                Inisial: <strong className="text-foreground">{div.lead}</strong> · {div.desk}
                              </div>
                            </div>
                          </div>
                          <span className="rounded-sm border border-border bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
                            {div.step}
                          </span>
                        </div>

                        <p className="mt-2.5 text-xs text-muted-foreground leading-relaxed">
                          {div.description}
                        </p>

                        <div className="mt-3 space-y-1.5 border-t border-border/70 pt-2.5 text-xs">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground text-[11px]">Penyedia Default:</span>
                            <span className="font-medium text-foreground text-[11px]">{div.provider}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground text-[11px]">Target SLA:</span>
                            <span className="font-medium text-primary text-[11px]">{div.sla}</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 rounded-sm bg-secondary/50 p-2 text-[11px]">
                        <span className="block text-[10px] font-medium text-muted-foreground">Artefak Utama:</span>
                        <span className="text-foreground font-medium">{div.output}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: OFFICE LAYOUT */}
          {activeTab === 'office' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Tata Letak Ruang Kantor 2D (Spatial Desk Mapping)
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Denah virtual office 1000x740 piksel dibagi menjadi 6 zona kerja kolaboratif dengan 65+ perabot interaktif.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {OFFICE_ZONES.map((zone) => (
                  <div
                    key={zone.name}
                    className="rounded-sm border border-border bg-card p-3.5"
                  >
                    <h4 className="font-semibold text-xs text-foreground mb-2">
                      {zone.name}
                    </h4>
                    <ul className="space-y-1 text-xs text-muted-foreground">
                      {zone.items.map((it) => (
                        <li key={it} className="flex items-center gap-1.5">
                          <span className="h-1 w-1 rounded-sm bg-muted-foreground" />
                          <span>{it}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              <div className="rounded-sm border border-border bg-secondary/30 p-3.5 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground block mb-1">
                  Navigasi Karakter & Pathfinding
                </span>
                <p className="leading-relaxed">
                  Karakter spesialis bergerak dinamis di atas kanvas 2D menggunakan pathfinding grid. Agen otomatis berjalan ke meja masing-masing saat menerima pekerjaan, berjalan ke meja rapat sentral saat serah-terima fase, dan berjalan santai ke area pantry saat idle.
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: HANDOVER CONTRACTS */}
          {activeTab === 'handover' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Protokol Serah-Terima Artefak (Contract Handover)
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Untuk mencegah halusinasi dan inkonsistensi arsitektur, setiap divisi diwajibkan mematuhi kontrak data ketat.
                </p>
              </div>

              <div className="space-y-3">
                <div className="rounded-sm border border-border bg-card p-3.5">
                  <div className="flex items-center gap-2 font-semibold text-xs text-foreground mb-1.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-sm bg-primary/20 text-primary text-[11px] font-bold">1</span>
                    <span>Kontrak BRD/PRD → System Analyst & Security</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Nama entitas, user story ID (US-01, US-02), dan acceptance criteria yang disusun oleh PM bersifat <em>immutable</em>. System Analyst wajib menggunakan entitas yang persis sama di diagram ERD dan DFD.
                  </p>
                </div>

                <div className="rounded-sm border border-border bg-card p-3.5">
                  <div className="flex items-center gap-2 font-semibold text-xs text-foreground mb-1.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-sm bg-primary/20 text-primary text-[11px] font-bold">2</span>
                    <span>Kontrak Design Tokens → Fullstack Coder</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Palet warna (primary, surface, background), font family IBM Plex, dan daftar komponen atomic yang diekstrak oleh Stitch langsung diinjeksi ke <code>tailwind.config.ts</code> dan <code>app/globals.css</code>.
                  </p>
                </div>

                <div className="rounded-sm border border-border bg-card p-3.5">
                  <div className="flex items-center gap-2 font-semibold text-xs text-foreground mb-1.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-sm bg-primary/20 text-primary text-[11px] font-bold">3</span>
                    <span>Kontrak OWASP Security → Konstruksi Kode</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Setiap aturan keamanan dari Security Architect (sanitasi input, isolasi cookie session per user, rate limit) wajib diwujudkan dalam kode nyata Next.js tanpa ada modul placeholder.
                  </p>
                </div>

                <div className="rounded-sm border border-border bg-card p-3.5">
                  <div className="flex items-center gap-2 font-semibold text-xs text-foreground mb-1.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-sm bg-primary/20 text-primary text-[11px] font-bold">4</span>
                    <span>Kontrak Kompresi Konteks ECC (Extended Context Compressor)</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Seluruh artefak diringkas ke dalam batas karakter ketat sebelum diserahkan ke Coder, memastikan seluruh file Next.js dihasilkan lengkap, lolos uji unit test, dan siap unduh sebagai <code>.zip</code>.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex shrink-0 items-center justify-between border-t border-border bg-card px-5 py-3 text-xs">
          <span className="text-muted-foreground">
            Arsitektur Terintegrasi: Hermes VPS (:8444) · 9Router (:8443) · Native AI Factory
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-sm bg-primary px-3.5 py-1.5 font-medium text-primary-foreground transition-[transform,background-color,border-color,color] duration-150 ease-out hover:bg-primary/90 active:scale-[0.98]"
          >
            Tutup Skema
          </button>
        </div>
      </div>
    </div>
  );
}
