# Panduan & Cetak Biru: Ekosistem AI Bersama (Flutter & Next.js)

Dokumentasi ini merangkum arsitektur, strategi pemilihan model AI, optimasi RAG, dan panduan integrasi antara **Aplikasi Mobile Flutter (`pustaka`)** dan **Backend & Web Portal Next.js (`brosur-ahad-pagi`)**.

---

## 🌟 Dokumen Acuan Utama (Single Source of Truth)

👉 [**MASTER_ARSITEKTUR_DAN_ROADMAP_AI.md**](./MASTER_ARSITEKTUR_DAN_ROADMAP_AI.md)
*Dokumen komprehensif 1 pintu yang menggabungkan seluruh analisis mendalam, perbandingan model, mitigasi bottleneck, strategi Web-First lalu Mobile, hingga checklist kesiapan produksi.*

---

## 📑 Rincian Dokumen Teknis Tematik

1. [**01_ARSITEKTUR_SISTEM_DAN_ALUR_KOMUNIKASI.md**](./01_ARSITEKTUR_SISTEM_DAN_ALUR_KOMUNIKASI.md)
   * Blueprint arsitektur Client-Server (Flutter $\leftrightarrow$ Next.js $\leftrightarrow$ Supabase $\leftrightarrow$ LLM).
   * Alur data: Query pengguna, query rewriting, Supabase RPC RAG, aturan memori dinamis, hingga inferensi LLM.
   * Keunggulan *Centralized Prompt & Model Management* tanpa perlu rilis ulang APK/AAB.

2. [**02_KOMPARASI_MODEL_AI_DAN_ANALISIS_BIAYA.md**](./02_KOMPARASI_MODEL_AI_DAN_ANALISIS_BIAYA.md)
   * Analisis komparasi: **Gemini 2.5 Flash**, **DeepSeek-V3**, **Qwen 2.5 72B**, **Hermes 3 (Llama 3.1 70B)**, dan **GPT-4o-mini**.
   * Evaluasi pemahaman teks Arab berharakat, transliterasi Fiqih, latency, dan jendela konteks.
   * Tabel simulasi biaya untuk 10.000 hingga 100.000 query pencarian per bulan.

3. [**03_OPTIMASI_RAG_DAN_STREAMING.md**](./03_OPTIMASI_RAG_DAN_STREAMING.md)
   * Strategi pencarian konteks: FTS Supabase (`search_brosur_ranked`) vs Hybrid Vector (pgvector).
   * Migrasi dari Blocking Request-Response ke **Streaming SSE (Server-Sent Events)** untuk efek mengetik real-time di Flutter.
   * Mekanisme Context Caching untuk menekan biaya prompt hingga 75%.

4. [**04_ROADMAP_IMPLEMENTASI_KONSISTEN.md**](./04_ROADMAP_IMPLEMENTASI_KONSISTEN.md)
   * Tahapan implementasi dari persiapan backend, sinkronisasi model, hingga pengujian end-to-end.
   * Checklist kesiapan rilis produksi.

5. [**05_ANALISIS_SQLITE_VS_HIVE_MOBILE_AI.md**](./05_ANALISIS_SQLITE_VS_HIVE_MOBILE_AI.md)
   * Analisis dampak migrasi dari Hive (NoSQL key-value) ke SQLite (FTS5).
   * Pembuktian kemudahan pencarian (Inverted Index, BM25 ranking, $<15$ ms offline).
   * Analisis matematis penghematan token LLM (hemat 75% – 85% token input, eliminasi Double LLM Roundtrip).
   * Desain skema SQLite FTS5 dan alur Hybrid Edge-Cloud RAG.

6. [**06_DIAGNOSIS_DAN_KONSOLIDASI_DASHBOARD_AI.md**](./06_DIAGNOSIS_DAN_KONSOLIDASI_DASHBOARD_AI.md)
   * Audit kritis 4 modul AI Dashboard (`ai-kajian`, `ai-simulator`, `ai-settings`, `ai-analytics`).
   * Diagnosis bug fatal payload `/api/ai/generate` dan layout hijacking simulator.
   * Matriks keputusan: Apa yang dipertahankan, disatukan, dibenahi, dan dihapus.
   * Checklist aksi nyata perampingan dashboard dari 4 modul menjadi 3 modul solid.

7. [**07_LAPORAN_ANALISIS_CLEAR_DATA_DAN_AUDIT_LOG_AI.md**](./07_LAPORAN_ANALISIS_CLEAR_DATA_DAN_AUDIT_LOG_AI.md)
   * Laporan analisis teknis fitur "Clear Semua Data" dan pembersihan telemetri AI.
   * Pemisahan tegas data abadi (16.832 hadits, 1.497 brosur) vs data log ephemeral (`ai_query_logs`).
   * Verifikasi pengujian Supabase RLS (HTTP 201 Insert, 204 Delete, 200 Select).
   * Panduan keamanan, fail-safe modal UX, dan dampak nol ke aplikasi mobile Flutter.

