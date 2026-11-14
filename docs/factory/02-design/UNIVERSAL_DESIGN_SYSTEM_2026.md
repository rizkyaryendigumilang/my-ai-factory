# Universal Design System & Website Quality Standard (Edition 2026)
> **Author / Lead Designer:** Lead UI/UX Designer (`@ux_ui_designer`)  
> **Authorized by:** Supreme Commander Kiky (@rizky)  
> **Target Scope:** Universal benchmark for `my-ai-factory`, `wedding-planner`, `life-planner`, `kept`, `recruiter`, and all Codex SaaS products.  
> **Governing Standards:** Apple HIG · Linear Precision · Vercel Clarity · Raycast Taction · Stripe Storytelling  

---

## 1. Visi & Filosofi Desain

Website modern tahun 2026 tidak lagi diukur dari seberapa banyak efek visual mencolok (seperti neon glowing berlebihan atau gradasi ungu-pink seragam), melainkan dari **kedewasaan eksekusi**: keselarasan proporsi, tipografi yang berkarakter, ruang bernapas (*whitespace*), kedalaman (*depth*) yang terukur, dan interaksi yang terasa taktil serta responsif seketika.

---

## 2. 8 Pilar Karakteristik Website Modern

### Pilar 1: Modern Visual Language (Bahasa Visual Kontemporer)
- **Typography Berkarakter:** Gunakan heading berbobot tebal (`font-bold` / `font-extrabold`) dengan *letter-spacing* terkalibrasi (`tracking-tight` -0.02em) yang dipasangkan dengan body text berjarak baris lapang (`leading-relaxed` 1.5–1.6).
- **Whitespace Proporsional:** Jangan memadati layar. Setiap blok card dan seksi diberi bantalan (*padding*) yang terstruktur (`p-4` sampai `p-6` pada card, `gap-4` sampai `gap-6` pada grid).
- **Palet Warna Terkendali:** Hindari penggunaan 5+ warna cerah sekaligus. Pilih satu warna netral dasar, satu warna aksen dominan (brand identity), dan status token fungsional (emerald untuk sukses/selesai, amber untuk otorisasi manusia, rose untuk destructive/error).
- **Komposisi Dinamis:** Jangan biarkan layout terasa monoton seperti template kartu seragam. Gunakan variasi ritme vertikal dan horizontal.

### Pilar 2: Bento Grid & Modular Layout
- **Hirarki Ukuran Kartu:**
  - *Hero / Interactive Showcase Card:* Menempati `col-span-8` atau `row-span-2`, memuat preview interaktif, live terminal, atau editor visual.
  - *KPI / Stat Card:* Menempati `col-span-4` atau `col-span-2`, memuat angka metriks besar, label ringkas, dan grafik sparkline mini.
  - *Status / Action Card:* Menempati blok samping dengan aksi kontekstual yang jelas.
- **Rasio & Radius Terpadu:**
  - Container Luar: `rounded-xl` (12px / 16px) dengan border tipis `border-white/[0.08]`.
  - Inner Element / Tombol: `rounded-md` (8px).
  - Micro Tag / Status Dot: `rounded-full` (9999px).

### Pilar 3: Sophisticated Typography (Tipografi Presisi)
- **Font Stack:** Google Noto Sans / Geist Sans / Inter dengan *font-feature-settings*:
  ```css
  font-feature-settings: "cv02" 1, "cv03" 1, "cv04" 1, "cv11" 1, "calt" 1;
  ```
- **Hierarki Skala Tipografi:**
  - *Display / Hero:* `text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.12]`
  - *Section Heading:* `text-xl sm:text-2xl font-bold tracking-tight leading-snug`
  - *Card Title:* `text-sm sm:text-base font-semibold tracking-tight text-foreground`
  - *Body Text:* `text-xs sm:text-sm leading-relaxed text-muted-foreground`
  - *Micro Label / Kicker:* `text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-primary`
  - *Code & Numbers:* `font-mono text-xs tabular-nums`

### Pilar 4: Subtle Animations & Micro-Interactions (Motion Apple-Grade)
- **Taktil Directness:** Setiap elemen yang dapat diklik wajib memiliki umpan balik seketika saat ditekan:
  ```css
  transition: transform 100ms cubic-bezier(0.2, 0, 0, 1), background-color 120ms ease-out;
  active:scale-[0.98];
  ```
- **Subtle Hover:** Hindari hover yang melompat tiba-tiba. Gunakan pencerahan halus `border-white/[0.15]` dan background `bg-white/[0.06]`.
- **Skeleton Shimmer:** State pemuatan data menggunakan animasi gradient shimmer yang tenang, bukan spinner berputar liar yang mengganggu fokus:
  ```css
  animation: shimmer 1.8s infinite ease-in-out;
  ```
- **Accessibility Motion:** Wajib menghormati preferensi pengguna via media query `@media (prefers-reduced-motion: reduce)`.

