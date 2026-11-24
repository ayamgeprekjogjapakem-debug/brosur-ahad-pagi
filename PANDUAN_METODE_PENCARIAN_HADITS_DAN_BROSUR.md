# Dokumentasi Arsitektur & Metode Pencarian Pustaka MTA
*(Sinkronisasi Flutter `hadits_search_results_screen.dart` & Web Next.js)*

Dokumen ini menjelaskan secara menyeluruh tentang **bagaimana metode pencarian bekerja**, **alur algoritma (Multi-Tier)**, serta **dari mana asal data/sumber referensi yang muncul** pada aplikasi Flutter dan Web Next.js.

---

## 1. Alur & Metode Pencarian (Multi-Tier Search Engine)

Metode pencarian di Flutter (`hadits_search_results_screen.dart`) dan Web Next.js (`app/page.tsx` & `/api/hadist/items`) dirancang menggunakan sistem **3 Tingkat (Multi-Tier Fallback)** untuk memastikan pencarian selalu menemukan materi yang dicari, tidak pernah menghasilkan layar kosong jika materinya ada di arsip brosur.

```
                           [ Input Pencarian User ]
                                      │
                                      ▼
           ┌─────────────────────────────────────────────────────┐
           │ TINGKAT 1: Fast Path (Pencarian Dalil Hadits Murni) │
           │ - Cari kata kunci pada kutipan hadist & terjemahan  │
           └──────────────────────────┬──────────────────────────┘
                                      │ Ada hasil?
                      ┌───────────────┴───────────────┐
                     YA                               TIDAK
                      │                               │
                      ▼                               ▼
           ┌─────────────────────┐    ┌──────────────────────────────────────────────┐
           │ Tampilkan Hasil     │    │ TINGKAT 2: Fuzzy, Transliterasi & Typo       │
           │ Dalil Hadits        │    │ - Ekspansi sinonim (shalat/sholat, dll.)     │
           └─────────────────────┘    │ - Koreksi typo via Levenshtein Distance      │
                                      └──────────────────────┬───────────────────────┘
                                                             │ Ada hasil?
                                             ┌───────────────┴───────────────┐
                                            YA                               TIDAK
                                             │                               │
                                             ▼                               ▼
                                  ┌─────────────────────┐    ┌──────────────────────────────────────────────┐
                                  │ Tampilkan dengan    │    │ TINGKAT 3: Fallback Naskah Brosur (1.500+)   │
                                  │ Banner Koreksi Typo │    │ - Pindai judul & teks_bersih arsip brosur    │
                                  └─────────────────────┘    │ - Ekstrak cuplikan paragraf (snippet)        │
                                                             └──────────────────────┬───────────────────────┘
                                                                                    │
                                                                                    ▼
                                                                         ┌─────────────────────┐
                                                                         │ Tampilkan Hasil     │
                                                                         │ Berlabel [Brosur]   │
                                                                         └─────────────────────┘
```

---

### Penjelasan Tiap Tingkat (Tier):

#### Tingkat 1: Fast Path (Dalil Hadits & Ayat)
- **Tujuan**: Menemukan dalil hadits atau ayat Al-Qur'an spesifik yang sudah dikurasi dan diparse.
- **Kolom yang dicari**:
  - `terjemahan` (Teks terjemahan bahasa Indonesia)
  - `kutipan_arab` & `kutipan_arab_gundul` (Teks bahasa Arab dengan atau tanpa harakat)
  - `perawi_sumber` & `rawi_kitab` (HR. Bukhari, Muslim, Tirmidzi, dll.)
- **Operator**: Multi-term `AND` (jika user mencari lebih dari satu kata, misal *"niat puasa"*, kedua kata harus ada dalam satu riwayat).

#### Tingkat 2: Deteksi Typo & Kamus Transliterasi
- Jika kata kunci awal tidak menghasilkan apa-apa, algoritma mengaktifkan **Kamus Transliterasi** (`SYNONYMS_MAP`):
  - *shalat* ⇄ *sholat* ⇄ *solat*
  - *ramadhan* ⇄ *ramadlan*
  - *aqiqah* ⇄ *akikah* ⇄ *'aqiqah*
  - *wudhu* ⇄ *wudlu*
- Jika masih belum ada, dilakukan pengecekan kemiripan huruf (*Levenshtein distance*) terhadap daftar kosakata (*Vocabulary*) database.
- Hasil pencarian akan memunculkan banner kuning:
  > *"Menampilkan X hasil untuk '[kata_baku]' (koreksi otomatis typo)."*

#### Tingkat 3: Fallback Naskah Lengkap Brosur (1.500+ Naskah)
- **Mengapa ini sangat penting?**
  Tabel kurasi hadits (`hadist_brosur`) masih bertahap diisi (saat ini 57 data terverifikasi). Sementara itu, ada **1.509 edisi brosur lengkap** dari tahun 1994 hingga 2026 yang sudah diimpor.
