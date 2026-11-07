# 01 - Arsitektur Sistem & Alur Komunikasi (Flutter & Next.js)

Dokumen ini menjelaskan rancangan teknis integrasi antara aplikasi mobile **Flutter (`pustaka`)** dan backend service **Next.js (`brosur-ahad-pagi`)**.

---

## 1. Arsitektur Komponen

```
               [ FLUTTER CLIENT ]
             (lib/screens_v2/ai_chat_screen_v2.dart)
                         │
                         │ HTTP POST /api/ai/chat
                         │ Headers: Content-Type: application/json
                         │ Payload: { messages, model, wordCount }
                         ▼
        ┌───────────────────────────────────┐
        │        NEXT.JS API ROUTE          │
        │   (app/api/ai/chat/route.ts)      │
        └─────────────────┬─────────────────┘
                          │
       ┌──────────────────┴──────────────────┐
       │ 1. Baca app_settings                │
       │    (Cek ai_enabled & token)         │
       ▼                                     ▼
┌──────────────┐                      ┌──────────────┐
│   SUPABASE   │                      │  OPENROUTER  │
│  PostgreSQL  │                      │   API HOST   │
└──────┬───────┘                      └──────┬───────┘
       │                                     │
       │ 2. Ambil Rules Memori               │
       │    (ai_knowledge_rules)             │
       │                                     │
       │ 3. Ekstraksi Kata Kunci             │
       │    via LLM Ringan ──────────────────►
       │                                     │
       │ 4. RAG Database Search              │
       │    RPC: search_brosur_ranked        │
       │    (Ambil 3 artikel teratas)        │
       │                                     │
       │ 5. Susun Prompt "Sahabat MTA"       │
       │                                     │
       │ 6. Generate Jawaban Akhir ──────────►
       │    (Streaming / JSON)               │
       │                                     │
       ◄─────────────────────────────────────┘
       │
       ▼
 [ FLUTTER CLIENT MENERIMA RESPON ]
 - Parse Markdown Plus
 - Render Teks Arab Rapi
 - Simpan ke Sesi Lokal (CacheHelper)
```

---

## 2. Rincian Peran Masing-Masing Lapisan

### A. Flutter Mobile Client (`FLUTTER/pustaka`)
* **File Utama:** [`lib/screens_v2/ai_chat_screen_v2.dart`](file:///Users/rifqiwariyanto/Documents/GitHub/FLUTTER/pustaka/lib/screens_v2/ai_chat_screen_v2.dart)
* **Tanggung Jawab:**
  1. **UI/UX Interaktif:** Menampilkan gelembung chat, status loading berputar animasi (*"Membaca pertanyaan...", "Menganalisis brosur..."*), dan penanganan tombol salin teks atau simpan ke riwayat.
  2. **Render Teks Arab & Fiqih:** Memanfaatkan `flutter_markdown_plus` dan `google_fonts` (font Noto Sans / Amiri) agar harakat Arab tidak tumpang tindih.
  3. **Manajemen Kuota Lokal:** Mengatur batas tanya jawab harian per perangkat (misal 20-30 pesan/hari) menggunakan [`CacheHelper.checkAndResetAiQuota()`](file:///Users/rifqiwariyanto/Documents/GitHub/FLUTTER/pustaka/lib/utils/cache_helper.dart) untuk mencegah spamming dan pemborosan biaya API.
  4. **Penyimpanan Sesi Percakapan:** Menyimpan riwayat chat di storage offline agar pengguna dapat membuka kembali sesi tanya jawab terdahulu tanpa memerlukan internet.

### B. Next.js Orchestrator (`NEXTJS/brosur-ahad-pagi`)
* **File Utama:** `app/api/ai/chat/route.ts`
* **Tanggung Jawab:**
  1. **API Gateway & Sanitasi Keamanan:** Mengamankan API key AI dan memastikan hanya request valid yang dapat mengakses inferensi LLM.
  2. **Ekstraksi Keyword Cerdas (Query Rewriter):** Memproses kalimat bahasa sehari-hari pengguna (misalnya *"bagaimana hukum selamatan kematian?"*) menjadi keyword pencarian database yang tepat (`"kematian OR tahlilan OR selamatan"`).
  3. **RAG Context Retrieval:** Menjalankan fungsi stored procedure PostgreSQL (`search_brosur_ranked`) di Supabase untuk mengambil potongan teks brosur yang paling relevan.
  4. **Dynamic System Rules Injection:** Menyuntikkan aturan hukum yang dikelola oleh Pengurus MTA (tabel `ai_knowledge_rules`) ke dalam prompt utama secara dinamis.
  5. **Anti-Hallucination & Anti-Inference Guardrail:** Memaksa model menjawab *HANYA* berdasarkan teks brosur MTA, melarang menyimpulkan hukum sendiri di luar dalil shahih yang ada di materi.

### C. Supabase Database (`PostgreSQL Cloud`)
* **Tabel Utama:**
  * `brosur`: Menyimpan naskah lengkap seluruh edisi brosur MTA beserta kolom `teks_bersih` dan naskah HTML asli.
  * `ai_knowledge_rules`: Menyimpan instruksi penegasan fatwa/hukum spesifik berdasarkan kata kunci tertentu.
  * `app_settings`: Pengaturan saklar AI on/off, default model yang aktif, dan token konfigurasi.
* **Fungsi RPC:** `search_brosur_ranked(search_query, filter_folder_id)` yang mengkombinasikan Full-Text Search (tsvector) dengan ranking bobot relevansi.

---

## 3. Skema Kontrak API (`POST /api/ai/chat`)

### Request Body (dari Flutter ke Next.js)
```json
{
  "messages": [
    {
      "role": "user",
      "content": "Bolehkah seorang wanita memotong kukunya saat sedang haid?"
    }
  ],
  "wordCount": 100,
  "model": "google/gemini-2.5-flash",
  "localContext": ""
}
```

### Response Body (dari Next.js ke Flutter - Mode Standar JSON)
```json
{
  "success": true,
  "text": "Saudaraku, Guru Daerah yang dirahmati Allah.\n\nMengenai memotong kuku atau rambut bagi wanita yang sedang berhadats besar (haid atau nifas), di dalam Brosur MTA tidak ada satu pun dalil shahih yang melarangnya atau mewajibkan mengumpulkan kuku/rambut tersebut untuk dimandikan bersama...",
  "docs": [
    {
      "judul": "Tuntunan Thaharah dan Bersuci",
      "tahun": "2018"
    }
  ],
  "debug": {
    "extractedKeyword": "haid OR potong kuku OR mandi wajib",
    "modelUsed": "google/gemini-2.5-flash"
  }
}
```

---

## 4. Keuntungan Sentralisasi di Next.js

1. **Zero Client Update:** Jika ada revisi kalimat pembuka, perubahan format rujukan ayat, atau penyesuaian aturan fiqih MTA, admin cukup mengubahnya di server Next.js atau tabel Supabase. 100% pengguna aplikasi Flutter langsung mendapatkan perbaikan tanpa perlu menunggu update Google Play Store.
2. **Kerahasiaan Kredensial:** Kunci rahasia OpenRouter, DeepSeek, atau Gemini API tersimpan di `process.env` server Next.js, mustahil didekompilasi dari file APK oleh pihak luar.
3. **Optimasi Biaya Terpusat:** Admin dapat mengalihkan rute model (misal dari Gemini ke DeepSeek atau Qwen) dari dashboard kontrol server kapan saja jika salah satu provider sedang mengalami kendala atau menawarkan harga promo lebih hemat.
