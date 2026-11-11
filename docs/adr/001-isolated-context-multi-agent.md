# ADR 001: Arsitektur Multi-Agent Berbasis Konteks Terisolasi

## Status
Diterima (Accepted)

## Konteks
Ketika banyak peran spesialis rekayasa perangkat lunak (Product Manager, UX Designer, System Architect, Security Auditor, Coder, QA, DevOps) digabung dalam satu sesi percakapan besar, jendela konteks token cepat habis, prompt antar-peran saling bertabrakan, dan kode yang dihasilkan rentan mengalami halusinasi atau penurunan kualitas.

## Keputusan
Setiap spesialis dijalankan dalam sesi percakapan Antigravity mandiri (`invoke_subagent` dengan `conversationId` unik). Semua agen berbagi repositori kode dan bertukar artefak spesifikasi melalui direktori `docs/factory/`.

Kiky bertindak sebagai *Supreme Commander* melalui gerbang persetujuan (*approval gate*) di sesi utama sebelum tugas diserahkan ke spesialis berikutnya.

## Konsekuensi
- **Positif:** Konteks bersih (~150k token per agen), tidak ada polusi instruksi, pembagian tugas tegas (*single responsibility*).
- **Negatif:** Diperlukan koordinasi artefak berkas di disk dan orkestrasi eksplisit oleh sesi utama.