- **Cara Kerja**:
  - Jika kata kunci (misalnya **`aqiqah`**) belum masuk ke tabel hadits murni, sistem otomatis memindai seluruh kolom `judul` dan `teks_bersih` pada tabel `brosur`.
  - Sistem menemukan 33 brosur yang membahas aqiqah (edisi 2026, 2025, 2022, 1997, dll.).
  - Fungsi `extractBrosurSnippet` mengambil potongan kalimat sekitar kata kunci tersebut (110 karakter sebelum dan 220 karakter sesudah) dan membersihkan format kode/HTML/CSS sehingga tampil rapi sebagai cuplikan bacaan.
  - Kartu diberi badge label **`Brosur`** (warna amber) dan tombol **"Menuju Brosur"** akan otomatis melompat dan men-scroll tepat ke paragraf tersebut.

---

## 2. Dari Mana Sumber Data Muncul?

### A. Di Aplikasi Flutter
Pada file `hadits_search_results_screen.dart`, sumber data memiliki mekanisme **Offline First**:

1. **Sumber Utama: Database Lokal SQLite (`DatabaseHelper.dart`)**:
   - Disimpan di internal storage HP pengguna (`pustaka_v2.db`).
   - Tabel `hadits`: Menyimpan hasil kurasi hadits yang diunduh.
   - Tabel `hadits_fts` (Virtual Table FTS5): Indeks teks penuh untuk pencarian super cepat (< 10 milidetik).
   - Tabel `brosur`: Menyimpan 1.500+ naskah brosur offline yang diunduh melalui layar sinkronisasi awal (`InitialSyncScreenV2`).
2. **Sumber Sekunder: Online REST API (`HadistApiService.dart`)**:
   - Jika SQLite lokal belum menemukan hasil dan HP terhubung ke internet, Flutter menghubungi API Web Next.js:
     `GET https://pustaka.mta.or.id/api/hadist/items?search={query}&include_brosur=1`
   - Hasil yang didapat dari server otomatis disimpan kembali ke SQLite lokal agar saat offline di kemudian hari, pencarian tersebut langsung tersedia tanpa internet.

### B. Di Aplikasi Web Next.js
Pada Web Portal Next.js (`app/page.tsx` & `/api/hadist/items`), sumber data langsung berasal dari **Database PostgreSQL Supabase Self-Hosted**:

1. **Tabel `public.hadist_brosur`**:
   - Berisi potongan dalil spesifik: nomor hadits, nama kitab, rawi teratas, kutipan arab, dan terjemahan.
2. **Tabel `public.brosur` (1.509 baris)**:
   - Berisi arsip lengkap naskah Brosur Ahad Pagi (tahun 1994 - 2026).
   - Kolom `teks_bersih`: Naskah polos tanpa tag HTML yang diindeks untuk pencarian teks penuh (*full-text search*).
   - Kolom `konten`: Format HTML lengkap untuk ditampilkan saat user membuka halaman baca brosur (`/bap/{tahun}/{slug}`).
3. **Tabel `public.folders`**:
   - Mengelompokkan edisi brosur (misal: *Brosur Ahad Pagi 1994-2025*, *Koleksi Khusus*, dll.).

---

## 3. Komponen Visual & Interaksi UI (Selaras Flutter & Next.js)

Tampilan hasil pencarian di Flutter dan Web diselaraskan dengan elemen berikut:

| Elemen UI | Flutter (`HaditsCard`) | Web Next.js (`app/page.tsx`) |
| :--- | :--- | :--- |
| **Highlighting** | `RichText` dengan TextSpan latar kuning | Komponen `<HighlightText>` dengan `<mark>` amber |
| **Badge Sumber** | `Al-Qur'an` (Indigo), `Hadist` (Hijau), `Koleksi Brosur` (Amber) | Badge yang sama persis sesuai tipe `sumber_jenis` |
| **Teks Arab** | Font Amiri RTL (Right-to-Left) | Font `'Amiri', serif` RTL |
| **Tombol Brosur** | Tombol *"Buka Naskah Brosur"* | Tombol *"Menuju Brosur"* + auto-scroll ke dalil |
| **Aksi Cepat** | Salin Teks, Share WhatsApp, Bookmark Koleksi | Salin Teks, Share WhatsApp, Bookmark Koleksi |
| **Load More** | Tombol *"Tampilkan Lebih Banyak"* (+10 item) | Tombol *"Tampilkan Lebih Banyak"* (+10 item) |
| **Pencarian Kosong** | Chips saran topik: Shalat, Iman, Puasa, Zakat, dll. | Chips saran topik yang sama saat hasil 0 |

---

## 4. Contoh Kasus: Mengapa Pencarian "Aqiqah" Berhasil?

1. User mengetik `aqiqah`.
2. **Pengecekan Hadits Murni**: Tabel `hadist_brosur` menghasilkan 0 baris (karena materi aqiqah belum selesai diparse sebagai butir hadist tersendiri).
3. **Penyelamatan Otomatis (Fallback Brosur)**:
   Sistem tidak langsung mengembalikan *"Tidak Ditemukan"*, melainkan otomatis mencari ke tabel `brosur`.
4. **Hasil Ditemukan**:
   - Ditemukan **33 edisi brosur resmi** (misal edisi `20260531 AQIQAH`, `20250608 Aqiqah`, `20220710 Aqiqah`, dll.).
   - Paragraf yang membahas aqiqah dipotong menjadi cuplikan ringkas (*snippet*).
   - Ditampilkan ke layar user dengan tanda badge `Brosur` dan tombol `Menuju Brosur` yang siap dibaca secara utuh.
