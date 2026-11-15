import type { DiagramDoc, Project } from '@/types';

/**
 * Normalizes and sanitizes BRD and PRD payloads from diverse LLM outputs.
 * Guarantees that neither BRD nor PRD is ever blank or missing.
 */
export function normalizeBrdPrd(project: Pick<Project, 'title' | 'raw_prompt' | 'gem_persona'>, raw: any) {
  let brd = '';
  let prd = '';
  let userStories: any[] = [];

  if (raw && typeof raw === 'object') {
    // Check multiple casing and semantic variants for BRD
    brd = String(
      raw.brd ||
      raw.BRD ||
      raw.businessRequirements ||
      raw.business_requirements ||
      raw.businessDoc ||
      raw.business_requirements_document ||
      ''
    ).trim();

    // Check multiple casing and semantic variants for PRD
    prd = String(
      raw.prd ||
      raw.PRD ||
      raw.productRequirements ||
      raw.product_requirements ||
      raw.productSpec ||
      raw.product_requirements_document ||
      ''
    ).trim();

    // Check user stories array
    const rawStories = raw.userStories || raw.user_stories || raw.stories || [];
    if (Array.isArray(rawStories)) {
      userStories = rawStories.map((s: any, idx: number) => {
        if (typeof s === 'string') {
          return {
            id: `US-${idx + 1}`,
            story: s,
            acceptanceCriteria: ['Given user accesses feature, When action is performed, Then system completes successfully.'],
          };
        }
        return {
          id: String(s.id || `US-${idx + 1}`),
          story: String(s.story || s.title || `User story ${idx + 1}`),
          acceptanceCriteria: Array.isArray(s.acceptanceCriteria || s.acceptance_criteria)
            ? (s.acceptanceCriteria || s.acceptance_criteria).map(String)
            : ['Given valid inputs, When processed, Then return expected result.'],
        };
      });
    }
  } else if (typeof raw === 'string' && raw.trim().length > 0) {
    prd = raw.trim();
  }

  // Fallback synthesis if BRD is missing or unreasonably sparse (< 20 chars)
  if (!brd || brd.trim().length < 20) {
    brd = `# Business Requirements Document (BRD) — ${project.title}

## 1. Ringkasan Eksekutif
Dokumen ini mendefinisikan persyaratan bisnis strategis untuk pengembangan **${project.title}**. Solusi ini dirancang untuk menjawab kebutuhan operasional nyata dan meningkatkan efisiensi proses kerja.

## 2. Latar Belakang & Identifikasi Masalah
${project.raw_prompt || 'Proses operasional saat ini membutuhkan sistem otomasi terintegrasi untuk mempercepat alur kerja, mengurangi kesalahan manusia, dan menyajikan data secara real-time.'}

## 3. Tujuan Bisnis & Sasaran Strategis
- **Otomasi Proses:** Mengurangi waktu pengerjaan manual minimal 60%.
- **Validasi Cepat (Time to Market):** Meluncurkan versi MVP yang stabil dan siap diuji oleh pengguna target dalam hitungan minggu.
- **Transparansi & Akurasi Data:** Memastikan integritas data transaksi dan rekam operasional tanpa inkonsistensi.

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
- **Operator / Pengguna Lapangan:** Membutuhkan antarmuka yang cepat, intuitif, dan responsif tanpa hambatan teknis.
- **Pelanggan Akhir:** Menikmati layanan yang lebih cepat, transparan, dan terpercaya.

## 6. Metrik Keberhasilan (KPIs)
- Tingkat adopsi pengguna aktif > 80% pada 30 hari pertama pasca rilis.
- Zero fatal data breach (kepatuhan OWASP Top 10 terpenuhi 100%).
- Uptime sistem minimal 99.5% pada runner produksi.`;
  }

  // Fallback synthesis if PRD is missing or unreasonably sparse (< 20 chars)
  if (!prd || prd.trim().length < 20) {
    prd = `# Product Requirements Document (PRD) — ${project.title}

## 1. Visi Produk & Ringkasan Solusi
**${project.title}** adalah aplikasi web modern berbasis Next.js 15 dan Tailwind CSS yang dirancang untuk memberikan pengalaman pengguna yang sederhana, bersih, dan berorientasi pada kecepatan eksekusi.

## 2. Kebutuhan Fungsional (Functional Requirements)
1. **Otentikasi & Keamanan:** Akses berbasis sesi aman dengan pemisahan wewenang.
2. **Katalog & Data Operasional:** Formulir input data dengan validasi client dan server.
3. **Pencatatan & Riwayat:** Penyimpanan status transaksi dan audit trail yang dapat ditelusuri.
4. **Dashboard Eksekutif:** Visualisasi metrik utama dengan pembaruan dinamis.

## 3. Kebutuhan Non-Fungsional (Non-Functional Requirements)
- **Performa:** Waktu muat halaman pertama < 1.5 detik (First Contentful Paint).
- **Akselerasi Hardware:** Komposisi render teroptimasi GPU, bebas jank dan scroll repaint penalty.
- **Keamanan:** Mematuhi OWASP Top 10 (Sanitasi input, proteksi XSS/CSRF, isolasi multi-tenant).
- **Ketersediaan:** Penyimpanan offline-first dengan sinkronisasi otomatis.`;
  }

  // Fallback user stories if none provided
  if (!userStories.length) {
    userStories = [
      {
        id: 'US-1',
        story: `Sebagai pengguna, saya ingin masuk ke dalam sistem ${project.title} agar dapat mengakses fitur sesuai hak akses saya.`,
        acceptanceCriteria: [
          'Given kredensial pengguna valid, When menekan tombol masuk, Then dashboard utama terbuka.',
          'Given password salah, When diproses, Then tampilkan pesan error yang aman tanpa membocorkan info sistem.',
        ],
      },
      {
        id: 'US-2',
        story: `Sebagai pengguna operasional, saya ingin mencatat data baru ke dalam sistem agar tercatat rapi dan akurat.`,
        acceptanceCriteria: [
          'Given form input terisi lengkap, When data disimpan, Then data langsung muncul di tabel utama.',
          'Given field wajib kosong, When menekan simpan, Then tampilkan validasi visual pada field terkait.',
        ],
      },
      {
        id: 'US-3',
        story: `Sebagai manajemen, saya ingin melihat ringkasan performa dan laporan di dashboard agar dapat mengambil keputusan cepat.`,
        acceptanceCriteria: [
          'Given data transaksi tersedia, When dashboard dibuka, Then tampilkan KPI dan ringkasan metrik secara real-time.',
        ],
      },
    ];
  }

  return { brd, prd, userStories };
}

