import type { DesignToken, DiagramDoc } from '@/types';

/**
 * Offline demo content, used only when GEMINI_API_KEY is missing (or FACTORY_MOCK=1)
 * so the whole workflow can be exercised without calling the AI. Output is generic and
 * clearly labelled as demo data.
 */

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'app';

export function mockTokens(): DesignToken & { extractedTokens: string[] } {
  return {
    colors: { primary: '#2563eb', secondary: '#7c3aed', background: '#0f172a', text: '#e2e8f0', accent: '#22d3ee' },
    typography: { heading: 'Inter', body: 'Inter', scale: { h1: '3rem', h2: '2rem', body: '1rem' } },
    spacing: { sm: '0.5rem', md: '1rem', lg: '2rem' },
    radius: '0.75rem',
    uiStructure: ['Top navbar', 'Hero with primary CTA', 'Feature cards grid', 'Footer'],
    source: 'demo',
    extractedTokens: ['colors', 'typography', 'spacing', 'radius'],
  };
}

export function mockRisk(title: string) {
  return {
    risks: [
      { title: 'Lonjakan trafik AI', severity: 'high', description: 'Pemanggilan LLM berbiaya dan lambat saat banyak pengguna.', mitigation: 'Antrian job, cache hasil, dan batas kuota per pengguna.' },
      { title: 'SQLite single-writer', severity: 'medium', description: 'PocketBase (SQLite) membatasi penulisan paralel.', mitigation: 'Batch penulisan, WAL mode, migrasi ke Postgres bila perlu.' },
    ],
    bottlenecks: ['Latensi respons LLM', 'Ukuran payload file proyek besar'],
    costEstimate: {
      currency: 'USD',
      tiers: [
        { name: 'MVP (≤100 user)', monthlyUsd: 15 },
        { name: 'Growth (≤5k user)', monthlyUsd: 180 },
        { name: 'Scale (≤50k user)', monthlyUsd: 1400 },
      ],
      breakdown: [
        { item: 'Hosting (Vercel/VPS)', monthlyUsd: 10 },
        { item: 'Database & storage', monthlyUsd: 5 },
        { item: 'Gemini API', monthlyUsd: 0 },
      ],
      notes: `Data demo untuk "${title}". Estimasi nyata dihasilkan oleh AI.`,
    },
  };
}

