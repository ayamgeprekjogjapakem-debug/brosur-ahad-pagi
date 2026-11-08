# 📊 Analisis Mendalam: Mengapa Jawaban AI Tidak Konsisten Antara Mobile, Web, dan Simulator?

Dokumen ini membedah akar permasalahan teknis mengapa pertanyaan yang sama (misal: *"jika kita aqiqah hati ke 21 bisa"*) menghasilkan jawaban yang berbeda-beda:
- **Di Flutter Mobile**: 0 Brosur ditemukan ➔ Jawaban singkat tanpa dalil Arab.
- **Di Web (`/ai-pustaka`)**: 3 Brosur ditemukan ➔ Mengutip dalil HR. Abu Dawud.
- **Di AI Simulator (Dual Run)**: Web dapat 3 brosur (mengutip HR. Ibnu Hibban), Mobile dapat 0 brosur.

---

## 🔍 1. Ringkasan Akar Masalah (Root Cause)

Inkonsistensi ini **BUKAN** karena perbedaan platform (Flutter vs Next.js), melainkan terjadi di **Backend AI Pipeline (`/api/ai/chat`)** pada 3 titik kritis:

```
Pertanyaan User: "jika kita aqiqah hati ke 21 bisa" (Ada Typo: 'hati')
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ TAHAP 1: LLM Keyword Extraction (Non-Deterministik)             │
│ Model: DeepSeek / Gemini (temperature: 0.1)                     │
└─────────────────────────────────────────────────────────────────┘
                         │
         ┌───────────────┴───────────────┐
         ▼                               ▼
   Skenario A (Beruntung)         Skenario B (Gagal)
   Keyword: "aqiqah"              Keyword: "aqiqah OR hati OR ke-21"
         │                               │
         ▼                               ▼
┌─────────────────────────────────────────────────────────────────┐
│ TAHAP 2: Supabase RPC 'search_brosur_ranked'                    │
│ Menggunakan: websearch_to_tsquery('indonesian', query)          │
└─────────────────────────────────────────────────────────────────┘
         │                               │
         ▼                               ▼
   Hasil: 3 Brosur Ditemukan      Hasil: 0 Brosur (KOSONG!)
   (Retrieved Docs > 0)           (Tanda '-' di ke-21 dianggap NOT)
         │                               │
         ▼                               ▼
┌─────────────────────────────────────────────────────────────────┐
│ TAHAP 3: LLM Generation (System Prompt Sahabat MTA)             │
└─────────────────────────────────────────────────────────────────┘
         │                               │
         ▼                               ▼
[JAWABAN LENGKAP]               [JAWABAN KOSONG / MINIM]
• Ada Matan Hadits Arab         • "Mohon maaf, tidak ada informasi..."
• Ada Rujukan No. Brosur        • TIDAK ADA teks dalil Arab
• Ada Terjemahan                • Tidak ada rujukan nomor brosur
```

---

## 🧩 2. Bedah Teknis 4 Faktor Penyebab Utama

### A. Perangkap Operator `websearch_to_tsquery` PostgreSQL
Di `app/api/ai/chat/route.ts` line 104, backend memanggil:
```sql
SELECT * FROM search_brosur_ranked('aqiqah OR hati OR ke-21');
```
Di dalam fungsi SQL (`scripts/setup_fts_ranked.sql`):
```sql
b.fts @@ websearch_to_tsquery('indonesian', search_query)
```
* **Karakter Minus (`-`)**: Pada `websearch_to_tsquery`, tanda strip `-` diartikan sebagai operator **NEGASI (NOT)**!
* Kata `ke-21` diubah oleh PostgreSQL menjadi:
  $$\text{'aqiqah'} \lor \text{'hati'} \lor (\text{'ke'} \land \neg\text{'21'})$$
* Akibatnya, brosur yang memuat angka 21 atau terbitan terkait **dikecualikan (difilter keluar)** secara otomatis oleh mesin database!

### B. Typo Pengguna ("hati" vs "hari") Tidak Ternormalisasi di AI Chat
* Di portal pencarian biasa (`/api/search-koleksi`), Next.js memiliki kamus pintar `search-dictionary.ts` yang mengoreksi typo dan menyamakan sinonim (*aqiqah* = *akikah* = *aqiqoh*, *hati* = *hari*).
* **Sayangnya di endpoint `/api/ai/chat`, kamus ini BELUM DIGUNAKAN!**
* AI Chat menyerahkan ekstraksi keyword mentah-mentah ke LLM tanpa pembersihan typo terlebih dahulu.

### C. Sifat Non-Deterministik LLM (*Keyword Extraction Lottery*)
* Pada saat Anda mencoba di Web: LLM kebetulan mengembalikan keyword bersih: `"aqiqah"`. Database menemukan naskah Brosur Aqiqah No. 2262.
* Pada saat dicoba di Mobile / Flutter: LLM mengembalikan keyword dengan angka dan typo: `"aqiqah OR hati OR ke-21"`. Database mengembalikan **0 dokumen**.
* Karena dokumen kosong, prompt yang dikirim ke AI berbunyi: `=== KONTEKS BROSUR === (Konteks kosong. Ingat Aturan: Jangan Mengarang)`.
* Akibatnya, AI patuh pada aturan dan menjawab: *"Mohon maaf, tidak ada informasi tentang pelaksanaan aqiqah pada hari ke-21 di database kami..."*.

### D. Variasi Dalil yang Dikutip
* Ketika RAG berhasil mendapatkan naskah brosur, brosur aqiqah MTA memuat lebih dari 1 hadits (hadits Abu Dawud dari Samurah, hadits Ibnu Hibban dari Aisyah, dan hadits Ahmad).
* Karena `temperature: 0.7`, AI terkadang memilih mengutip riwayat Abu Dawud, dan di panggilan berikutnya memilih riwayat Ibnu Hibban.

---

## 🛠️ 3. Solusi Konkret Agar RAG Selalu Konsisten 100%

Agar hasil pencarian RAG di Web dan Mobile selalu konsisten dan tidak lagi mengalami *0 Brosur Ditemukan*, berikut 3 perbaikan yang harus diterapkan di `app/api/ai/chat/route.ts`:

1. **Sanitasi Tanda Baca & Angka**:
   Hapus tanda hubung `-` pada angka ordinal (`ke-21` ➔ `21` atau `hari ke 21`), agar tidak memicu operator NOT di PostgreSQL.

2. **Integrasikan Kamus Normalisasi (`search-dictionary.ts`)**:
   Gunakan fungsi normalisasi yang sama seperti di pencarian brosur web sebelum melakukan query FTS ke Supabase.

3. **Fallback Query Bertingkat**:
   Jika pencarian dengan `extractedKeyword` menghasilkan 0 dokumen, sistem otomatis melakukan fallback mencari dengan kata kunci utama dari pertanyaan awal (misal: hanya kata benda utama `"aqiqah"`). Dengan demikian, konteks brosur **tidak akan pernah kosong** hanya gara-gara typo atau ekstraksi keyword yang berlebih.

---

## 📋 4. Kesimpulan

Ketidakkonsistenan yang terjadi bukan karena aplikasi Flutter berbeda dengan Web, melainkan karena **RAG di backend mengalami fluktuasi hasil pencarian dokumen (antara 0 dokumen vs 3 dokumen)** akibat tanda hubung pada keyword `ke-21` dan kata typo `hati`.