/**
 * Cleans Mermaid diagram source to prevent render breakage:
 * - Strips outer markdown code fences (```mermaid ... ```)
 * - Sanitizes entity and node identifiers for ERD and Class Diagrams
 * - Replaces problematic characters in entity declarations
 */
export function cleanMermaidSource(mermaidRaw: string, diagramType: string): string {
  if (!mermaidRaw) return '';
  let cleaned = mermaidRaw.replace(/^\s*```(?:mermaid)?\s*|\s*```\s*$/gi, '').trim();

  // If erDiagram: ensure entity names are valid alphanumeric tokens without spaces or brackets
  if (diagramType === 'erd' || cleaned.startsWith('erDiagram')) {
    if (!cleaned.startsWith('erDiagram')) {
      cleaned = `erDiagram\n${cleaned}`;
    }
    // Replace entity names with spaces: e.g. "TRANSACTION ITEMS {" -> "TRANSACTION_ITEMS {"
    cleaned = cleaned.replace(/([a-zA-Z0-9_]+)\s+([a-zA-Z0-9_]+)\s*\{/g, '$1_$2 {');
    // Ensure relationships have valid cardinality symbols
    cleaned = cleaned.replace(/--o\{/g, '||--o{').replace(/\}\|--/g, '}|--||');
  }

  // If classDiagram: ensure starts with classDiagram and class names are PascalCase/Alphanumeric
  if (diagramType === 'uml' || cleaned.startsWith('classDiagram')) {
    if (!cleaned.startsWith('classDiagram')) {
      cleaned = `classDiagram\n${cleaned}`;
    }
  }

  // If flowchart or graph: ensure direction declared
  if (diagramType === 'dfd' || diagramType === 'architecture') {
    if (!/^(flowchart|graph)\s+[A-Z]{2}/i.test(cleaned)) {
      cleaned = `flowchart TD\n${cleaned}`;
    }
  }

  return cleaned;
}

/**
 * Normalizes diagram doc, ensuring nodes and edges are populated even if LLM only emitted Mermaid source.
 */
export function normalizeDiagram(raw: any, fallbackTitle: string, diagramType: string): DiagramDoc {
  const title = String(raw?.title || fallbackTitle);
  let mermaid = cleanMermaidSource(String(raw?.mermaid || ''), diagramType);

  let nodes = (Array.isArray(raw?.nodes) ? raw.nodes : [])
    .filter((n: any) => n && n.id != null)
    .map((n: any) => ({
      id: String(n.id).trim().replace(/[^a-zA-Z0-9_-]/g, '_'),
      label: String(n.label ?? n.id).trim(),
      group: n.group ? String(n.group).trim() : undefined,
    }));

  let edges = (Array.isArray(raw?.edges) ? raw.edges : [])
    .filter((e: any) => e && e.from != null && e.to != null)
    .map((e: any) => ({
      from: String(e.from).trim().replace(/[^a-zA-Z0-9_-]/g, '_'),
      to: String(e.to).trim().replace(/[^a-zA-Z0-9_-]/g, '_'),
      label: e.label ? String(e.label).trim() : undefined,
    }));

  // If nodes are empty but mermaid has text, extract nodes from Mermaid declarations
  if (!nodes.length && mermaid) {
    const lines = mermaid.split('\n');
    const nodeSet = new Set<string>();
    for (const line of lines) {
      const match = line.match(/^\s*([A-Za-z0-9_]+)\s*\{/) || line.match(/^\s*([A-Za-z0-9_]+)\s*\[/);
      if (match && !['erDiagram', 'classDiagram', 'flowchart', 'graph', 'subgraph', 'end'].includes(match[1])) {
        nodeSet.add(match[1]);
      }
    }
    nodes = Array.from(nodeSet).map((id) => ({ id, label: id }));
  }

  return { title, mermaid, nodes, edges };
}