export function mockPrd(title: string, prompt: string) {
  return {
    brd: `# Business Requirements Document (BRD) — ${title}

## 1. Ringkasan Eksekutif
Dokumen ini mendefinisikan persyaratan bisnis strategis untuk pengembangan **${title}**. Solusi ini dirancang untuk menjawab kebutuhan operasional nyata dan meningkatkan efisiensi proses kerja.

## 2. Latar Belakang & Identifikasi Masalah
${prompt || 'Proses operasional saat ini membutuhkan sistem otomasi terintegrasi untuk mempercepat alur kerja, mengurangi kesalahan manusia, dan menyajikan data secara real-time.'}

## 3. Tujuan Bisnis & Sasaran Strategis
- **Otomasi Proses:** Mengurangi waktu pengerjaan manual minimal 60%.
- **Validasi Cepat (Time to Market):** Meluncurkan versi MVP yang stabil dan siap diuji oleh pengguna target dalam hitungan minggu.
- **Transparansi & Akurasi Data:** Memastikan integritas data operasional tanpa inkonsistensi.

## 4. Ruang Lingkup Proyek (Scope of Work)
### In-Scope (MVP):
- Otentikasi dan manajemen akses pengguna (Role-Based Access).
- Pengelolaan entitas data operasional utama sesuai kebutuhan bisnis.
- Dashboard analitik ringkas untuk memantau performa harian.
- Validasi aturan bisnis dan proteksi data sensitif.

### Out-of-Scope (Fase Lanjutan):
- Integrasi ke sistem ERP korporat skala besar pihak ketiga (Fase 2).
- Migrasi database legasi yang tidak terdokumentasi.

## 5. Stakeholder Kunci
- **Pemilik Usaha / Manajemen:** Memerlukan visibilitas laporan, efisiensi biaya, dan kendali operasional.
- **Operator / Pengguna Lapangan:** Membutuhkan antarmuka yang cepat, intuitif, dan responsif.
- **Pelanggan Akhir:** Menikmati layanan yang lebih cepat, transparan, dan terpercaya.

## 6. Metrik Keberhasilan (KPIs)
- Tingkat adopsi pengguna aktif > 80% pada 30 hari pertama pasca rilis.
- Zero fatal data breach (kepatuhan OWASP Top 10 terpenuhi 100%).
- Uptime sistem minimal 99.5% pada runner produksi.`,
    prd: `# Product Requirements Document (PRD) — ${title}

## 1. Visi Produk & Ringkasan Solusi
**${title}** adalah aplikasi web modern berbasis Next.js 15 dan Tailwind CSS yang dirancang untuk memberikan pengalaman pengguna yang sederhana, bersih, dan berorientasi pada kecepatan eksekusi.

## 2. Kebutuhan Fungsional (Functional Requirements)
1. **Otentikasi & Keamanan:** Akses berbasis sesi aman dengan pemisahan wewenang.
2. **Katalog & Data Operasional:** Formulir input data dengan validasi client dan server.
3. **Pencatatan & Riwayat:** Penyimpanan status transaksi dan audit trail yang dapat ditelusuri.
4. **Dashboard Eksekutif:** Visualisasi metrik utama dengan pembaruan dinamis.

## 3. Kebutuhan Non-Fungsional (Non-Functional Requirements)
- **Performa:** Waktu muat halaman pertama < 1.5 detik (First Contentful Paint).
- **Akselerasi Hardware:** Komposisi render teroptimasi GPU, bebas jank dan scroll repaint penalty.
- **Keamanan:** Mematuhi OWASP Top 10 (Sanitasi input, proteksi XSS/CSRF, isolasi multi-tenant).
- **Ketersediaan:** Penyimpanan offline-first dengan sinkronisasi otomatis.`,
    userStories: [
      {
        id: 'US-1',
        story: `Sebagai pengguna, saya dapat masuk ke dalam sistem ${title} dengan aman agar data operasional terlindungi.`,
        acceptanceCriteria: [
          'Given pengguna memiliki akun terdaftar, When memasukkan email dan password valid, Then sistem memberikan akses ke dashboard utama.',
          'Given kredensial salah, When menekan tombol login, Then muncul pesan peringatan dan akses ditolak.',
        ],
      },
      {
        id: 'US-2',
        story: `Sebagai staf/operator, saya dapat mencatat dan memperbarui transaksi operasional secara real-time.`,
        acceptanceCriteria: [
          'Given form input dibuka, When mengisi data wajib dan menekan simpan, Then data tersimpan dan status langsung terbarui.',
          'Given kolom wajib kosong, When menekan simpan, Then form menampilkan validasi inline.',
        ],
      },
      {
        id: 'US-3',
        story: `Sebagai manajer/pemilik, saya dapat melihat ringkasan statistik dan metrik performa di dashboard.`,
        acceptanceCriteria: [
          'Given dashboard dibuka, When data baru masuk, Then kartu KPI otomatis mencerminkan angka terbaru tanpa reload penuh.',
        ],
      },
    ],
  };
}

const mk = (title: string, mermaid: string, nodes: DiagramDoc['nodes'], edges: DiagramDoc['edges']): DiagramDoc => ({ title, mermaid, nodes, edges });