### Pilar 5: Modern Color System (Palet Warna Presisi)
- **Deep OLED Canvas:** `#080B11` (Bukan abu-abu lumpur, melainkan hitam kebiruan pekat yang menghemat daya layar OLED dan meningkatkan kontras teks).
- **Surface Elevation Layers:**
  - *Layer 0 (Canvas):* `#080B11`
  - *Layer 1 (Card Background):* `#0E131F` (atau `rgba(14, 19, 31, 0.85)`)
  - *Layer 2 (Elevated Popover/Modal):* `#121826`
- **Hairline Borders:** `rgba(255, 255, 255, 0.08)` (memberikan batas tajam dan elegan tanpa garis tebal yang kotor).
- **Semantic Signals:**
  - Primary / Brand Accent: Amber Gold (`#F59E0B`) / Sapphire Sky (`#0284C7`)
  - Success / Pass / Completed: Emerald (`#10B981`)
  - Human Gate / Warning: Warm Amber (`#F59E0B`)
  - Error / Destructive: Crisp Rose (`#EF4444`)

### Pilar 6: Glassmorphism & Depth (Kedalaman Berlapis)
- **Restraint Rule:** Glassmorphism hanya digunakan pada elemen yang melayang di atas konten dinamis (Sticky Topbar, Floating Bottom Dock, Modal Backdrops).
- **Frosted Material Formula:**
  ```css
  background: rgba(8, 11, 17, 0.82);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  ```
- **Shadows:** Bayangan lembut terarah (`box-shadow: 0 4px 20px -4px rgba(0, 0, 0, 0.5)`), bukan blur hitam pekat tak beraturan.

### Pilar 7: Responsive & Adaptive Design
- **Bukan Sekadar Mengecilkan Layar:**
  - Desktop (>1024px): Menampilkan multi-kolom split view (Sidebar proyek + Tab utama + Preview).
  - Tablet (768px–1024px): Menyatukan sidebar menjadi slide-over atau dropdown terintegrasi.
  - Mobile (<768px): Tampilan single-column bertumpuk dengan target sentuhan minimal 36px–42px (`min-h-[40px]`) dan eliminasi tap highlight flash (`-webkit-tap-highlight-color: transparent`).

### Pilar 8: Functional UX (Pengalaman Pengguna Fungsional)
- **Zero Ambiguity:** Setiap tombol memiliki label, icon, dan status jelas (misal: "Salin Log" -> berganti instan menjadi "Tersalin" dengan centang hijau selama 1.5 detik).
- **Empty States yang Membimbing:** Jika belum ada proyek atau berkas, jangan tampilkan layar kosong hampa; berikan ilustrasi minimalis dan tombol ajakan bertindak (Call to Action).
- **Error Handling Informatif:** Tampilkan pesan galat yang manusiawi di dalam alert banner yang dapat dibaca dan ditindaklanjuti.
- **Keyboard Shortcuts:** Dukung navigasi cepat keyboard (angka `1–6` untuk tab alur kerja, `Esc` untuk membatalkan dialog).

---

## 3. Matriks Benchmark Industri 2026

| Aspek Benchmark | Karakter Unggulan | Implementasi di Factory & SaaS Kami |
| :--- | :--- | :--- |
| **Linear** | Dark interface yang bersih, konsistensi UI 100%, border 1px tipis | Palet `#080B11`, hairline border `border-white/[0.08]`, status dot monokrom-aksen |
| **Apple** | Whitespace proporsional, tactile spring response, sudut membulat harmonis | Corner radius `rounded-xl` (card) & `rounded-md` (button), `active:scale-[0.98]` |
| **Vercel** | Skala tipografi developer-first, hirarki kueri, kejelasan teknis | Font pairing Noto Sans + Monospace tabular, tab berangka kbd shortcut |
| **Raycast** | Interaktivitas cepat, pencarian instan, feedback taktil | Filter berkas instan, copy-to-clipboard responsive, action docks |
| **Stripe** | Storytelling alur kerja, kejelasan status pembayaran / gate otorisasi | Kartu Otorisasi Kiky (Human-in-the-Loop) dengan status badge visual |

---

## 4. Checklist Kepatuhan Cross-Project

Sebelum sebuah fitur atau halaman baru dirilis pada proyek apa pun di lingkungan software house ini, pastikan memenuhi kriteria berikut:
- [x] **Visual Consistency:** Menggunakan palette `#080B11` / `#0E131F` dengan hairline border tipis.
- [x] **Zero Slop:** Tidak ada gradasi ungu liar acak, tidak ada teks pelangi yang sulit dibaca, tidak ada elemen dekoratif tanpa fungsi.
- [x] **Taction:** Semua tombol memiliki umpan balik sentuh `active:scale-[0.98]`.
- [x] **Accessibility:** Kontras teks di atas 4.5:1 (WCAG AA), navigasi ramah pembaca layar (`aria-label`, `role`).
- [x] **Resilience:** Empty state, error banner, dan status loading tertangani dengan rapi.
