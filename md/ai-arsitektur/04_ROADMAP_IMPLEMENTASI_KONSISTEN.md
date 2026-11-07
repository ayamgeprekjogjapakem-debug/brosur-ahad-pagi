# 04 - Roadmap Implementasi & Checklist Kesiapan Rilis

Dokumen ini memuat panduan langkah demi langkah implementasi serta daftar periksa (*checklist*) untuk memastikan integrasi AI antara **Flutter (`pustaka`)** dan **Next.js (`brosur-ahad-pagi`)** berjalan mulus dan stabil.

---

## 1. Roadmap Tahapan Kerja

```
[ TAHAP 1: STANDARISASI KONTRAK API ]
├── Konfigurasi fallback model (Gemini 2.5 Flash -> DeepSeek-V3) di Next.js
├── Pengamanan rate-limit dan quota token per IP / Device ID
└── Sinkronisasi pesan error ramah pengguna (misal: "Kuota habis", "Koneksi terputus")

[ TAHAP 2: PENINGKATAN FORMAT & TAMPILAN FLUTTER ]
├── Memastikan widget Flutter Markdown Plus merender teks Arab dengan spasi baris rapi
├── Penyempurnaan tombol aksi: "Salin Jawaban", "Simpan ke Catatan", "Lihat Brosur Terkait"
└── Sinkronisasi model default dari pengaturan remote Supabase

[ TAHAP 3: IMPLEMENTASI STREAMING REAL-TIME (SSE) ]
├── Penambahan parameter `stream: true` di Next.js API route
├── Implementasi StreamListener di `AiChatScreenV2` Flutter
└── Efek animasi mengetik halus (*typewriter effect*)

[ TAHAP 4: ADVANCED HYBRID RAG & CACHING ]
├── Pembuatan kolom embedding (pgvector) di Supabase untuk naskah brosur
├── Penerapan Context Caching Gemini untuk system prompt "Sahabat MTA"
└── Pembaruan dashboard admin di Next.js untuk memantau penggunaan token dan biaya
```

---

## 2. Checklist Kesiapan Produksi (Checklist Keberhasilan)

### A. Kesiapan Backend & API (Next.js)
- [ ] Kunci API (`OPENROUTER_API_KEY` / `GEMINI_API_KEY`) tersimpan aman di Environment Variables (Vercel/Cloudflare) dan tidak terekspos ke klien.
- [ ] Aturan System Prompt "Sahabat MTA" telah teruji bebas halusinasi dan menolak membuat materi khutbah di luar mencari referensi.
- [ ] Query rewriter berhasil mengekstrak sinonim dan variasi ejaan kata kunci (contoh: *yasinan* $\to$ *yasin OR tahlilan*).
- [ ] Fungsi pencarian naskah brosur (`search_brosur_ranked`) di Supabase mengembalikan artikel yang tepat sasaran dalam waktu $< 500$ ms.
- [ ] Endpoint `/api/ai/chat` menangani situasi kegagalan provider secara anggun (*graceful fallback* ke model cadangan).

### B. Kesiapan Aplikasi Mobile (Flutter)
- [ ] Layar [`AiChatScreenV2`](file:///Users/rifqiwariyanto/Documents/GitHub/FLUTTER/pustaka/lib/screens_v2/ai_chat_screen_v2.dart) berhasil terhubung ke server produksi (`https://www.ulilalbab.fun/api/ai/chat`).
- [ ] Kuota harian perangkat berjalan dengan benar dan ter-reset otomatis setiap pergantian hari.
- [ ] Teks ayat Al-Qur'an dan kutipan hadits berbahasa Arab ditampilkan dengan font Utsmani/Amiri yang jelas dan tidak terpotong.
- [ ] Riwayat sesi percakapan tersimpan secara persisten di penyimpanan lokal perangkat.
- [ ] Pengguna offline mendapatkan notifikasi informatif bahwa fitur AI membutuhkan koneksi internet, sementara pencarian naskah offline lokal SQLite tetap dapat digunakan secara mandiri.

---

## 3. Rekomendasi Setup Environment Next.js (`.env.local`)

Pastikan variabel-variabel berikut telah dikonfigurasi di server Next.js:

```bash
# Provider AI Utama
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxx
DEFAULT_CHAT_MODEL=google/gemini-2.5-flash
BACKUP_CHAT_MODEL=deepseek/deepseek-chat

# Supabase Database
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

# App Settings
AI_DAILY_QUOTA_PER_DEVICE=30
```