function getDomainEntities(title = '', prompt = '') {
  const text = `${title} ${prompt}`.toLowerCase();
  if (text.includes('klinik') || text.includes('pasien') || text.includes('dokter') || text.includes('medis') || text.includes('resep')) {
    return {
      domain: 'Sistem Rekam Medis & Klinik Pratama',
      entities: [
        { id: 'PASIEN', label: 'Pasien (Data & Identitas)' },
        { id: 'DOKTER', label: 'Dokter (Spesialis & SIP)' },
        { id: 'JADWAL_PRAKTEK', label: 'Jadwal Praktek Dokter' },
        { id: 'ANTREAN_KLINIK', label: 'Antrean Pasien Harian' },
        { id: 'REKAM_MEDIS', label: 'Rekam Medis (SOAP & ICD-10)' },
        { id: 'RESEP_OBAT', label: 'Resep Obat & Dosis' },
      ],
      relations: [
        { from: 'DOKTER', to: 'JADWAL_PRAKTEK', label: 'memiliki' },
        { from: 'PASIEN', to: 'ANTREAN_KLINIK', label: 'mengambil' },
        { from: 'PASIEN', to: 'REKAM_MEDIS', label: 'memiliki_riwayat' },
        { from: 'DOKTER', to: 'REKAM_MEDIS', label: 'memeriksa_dan_mencatat' },
        { from: 'REKAM_MEDIS', to: 'RESEP_OBAT', label: 'menghasilkan' },
      ],
      erdMermaid: `erDiagram
    PASIEN ||--o{ ANTREAN_KLINIK : mendaftar
    PASIEN ||--o{ REKAM_MEDIS : memiliki
    DOKTER ||--o{ JADWAL_PRAKTEK : memiliki
    DOKTER ||--o{ REKAM_MEDIS : memeriksa
    REKAM_MEDIS ||--o{ RESEP_OBAT : menghasilkan

    PASIEN {
        string id PK
        string no_rm UK
        string nama
        string nik
        string tgl_lahir
        string no_telp
    }
    DOKTER {
        string id PK
        string nama
        string spesialisasi
        string no_sip
    }
    ANTREAN_KLINIK {
        string id PK
        string pasien_id FK
        string dokter_id FK
        number nomor_antrean
        string status
        datetime waktu_daftar
    }
    REKAM_MEDIS {
        string id PK
        string pasien_id FK
        string dokter_id FK
        string keluhan_utama
        string diagnosa
        string tindakan
        datetime tgl_kunjungan
    }
    RESEP_OBAT {
        string id PK
        string rekam_medis_id FK
        string nama_obat
        string aturan_pakai
        number jumlah
    }`,
      umlMermaid: `classDiagram
    class Pasien {
        +String id
        +String noRm
        +String nama
        +daftarAntrean()
        +lihatRiwayat()
    }
    class Dokter {
        +String id
        +String nama
        +String noSip
        +buatRekamMedis()
        +buatResep()
    }
    class AntreanKlinik {
        +String id
        +Int nomorAntrean
        +String status
        +panggilPasien()
    }
    class RekamMedis {
        +String id
        +String diagnosa
        +String tindakan
        +enkripsiData()
    }
    class ResepObat {
        +String id
        +String namaObat
        +cetakResep()
    }
    Pasien "1" --> "*" AntreanKlinik
    Pasien "1" --> "*" RekamMedis
    Dokter "1" --> "*" RekamMedis
    RekamMedis "1" --> "*" ResepObat`,
      dfdMermaid: `flowchart TD
    P[Pasien] -->|Registrasi & Ambil Nomor| A[1.0 Manajemen Antrean]
    A -->|Simpan Antrean| D1[(Data Antrean)]
    D[Dokter] -->|Panggil Pasien & Periksa| R[2.0 Layanan Rekam Medis]
    R -->|Simpan SOAP & Diagnosa| D2[(Data Rekam Medis Terenkripsi)]
    R -->|Kirim Resep| F[3.0 Cetak & Farmasi]
    F -->|Detail Obat| D3[(Stok & Resep Obat)]
    F -->|Cetak Lembar Resep| P`,
    };
  }

  if (text.includes('kasir') || text.includes('warung') || text.includes('toko') || text.includes('pos')) {
    return {
      domain: 'Sistem Kasir & Point of Sale (POS)',
      entities: [
        { id: 'KASIR', label: 'Kasir & Pengguna' },
        { id: 'PRODUK', label: 'Katalog Produk & Harga' },
        { id: 'STOK_BARANG', label: 'Manajemen Stok Barang' },
        { id: 'TRANSAKSI', label: 'Transaksi Penjualan' },
        { id: 'ITEM_TRANSAKSI', label: 'Rincian Belanja (Detail)' },
        { id: 'LAPORAN_HARIAN', label: 'Laporan Omzet & Laba' },
      ],
      relations: [
        { from: 'KASIR', to: 'TRANSAKSI', label: 'memproses' },
        { from: 'PRODUK', to: 'STOK_BARANG', label: 'memiliki' },
        { from: 'PRODUK', to: 'ITEM_TRANSAKSI', label: 'dijual_sebagai' },
        { from: 'TRANSAKSI', to: 'ITEM_TRANSAKSI', label: 'berisi' },
        { from: 'TRANSAKSI', to: 'LAPORAN_HARIAN', label: 'direkap_ke' },
      ],
      erdMermaid: `erDiagram
    USERS ||--o{ TRANSACTIONS : creates
    TRANSACTIONS ||--|{ TRANSACTION_ITEMS : contains
    PRODUCTS ||--o{ TRANSACTION_ITEMS : referenced_in

    USERS {
        string id PK
        string username
        string role
    }
    PRODUCTS {
        string id PK
        string code UK
        string name
        number buy_price
        number sell_price
        number stock
        number min_stock
    }
    TRANSACTIONS {
        string id PK
        string user_id FK
        string invoice_number
        number total_amount
        string payment_method
        number cash_paid
        number change_amount
        datetime created_at
    }
    TRANSACTION_ITEMS {
        string id PK
        string transaction_id FK
        string product_id FK
        number quantity
        number price_at_sale
        number subtotal
    }`,
      umlMermaid: `classDiagram
    class User {
        +String id
        +String username
        +login()
    }
    class Product {
        +String id
        +String name
        +Number sellPrice
        +Number stock
        +updateStock()
    }
    class Transaction {
        +String id
        +String invoiceNo
        +Number totalAmount
        +checkout()
    }
    class TransactionItem {
        +String id
        +Number quantity
        +Number subtotal
    }
    User "1" --> "*" Transaction
    Transaction "1" *-- "*" TransactionItem
    Product "1" --> "*" TransactionItem`,
      dfdMermaid: `flowchart TD
    K[Kasir] -->|Scan/Pilih Barang| P1[1.0 Olah Transaksi]
    P1 -->|Potong Stok| D1[(Data Stok Produk)]
    P1 -->|Simpan Faktur| D2[(Data Penjualan)]
    P1 -->|Cetak Struk Nota| K
    Pemilik[Pemilik Warung] -->|Query Omzet & Profit| P2[2.0 Laporan Keuangan]
    D2 -->|Agregasi Penjualan| P2
    P2 -->|Laporan Harian| Pemilik`,
    };
  }

  // Smart dynamic extraction based on words in title
  const words = title.replace(/[^a-zA-Z0-9\s]/g, '').split(/\s+/).filter((w) => w.length > 2).slice(0, 4);
  const w1 = words[0] ? words[0].toUpperCase() : 'USER';
  const w2 = words[1] ? words[1].toUpperCase() : 'CORE_DATA';
  const w3 = words[2] ? words[2].toUpperCase() : 'TRANSACTION';
  const w4 = words[3] ? words[3].toUpperCase() : 'REPORT';

  return {
    domain: title || 'Aplikasi Web',
    entities: [
      { id: w1, label: `${w1} (Data Master)` },
      { id: w2, label: `${w2} (Entitas Operasional)` },
      { id: w3, label: `${w3} (Transaksi & Aktivitas)` },
      { id: w4, label: `${w4} (Rekapitulasi & Laporan)` },
    ],
    relations: [
      { from: w1, to: w2, label: 'mengelola' },
      { from: w2, to: w3, label: 'menghasilkan' },
      { from: w3, to: w4, label: 'direkap_ke' },
    ],
    erdMermaid: `erDiagram
    ${w1} ||--o{ ${w2} : mengelola
    ${w2} ||--o{ ${w3} : menghasilkan
    ${w3} ||--o{ ${w4} : direkap

    ${w1} {
        string id PK
        string nama
        string status
        datetime created_at
    }
    ${w2} {
        string id PK
        string ${w1.toLowerCase()}_id FK
        string deskripsi
        number nilai
    }
    ${w3} {
        string id PK
        string ${w2.toLowerCase()}_id FK
        string status_proses
        datetime tanggal
    }
    ${w4} {
        string id PK
        datetime periode
        number total_akumulasi
    }`,
    umlMermaid: `classDiagram
    class ${w1} {
        +String id
        +String nama
        +kelolaData()
    }
    class ${w2} {
        +String id
        +String deskripsi
        +validasi()
    }
    class ${w3} {
        +String id
        +String status
        +prosesAktivitas()
    }
    class ${w4} {
        +String id
        +generasiLaporan()
    }
    ${w1} "1" --> "*" ${w2}
    ${w2} "1" --> "*" ${w3}
    ${w3} "1" --> "*" ${w4}`,
    dfdMermaid: `flowchart TD
    User([Pengguna Terotentikasi]) -->|Input & Akses Data| P1[1.0 Kelola ${w1} & ${w2}]
    P1 -->|Simpan Entitas| D1[(Data Store ${w1})]
    P1 -->|Kirim Alur Operasional| P2[2.0 Proses ${w3}]
    P2 -->|Simpan Status| D2[(Log Aktivitas ${w3})]
    P2 -->|Ringkasan Eksekutif| P3[3.0 Laporan ${w4}]
    P3 -->|Tampilkan KPI Dashboard| User`,
  };
}

