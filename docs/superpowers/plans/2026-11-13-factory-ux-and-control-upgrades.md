# Factory UX & Control Upgrades Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

---

### Overview

Menerapkan 5 peningkatan strategis pada platform **My AI Factory** untuk meningkatkan kendali manusia (*human-in-the-loop*), keandalan kode, observabilitas sandbox, dan sinkronisasi visual:

1. **Task 1: Visual TTL Countdown Timer & Perpanjangan Waktu (5 Jam)**
2. **Task 2: Human-in-the-Loop Approval Gates (Auto-Pilot vs Step-by-Step)**
3. **Task 3: Targeted File Refactor ("Koreksi dengan AI") di Code Explorer**
4. **Task 4: Live Terminal Output Console untuk Sandbox Runner**
5. **Task 5: Bidirectional PostMessage Bridge untuk 2D Virtual Office**

---

### File Structure Map

```text
app/
├── api/
│   └── projects/
│       └── [id]/
│           ├── extend-ttl/route.ts      # (New) POST endpoint perpanjang TTL 5 jam
│           ├── refactor-file/route.ts   # (New) POST endpoint perbaikan spesifik berkas
│           ├── runner/
│           │   └── logs/route.ts        # (New) GET endpoint log live runner
│           └── step/route.ts            # (New) POST endpoint gate approval berikutnya
├── dashboard/
│   ├── components/
│   │   ├── CodeExplorer.tsx             # (Modify) Dialog "Koreksi dengan AI" per berkas
│   │   ├── ExportPanel.tsx              # (Modify) TTL Countdown timer & button extend
│   │   ├── ProjectSetup.tsx             # (Modify) Toggle Auto-pilot vs Step-by-Step
│   │   ├── VisualEditor.tsx             # (Modify) Terminal console live output
│   │   └── VirtualOffice.tsx            # (Modify) postMessage handler dari 2D canvas
│   └── page.tsx                         # (Modify) Approval Gate Banner & State Hook
lib/
├── agent-framework.ts                   # (Modify) Gate checkpoints & refactorFile logic
├── cleanup-core.ts                      # (Modify) Format sisa waktu TTL & kalkulasi
└── vps-runner.ts                        # (Modify) In-memory stdout/stderr circular buffer
public/
└── virtual-office/
    └── game.js                          # (Modify) postMessage emit saat klik agent
tests/
├── cleanup.test.mts                     # (Modify) Unit test kalkulasi TTL & format
└── step-pipeline.test.mts               # (New) Unit test gate state machine
```

---

### Tasks

- [ ] **Task 1: Visual TTL Countdown Timer & Auto-Purge Management**
  - [ ] Tambahkan helper format durasi sisa waktu di `lib/cleanup-core.ts` (`formatTtlRemaining(filesReadyAt, ttlHours)`).
  - [ ] Buat unit test di `tests/cleanup.test.mts` yang memvalidasi sisa waktu dalam jam & menit, serta deteksi kedaluwarsa.
  - [ ] Buat rute API `POST /api/projects/[id]/extend-ttl/route.ts` yang memperbarui `files_ready_at` ke waktu sekarang.
  - [ ] Tambahkan komponen visual badge TTL di `ExportPanel.tsx` dan header `dashboard/page.tsx` dengan pewarnaan dinamis (Hijau >2 jam, Kuning 30m-2j, Merah <30m) serta tombol "Perpanjang 5 Jam".
  - [ ] Verifikasi tes lulus dan kompilasi bersih.

- [ ] **Task 2: Human-in-the-Loop Approval Gates (Auto-Pilot vs Step-by-Step)**
  - [ ] Perbarui `types/index.ts` menambahkan `execution_mode?: 'auto' | 'step'` dan `approval_gate?: string` pada `Project`.
  - [ ] Modifikasi `lib/agent-framework.ts`:
    - Simpan `approval_gate` saat mode `step` aktif setelah menyelesaikan setiap tahapan (Gate 1: UX/Risk, Gate 2: PM/PRD, Gate 3: Analyst/ERD, Gate 4: Security/QA, Gate 5: Coder).
    - Tambahkan fungsi `approveAndStep(projectId)` yang memicu kelanjutan ke fase berikutnya.
  - [ ] Buat rute API `POST /api/projects/[id]/step/route.ts`.
  - [ ] Buat unit test `tests/step-pipeline.test.mts` untuk memvalidasi alur transisi gate.
  - [ ] Pada antarmuka Dashboard (`ProjectSetup.tsx` dan `page.tsx`), tambahkan sakelar opsi eksekusi serta banner persetujuan *"Setujui [Tahap] & Lanjutkan $\to$"* saat berstatus `paused_at_gate`.

- [ ] **Task 3: Targeted File Refactor ("Koreksi dengan AI") di Code Explorer**
  - [ ] Buat fungsi `refactorSingleFile(projectId, filePath, instruction)` di `lib/agent-framework.ts` yang memanggil `agent-coder` secara terarah untuk satu file.
  - [ ] Buat rute API `POST /api/projects/[id]/refactor-file/route.ts`.
  - [ ] Di `app/dashboard/components/CodeExplorer.tsx`, tambahkan tombol *"Koreksi dengan AI"* di toolbar editor berkas dengan modal dialog input instruksi.
  - [ ] Integrasikan toast pemberitahuan saat berkas selesai diperbarui dan versi baru tercatat.

- [ ] **Task 4: Live Terminal Output Console untuk Sandbox Runner**
  - [ ] Di `lib/vps-runner.ts`, simpan buffer sirkular 100 baris terakhir dari `proc.stdout` dan `proc.stderr`.
  - [ ] Buat rute API `GET /api/projects/[id]/runner/logs/route.ts` yang mengembalikan log baris demi baris beserta status port.
  - [ ] Di `app/dashboard/components/VisualEditor.tsx`, tambahkan panel lipat (collapsible drawer) *"Runner Console & Build Logs"* dengan polling otomatis tiap 2 detik saat runner berjalan.

- [ ] **Task 5: Bidirectional PostMessage Bridge untuk 2D Virtual Office**
  - [ ] Di `public/virtual-office/game.js`, kirim pesan `window.parent.postMessage({ type: 'FACTORY_AGENT_CLICK', role: '...' }, '*')` saat meja/sprite agent diklik.
  - [ ] Di `app/office/page.tsx` dan `VirtualOffice.tsx`, tangkap pesan tersebut untuk menampilkan modal pengaturan atau mengalihkan tampilan ke log agent yang relevan.
  - [ ] Kirim pesan balik saat fase perakitan berubah untuk memberikan efek fokus visual pada karakter agent di canvas 2D.

- [ ] **Task 6: Verifikasi Penuh, Build, Deploy ke VPS & Push Git**
  - [ ] Jalankan `node --test tests/*.test.mts` (target: 100% pass).
  - [ ] Jalankan `npm run build` Next.js 15 produksi.
  - [ ] Buat release tarball, scp ke VPS, unpack, dan reload PM2.
  - [ ] Uji live endpoint di `https://43.156.236.102/ai-factory`.
  - [ ] Commit dan push ke branch `main`.
