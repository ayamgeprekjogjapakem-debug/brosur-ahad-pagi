# 📱 Spesifikasi Desain & Arsitektur Mobile Flutter: Pencarian Biasa vs Mode AI

Dokumen rancangan sistem dan antarmuka (UI/UX) untuk aplikasi Mobile Flutter Pustaka MTA yang membedakan secara tegas antara **Pencarian Biasa (Arsip Brosur & Hadits)** dan **Mode AI (Sahabat MTA)**.

---

## 1. 🎯 Perbandingan Konseptual & Arsitektur

| Aspek | 🔍 Pencarian Biasa (Regular Search) | ✨ Mode AI (Sahabat MTA) |
| :--- | :--- | :--- |
| **Fokus Utama** | Menemukan arsip naskah asli, ayat, nomor brosur, dan matan hadits secara literal | Menjawab pertanyaan fiqih, menyimpulkan dalil, dan menelaah hukum secara interaktif |
| **Konektivitas** | **Hybrid / Offline-First** (SQLite & Hive lokal, fallback online Supabase) | **Murni ONLINE** (API LLM OpenRouter & RAG Serverless Vercel) |
| **Kecepatan Respon** | Instan (< 100 ms di SQLite lokal, < 500 ms via RPC) | 10 – 25 detik (inferensi multi-tahap LLM & RAG) |
| **Identitas Visual** | Emerald Green (`#10B981`), Icon `search_rounded` | Deep Indigo & Sparkles (`#4F46E5`), Icon `auto_awesome` |
| **Hasil yang Ditampilkan**| Daftar kartu brosur dengan highlight kata kunci, nomor brosur, & tahun | Balon dialog percakapan, matan Arab RTL, kutipan dalil, kesimpulan, & tombol Rebuild |
| **Layar Target Flutter** | `HaditsSearchResultsScreen` | `AiChatScreenV2` |

---

## 2. 🧩 Komponen Antarmuka Layar Beranda (`HomeSearchSection`)

### A. Segmented Mode Controller (Tab Pemilih)
Terletak tepat di atas kotak input pencarian untuk memberi kontrol penuh kepada pengguna:
```dart
// Pilihan Mode:
[ 🔍 Cari Dalil & Brosur ]   [ ✨ Tanya AI Pustaka (Resmi) ]
```

### B. Kotak Input Dinamis
* **Saat Mode Biasa Aktif:**
  - Border: `#E2E8F0` (Netral).
  - Icon Kiri: `Icons.search_rounded` (`#10B981`).
  - Placeholder: `"Ketik kata kunci atau tema kajian..."`.
  - Tombol Kanan: `[ Cari ]` (Background `#10B981`, Text Putih).
  - Aksi Klik: Membuka `HaditsSearchResultsScreen(initialQuery: query)`.

* **Saat Mode AI Aktif:**
  - Border: `#4F46E5` dengan glow lembut shadow.
  - Icon Kiri: `Icons.auto_awesome` (`#4F46E5`).
  - Placeholder: `"Tanyakan fiqih, dalil, atau materi kajian..."`.
  - Tombol Kanan: `[ ✨ Tanya AI ]` (Background `#4F46E5`, Icon Bintang Emas).
  - Aksi Klik: Seketika bertransisi membuka `AiChatScreenV2(initialQuery: query)`.

### C. Kartu Rekomendasi AI Hero (Hanya Muncul di Mode AI)
Menampilkan pengenalan fitur AI beserta chip pertanyaan populer:
1. *"Tata cara shalat jamak dan qashar saat safar"*
2. *"Kapan wajib sujud sahwi dan apa bacaannya?"*
3. *"Hukum zakat fitrah dibayarkan dengan uang"*
4. *"Rukun, syarat sah, dan adab pernikahan Islami"*

---

## 3. 💬 Detail Antarmuka Layar AI (`AiChatScreenV2`)

Ketika pengguna memilih Mode AI atau mengklik tombol **Tanya AI**, aplikasi berpindah ke layar percakapan khusus:

1. **Sapaan Resmi Pembuka:**
   - `"Assalamu’alaikum! Saya Asisten AI Sahabat MTA..."`
2. **Indikator Proses Berpikir (Animated Reasoning Bar):**
   - Menampilkan tahapan RAG: *"Menganalisis pertanyaan..."* ➔ *"Mencari dalil di korpus Brosur..."* ➔ *"Menyusun kesimpulan hukum..."*.
3. **Format Ayat & Dalil:**
   - Teks Arab menggunakan font Scheherazade New / Amiri, berukuran 22px, alignment kanan (RTL), dengan background container hijau lembut.
4. **Tombol Interaksi Pada Setiap Balasan:**
   - 📌 **Simpan**: Menyimpan dalil ke koleksi pribadi offline.
   - 📋 **Salin**: Menyalin teks jawaban ke clipboard.
   - 📤 **Bagikan**: Membagikan jawaban ke WhatsApp/Media sosial.
   - ✏️ **Edit & Rebuild**: Mengedit pertanyaan awal dan meminta AI menalar ulang.

---

## 4. 🚀 Checklist Implementasi Kode Flutter

- [x] Tambahkan state `_isAiMode` di `lib/screens_v2/components/home_search_section.dart`.
- [x] Buat widget `_buildModeTab` dengan animasi transisi warna dan shadow.
- [x] Perbarui callback `onPerformSearch(bool isAiMode)` di `home_screen_v2.dart`.
- [x] Hubungkan mode biasa ke `HaditsSearchResultsScreen`.
- [x] Hubungkan mode AI ke `AiChatScreenV2`.
- [x] Buat tombol AI di AppBar atas langsung membuka `AiChatScreenV2`.
- [x] Konfigurasikan HTTP client toleran SSL `_createSafeClient` pada `ai_chat_screen_v2.dart`.