export function mockDiagrams(title = '', prompt = ''): Record<'uml' | 'erd' | 'dfd' | 'architecture', DiagramDoc> {
  const d = getDomainEntities(title, prompt);

  return {
    erd: mk(
      `ERD — ${d.domain}`,
      d.erdMermaid,
      d.entities,
      d.relations
    ),
    uml: mk(
      `UML Class Diagram — ${d.domain}`,
      d.umlMermaid,
      d.entities,
      d.relations.map((r) => ({ ...r, label: '1..*' }))
    ),
    dfd: mk(
      `DFD Level 1 — ${d.domain}`,
      d.dfdMermaid,
      d.entities,
      d.relations.map((r) => ({ ...r, label: r.label.replace(/_/g, ' ') }))
    ),
    architecture: mk(
      `System Architecture — ${d.domain}`,
      `flowchart TD
    subgraph Client["Client Tier (Next.js 15 App Router)"]
        UI_Web["Modern Responsive Web UI"]
        UI_Mobile["Mobile Native Touch Layout"]
    end
    subgraph AppServer["Application Server (Node.js & Edge API)"]
        API_Gateway["API Handlers & Security Shield"]
        Domain_Engine["${d.domain} Logic Engine"]
    end
    subgraph DataStorage["Data Persistence Tier"]
        DB_Storage[("Database (PocketBase / SQLite)")]
        Cache_Store[("Session & Telemetry Store")]
    end

    UI_Web -->|HTTPS / REST & SSE| API_Gateway
    UI_Mobile -->|HTTPS REST| API_Gateway
    API_Gateway -->|Sanitized Payloads| Domain_Engine
    Domain_Engine -->|Read / Write Transactions| DB_Storage
    Domain_Engine -->|State & TTL Cleanup| Cache_Store`,
      [
        { id: 'Client', label: 'Client Tier (Next.js 15)' },
        { id: 'AppServer', label: 'App Server (Domain Engine)' },
        { id: 'DataStorage', label: 'Data Tier (PocketBase)' },
      ],
      [
        { from: 'Client', to: 'AppServer', label: 'HTTPS REST / SSE' },
        { from: 'AppServer', to: 'DataStorage', label: 'SQL / JSON Store' },
      ]
    ),
  };
}

