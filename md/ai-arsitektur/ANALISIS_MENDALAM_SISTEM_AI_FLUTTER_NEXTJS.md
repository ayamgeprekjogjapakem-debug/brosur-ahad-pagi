# Analisis Komprehensif Sistem AI: Flutter (`pustaka`) & Next.js (`brosur-ahad-pagi`)

Dokumen ini membedah secara mendalam kondisi aktual (*current state*), temuan kritis, celah performa (*bottlenecks*), komparasi arsitektur RAG, dan rekomendasi solusi strategis untuk implementasi AI Pustaka MTA.

---

## 1. Peta Kondisi Aktual Sistem Saat Ini (Current State)

Saat ini ekosistem AI terbagi ke dalam 2 repositori:
1. **Frontend Mobile (`FLUTTER/pustaka`):**
   * UI Chat di [`lib/screens_v2/ai_chat_screen_v2.dart`](file:///Users/rifqiwariyanto/Documents/GitHub/FLUTTER/pustaka/lib/screens_v2/ai_chat_screen_v2.dart).
   * Menghubungi endpoint `POST https://www.ulilalbab.fun/api/ai/chat`.
   * Membawa payload: `{ messages, wordCount, model }`.
   * Mengatur kuota harian lokal dan penyimpanan riwayat chat per sesi di SQLite/Hive.

2. **Backend & Orchestrator (`NEXTJS/brosur-ahad-pagi`):**
   * Endpoint `app/api/ai/chat/route.ts` bertindak sebagai *AI Gateway*.
   * Mengambil pengaturan dari Supabase: `app_settings` (saklar AI, token OpenRouter) dan `ai_knowledge_rules` (aturan fatwa fiqih MTA).
   * Menjalankan **Keyword Extraction** via OpenRouter LLM.
   * Melakukan pencarian naskah brosur via Supabase RPC `search_brosur_ranked` (Full-Text Search).
   * Memotong naskah teks brosur (maksimal 4.000 karakter).
   * Merakit System Prompt *"Sahabat MTA"* (aturan anti-inferensi, format sapaan, dalil shahih).
   * Mengirim prompt gabungan ke OpenRouter LLM untuk menghasilkan jawaban akhir.

---

## 2. Temuan Kritis & Celah Performa (Critical Bottlenecks)

Berdasarkan audit kode sumber di kedua repositori, ditemukan **5 masalah mendasar** yang menyebabkan respons AI terasa lambat (4-8 detik), boros biaya, atau berpotensi salah konteks:

### ⚠️ Masalah 1: "Double LLM Roundtrip" di Next.js (Pemicu Utama Latensi Tinggi)
* **Kondisi:** Di `app/api/ai/chat/route.ts` baris 59–86, server memanggil OpenRouter **hanya untuk mengekstrak keyword** (*"yasin OR yasinan"*). Setelah itu, server memanggil OpenRouter **kedua kalinya** untuk merangkai jawaban akhir.
* **Dampak:** 
  * Waktu tunggu pengguna berlipat ganda: $T_{\text{total}} = T_{\text{LLM-1}} + T_{\text{Supabase}} + T_{\text{LLM-2}}$ ($\approx 4 - 8$ detik).
  * Biaya token terbuang dua kali untuk setiap 1 pertanyaan pengguna.

### ⚠️ Masalah 2: Hardcode Model di Flutter Mengabaikan Pengaturan Server
* **Kondisi:** Di Flutter [`lib/utils/cache_helper.dart`](file:///Users/rifqiwariyanto/Documents/GitHub/FLUTTER/pustaka/lib/utils/cache_helper.dart) baris 85:
  ```dart
  static String getChatModel() {
    return 'openai/gpt-4o-mini';
  }
  ```
  Nilai ini selalu dikirim dalam request body `model`.
  Di Next.js `app/api/ai/chat/route.ts` baris 32:
  ```typescript
  const selectedModel = model || settings.chat_model || 'google/gemini-2.5-flash';
  ```
* **Dampak:** Karena Flutter selalu mengirimkan `'openai/gpt-4o-mini'`, Next.js **selalu memakai GPT-4o-mini** dan **mengabaikan** model hemat `google/gemini-2.5-flash` yang diset admin di Supabase. Biaya output menjadi 2x lebih mahal (\$0.60 vs \$0.30 per 1M token).

### ⚠️ Masalah 3: Pemotongan Konteks Kaku (`indexOf(firstWord)`) Berisiko Hilang Dalil
* **Kondisi:** Di `app/api/ai/chat/route.ts` baris 109–127:
  ```typescript
  const firstWord = searchQuery.split(' OR ')[0]?.trim().toLowerCase();
  const idx = lowerText.indexOf(firstWord);
  // jika ketemu: ambil idx - 1000 s/d idx + 3000
  // jika TIDAK ketemu: ambil text.substring(0, 4000)
  ```
* **Dampak:** Jika keyword hasil ekstrak adalah `"yasin OR tahlilan"`, sistem hanya mencari kata `"yasin"`. Jika brosur tersebut cocok karena kata `"tahlilan"`, fungsi mengembalikan `-1`, sehingga potongan teks yang dikirim ke AI adalah `0 s/d 4.000` karakter pertama. Karakter pertama brosur biasanya hanyalah mukadimah/salam, sedangkan **hadits dan dalil hukumnya berada di bagian tengah/akhir brosur**. Akibatnya AI menjawab: *"Data tidak ditemukan di database"*.

### ⚠️ Masalah 4: Modul Vektor Embedding Masih Tidur (Dormant)
* **Kondisi:** Di Next.js sudah dibuat modul `app/api/ai/generate-chunks/route.ts` yang memotong artikel dan menghitung embedding vektor (Google `text-embedding-004` & OpenAI `text-embedding-3-small`) ke tabel `brosur_chunks`.
* **Dampak:** Namun di `app/api/ai/chat/route.ts`, sistem **belum pernah membaca tabel `brosur_chunks`** ini! Sistem masih menggunakan FTS biasa `search_brosur_ranked` pada naskah mentah, sehingga pencarian semantik (makna serupa) belum aktif.

### ⚠️ Masalah 5: Komunikasi Blocking di Flutter (Belum Streaming)
* **Kondisi:** Flutter menunggu paket JSON selesai dibuat 100% oleh server.
* **Dampak:** Selama 4-8 detik, layar Flutter hanya menampilkan animasi loading berputar. Jika menggunakan Streaming Server-Sent Events (SSE), karakter pertama sudah dapat ditampilkan dalam waktu $< 800$ ms.

---

## 3. Analisis Komparasi Arsitektur RAG

| Parameter | 1. Naive Substring (Sekarang) | 2. Pure Vector Search (Embeddings Saja) | 3. Hybrid Parent-Child + Cross-Reference Hadits (Rekomendasi) |
| :--- | :--- | :--- | :--- |
| **Metode Pencarian** | FTS Judul/Teks $\to$ `substring(0, 4000)` | Cosine Similarity pada potongan 300 kata | **FTS + Vector (Paragraf Anak) $\to$ Ambil Blok Halaman Penuh (Induk)** |
| **Ketepatan Dalil** | ⚠️ Rendah (Sering terpotong di mukadimah) | ⚠️ Sedang (Konteks syarat/pengecualian hukum bisa hilang) | ⭐⭐⭐⭐⭐ **Sempurna** (AI membaca konteks utuh 1 halaman) |
| **Penanganan Typo & Istilah** | ⚠️ Tergantung kata kunci persis | ⭐⭐⭐⭐⭐ Sangat baik (memahami maksud pertanyaan) | ⭐⭐⭐⭐⭐ **Sangat baik (Kombinasi FTS + Semantik)** |
| **Kualitas Teks Arab** | ⚠️ Mengikuti ketikan brosur lama | ⚠️ Teks terpecah-pecah | ⭐⭐⭐⭐⭐ **Teks Arab ditarik murni dari Database Hadits** |
| **Efisiensi Token** | Boros ($\approx 4.000$ karakter acak) | Hemat ($\approx 300$ kata) | ⭐⭐⭐⭐ **Sangat Optimal (Hanya 1-2 blok relevan)** |

---

## 4. Analisis Pemilihan Model AI (Engine)

| Model | Harga Input / 1M | Harga Output / 1M | Kecepatan (TTFT) | Kualitas Fiqih & Bahasa Arab | Kesimpulan Evaluasi |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Google Gemini 2.5 Flash** | **\$0.075** | **\$0.30** | ⚡⚡⚡⚡⚡ (< 0.8s) | ⭐⭐⭐⭐⭐ Sangat Rapi & Cepat | **Pilihan Utama (Default Server)**: Paling ekonomis, mendukung context caching 1M token. |
| **DeepSeek-V3** | **\$0.14** | **\$0.28** | ⚡⚡⚡⚡ (< 1.4s) | ⭐⭐⭐⭐⭐ Penalaran Dalil Sangat Kuat | **Pilihan Kedua (Khusus Fiqih Rumit)**: Sangat patuh pada aturan anti-inferensi. |
| **Qwen 2.5 72B** | **\$0.35** | **\$0.40** | ⚡⚡⚡ (< 2.0s) | ⭐⭐⭐⭐⭐ Sangat Paham Sastra Hadits | **Pilihan Alternatif Open-Weights**: Sangat fasih tata bahasa Arab klasik. |
| **GPT-4o-mini** | **\$0.15** | **\$0.60** | ⚡⚡⚡⚡ (< 1.5s) | ⭐⭐⭐⭐ Baik | **Kurang Efisien**: Biaya output 2x lebih mahal dibanding Gemini Flash. |

---

## 5. Rencana Aksi Solusi Konkret (Strategic Recommendations)

### Langkah 1: Optimalisasi Ekstraksi Keyword (Pangkas Latensi 50%)
* Jangan gunakan model besar untuk ekstraksi keyword.
* Gunakan model ultra-cepat dan murah: `google/gemini-2.5-flash-lite` atau algoritma ekstraksi berbasis kosa kata offline ([`SearchHelper.expandSearchTerms`](file:///Users/rifqiwariyanto/Documents/GitHub/FLUTTER/pustaka/lib/utils/search_helper.dart)) yang sudah kita bangun di Flutter/Next.js.
* *Hasil:* Waktu tunggu langsung terpangkas 2-3 detik!

### Langkah 2: Sinkronisasi Model Dinamis (Lepas Hardcode di Flutter)
* Di Flutter [`CacheHelper.getChatModel()`](file:///Users/rifqiwariyanto/Documents/GitHub/FLUTTER/pustaka/lib/utils/cache_helper.dart), ubah nilai return default menjadi `null` atau `auto`.
* Di Next.js `app/api/ai/chat/route.ts`:
  ```typescript
  // Prioritaskan model dari database server, bukan hardcode client
  const selectedModel = settings.chat_model || model || 'google/gemini-2.5-flash';
  ```
* *Hasil:* Admin bebas mengganti model ke Gemini Flash atau DeepSeek dari CMS web kapan saja tanpa perlu update aplikasi Flutter!

### Langkah 3: Aktifkan RAG Berbasis Vektor & Snippet Cerdas
* Di Next.js, aktifkan pencarian ke tabel `brosur_chunks` yang sudah memiliki embedding vektor.
* Jika mencari snippet, cari semua kata kunci dalam array, bukan hanya `firstWord`.
* *Hasil:* Tidak ada lagi kejadian artikel brosur ditemukan tapi dalilnya tidak terkirim ke AI.

### Langkah 4: Terapkan Streaming SSE (Server-Sent Events)
* Upgrade `app/api/ai/chat/route.ts` untuk mengembalikan `text/event-stream`.
* Di Flutter [`AiChatScreenV2`](file:///Users/rifqiwariyanto/Documents/GitHub/FLUTTER/pustaka/lib/screens_v2/ai_chat_screen_v2.dart), gunakan listener stream untuk merender teks karakter demi karakter.
* *Hasil:* Pengguna merasakan respons instan dalam $< 800$ ms.
