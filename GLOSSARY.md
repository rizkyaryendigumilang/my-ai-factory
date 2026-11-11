# Domain Glossary — My AI Factory

Kamus istilah domain resmi (Ubiquitous Language) untuk proyek **My AI Factory**:

### Core Roles & Architecture
- **Commander (Kiky):** Pemimpin tertinggi dan arsitek utama sistem. Memegang hak veto dan gerbang persetujuan (*Human-in-the-Loop*).
- **Executive Dispatcher:** Sesi utama Antigravity yang bertindak sebagai pengatur lalu lintas pesan dan komando antar-subagen.
- **Specialist Subagent:** Agen AI independen dengan domain tunggal (`pm_spec`, `ux_ui_designer`, `system_analyst`, `security_auditor`, `fullstack_engineer`, `qa_engineer`, `devops_sentry`) yang berjalan dalam *conversation context* terisolasi.
- **Isolated Context:** Prinsip pemisahan memori percakapan agar setiap spesialis memiliki jendela token bersih tanpa kontaminasi riwayat percakapan peran lain.

### Factory Pipeline & Artifacts
- **Factory Pipeline:** Rantai produksi software sekuensial: Brief → Spesifikasi (PRD) → Desain Token → Arsitektur (ERD/API) → Keamanan (OWASP) → Koding → Pengujian QA → Deploy VPS.
- **Blueprint:** Dokumen spesifikasi teknis dan diagram yang menjadi satu-satunya sumber kebenaran (*single source of truth*) sebelum kode ditulis.
- **Shared Artifacts:** Direktori terstruktur `docs/factory/` tempat setiap subagen menyimpan dan membaca dokumen hasil kerja.

### Design & Motion
- **Apple HIG / Fluid Interfaces:** Standar antarmuka fisik Apple berdasarkan WWDC 2018 (respon instan, pelacakan langsung 1:1, interupsi transisi, fisika pegas).
- **Critically Damped Spring:** Animasi pegas dengan faktor redaman `damping: 1.0` yang berhenti mulus tanpa osilasi/pantulan berlebih.
- **Anti AI-Slop:** Prinsip pembersihan elemen visual dan teks generik kecerdasan buatan (menghapus gradien nila-violet, badge spam, dan kalimat promosi artifisial).

### Infrastructure & Runtime
- **Hermes VPS:** Agen otonom backend yang berjalan pada VPS remote port `:8444`.
- **9Router VPS:** Proxy LLM kompatibel OpenAI/Claude pada VPS remote port `:8443`.
- **PocketBase SQLite:** Database backend ringan yang berjalan di port `:8090` dengan cadangan berkas JSON `.data/factory.json`.
- **Secret Masking:** Teknik pengaburan token kredensial (`••••••••1234`) pada level presentasi agar tidak bocor ke browser atau riwayat git.