export function mockStack(skills: string[]) {
  return {
    stack: [
      { layer: 'Frontend', choice: 'Next.js 15 + Tailwind CSS', reason: 'Cepat, SSR, ekosistem besar.' },
      { layer: 'Backend/DB', choice: 'PocketBase', reason: 'Satu binary, SQLite, auth bawaan.' },
      { layer: 'AI', choice: 'Gemini API', reason: 'Free tier tersedia.' },
    ],
    securityRules: [
      { owasp: 'A01 Broken Access Control', rule: 'Verifikasi kepemilikan data di setiap endpoint.' },
      { owasp: 'A03 Injection', rule: 'Validasi input dengan zod; gunakan filter terparameter.' },
      { owasp: 'A05 Security Misconfiguration', rule: 'Aktifkan security headers dan matikan debug di produksi.' },
    ],
    skillsApplied: skills,
  };
}

export function mockQa() {
  return {
    strategy: 'Unit test logika inti, integration test API, E2E untuk alur utama.',
    testCases: [
      { id: 'TC-1', title: 'Registrasi valid', steps: ['Isi form', 'Submit'], expected: 'Akun dibuat' },
      { id: 'TC-2', title: 'Judul kosong ditolak', steps: ['Buka form item', 'Submit kosong'], expected: 'Pesan error tampil' },
    ],
  };
}

