# ADR 002: Penyimpanan Konfigurasi Tunggal (Single-Tenant Settings Store)

## Status
Diterima (Accepted)

## Konteks
Aplikasi membutuhkan konfigurasi dinamis di tingkat sistem (Gemini API Key, model aktif, endpoint Hermes VPS, GitHub PAT, preferensi tampilan) yang dapat diubah melalui antarmuka tanpa perlu mengedit berkas `.env.local` dan me-restart server Next.js secara manual.

## Keputusan
Menyimpan konfigurasi pabrik ke dalam berkas JSON tunggal `.data/settings.json` yang diabaikan oleh Git, dengan pembacaan berkas atomik dan mekanisme *secret masking* (`••••••••1234`) saat dikirim ke frontend. Nilai environment `.env.local` tetap berfungsi sebagai cadangan otomatis (*transparent fallback*).

## Konsekuensi
- **Positif:** Sederhana, tanpa ketergantungan skema database tambahan (*lean*), pergantian model dan kunci API seketika di runtime.
- **Batasan:** Dirancang untuk mode *single-tenant* (satu komandan Kiky). Jika sistem beralih ke SaaS multi-pengguna, tabel konfigurasi pengguna di PocketBase akan menggantikan berkas ini.
