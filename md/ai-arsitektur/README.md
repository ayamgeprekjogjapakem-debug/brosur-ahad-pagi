# Panduan & Cetak Biru: Ekosistem AI Bersama (Flutter & Next.js)

Dokumentasi ini merangkum arsitektur, strategi pemilihan model AI, optimasi RAG, dan panduan integrasi antara **Aplikasi Mobile Flutter (`pustaka`)** dan **Backend & Web Portal Next.js (`brosur-ahad-pagi`)**.

---

## 📑 Daftar Isi Dokumen

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