export function mockFiles(title: string, prompt: string, skills: string[]): { path: string; content: string }[] {
  const name = slug(title);
  const esc = (s: string) => s.replace(/</g, '&lt;');
  return [
    {
      path: 'package.json',
      content: JSON.stringify(
        {
          name,
          version: '0.1.0',
          private: true,
          scripts: { dev: 'next dev', build: 'next build', start: 'next start' },
          dependencies: { next: '15.0.0', react: '^18.3.1', 'react-dom': '^18.3.1', pocketbase: '^0.21.4' },
          devDependencies: { typescript: '^5.6.3', tailwindcss: '^3.4.14', postcss: '^8.4.47', autoprefixer: '^10.4.20', '@types/react': '^18.3.0', '@types/node': '^20.16.0' },
        },
        null,
        2
      ),
    },
    { path: 'tsconfig.json', content: JSON.stringify({ compilerOptions: { target: 'ES2022', lib: ['dom', 'esnext'], jsx: 'preserve', module: 'esnext', moduleResolution: 'bundler', strict: true, noEmit: true, esModuleInterop: true, skipLibCheck: true, plugins: [{ name: 'next' }], paths: { '@/*': ['./*'] } }, include: ['**/*.ts', '**/*.tsx'], exclude: ['node_modules'] }, null, 2) },
    { path: 'tailwind.config.js', content: "module.exports = { content: ['./app/**/*.{ts,tsx}'], theme: { extend: {} }, plugins: [] };\n" },
    { path: 'postcss.config.js', content: 'module.exports = { plugins: { tailwindcss: {}, autoprefixer: {} } };\n' },
    { path: 'app/globals.css', content: '@tailwind base;\n@tailwind components;\n@tailwind utilities;\n' },
    { path: 'app/layout.tsx', content: `import './globals.css';\n\nexport const metadata = { title: ${JSON.stringify(title)} };\n\nexport default function RootLayout({ children }: { children: React.ReactNode }) {\n  return (\n    <html lang="id">\n      <body className="bg-slate-900 text-slate-100">{children}</body>\n    </html>\n  );\n}\n` },
    { path: 'app/page.tsx', content: `export default function Home() {\n  return (\n    <main className="min-h-screen flex flex-col items-start justify-center gap-4 p-8 max-w-3xl mx-auto">\n      <h1 className="text-3xl font-bold">${title.replace(/[`$\\]/g, '')}</h1>\n      <p className="max-w-xl text-slate-400">${prompt.slice(0, 160).replace(/[`$\\{}<>]/g, '')}</p>\n      <button className="rounded-md bg-slate-100 text-slate-950 px-5 py-2.5 text-sm font-semibold hover:bg-slate-200">Mulai Sekarang</button>\n    </main>\n  );\n}\n` },
    { path: 'lib/pocketbase.ts', content: "import PocketBase from 'pocketbase';\n\nexport const pb = new PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL ?? 'http://127.0.0.1:8090');\n" },
    { path: '.env.example', content: 'NEXT_PUBLIC_POCKETBASE_URL=http://127.0.0.1:8090\n' },
    { path: 'README.md', content: `# ${title}\n\n> Dibuat dalam mode demo offline (tanpa GEMINI_API_KEY).\n\n${prompt}\n\n## Menjalankan\n\n\`\`\`bash\nnpm install\nnpm run dev\n\`\`\`\n${skills.length ? `\n## Skills terpasang\n${skills.map((s) => `- ${s}`).join('\n')}\n` : ''}` },
    {
      path: 'preview.html',
      content: `<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><script src="https://cdn.tailwindcss.com"></script></head><body class="bg-slate-950 text-slate-100 min-h-screen"><nav class="flex items-center justify-between px-6 py-4 border-b border-slate-800"><span class="font-bold text-slate-100 text-lg">${esc(title)}</span><div class="flex gap-6 text-sm text-slate-400"><a href="#">Ringkasan</a><a href="#">Data Inti</a><a href="#">Laporan</a></div></nav><main class="max-w-4xl mx-auto px-6 py-14 space-y-8"><header class="space-y-3"><p class="text-xs text-slate-400">Preview Sandbox · ${esc(name)}</p><h1 class="text-3xl font-bold tracking-tight">${esc(title)}</h1><p class="max-w-2xl text-slate-300 text-sm leading-relaxed">${esc(prompt.slice(0, 220))}</p><div class="pt-2"><button class="rounded-sm bg-slate-100 hover:bg-slate-200 text-slate-950 px-4 py-2 text-sm font-semibold">Tambah Entri Baru</button></div></header><section class="grid sm:grid-cols-2 gap-4"><div class="rounded-sm border border-slate-800 bg-slate-900/70 p-4"><p class="text-xs text-slate-400">Modul Aktif</p><p class="mt-1 font-semibold">${skills.length ? esc(skills.join(', ')) : 'Standar MVP'}</p></div><div class="rounded-sm border border-slate-800 bg-slate-900/70 p-4"><p class="text-xs text-slate-400">Entitas Database</p><p class="mt-1 font-semibold">users, projects, items</p></div></section></main></body></html>`,
    },
  ];
}
