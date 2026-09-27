# Analisis Strategi RAG (Retrieval-Augmented Generation) untuk Sahabat MTA

Tujuan utama kita adalah: **Menghemat biaya API (Token) menjadi sangat murah, tapi AI tetap mendapat konteks penuh agar tidak salah berfatwa.**

Berikut adalah analisis 3 strategi tingkat lanjut (Advanced RAG) untuk menyelesaikan masalah kehilangan konteks (*Loss of Context*) akibat pemotongan dokumen (*Chunking*).

---

## 1. Strategi "Chunk Overlap" (Solusi Dasar)
Cara paling umum. Kita memotong brosur per 500 kata, lalu melebihkan 50 kata agar bertumpuk (*overlap*) dengan potongan berikutnya.
- **Kelebihan:** Sangat mudah di-coding. Cukup pakai fungsi `slice` atau `substring` biasa.
- **Kelemahan:** Sering kali 50 kata tumpang-tindih tidak cukup untuk merangkum konteks (misal: sub-judulnya ada di awal halaman, sedangkan potongannya ada di akhir halaman).
- **Kecocokan untuk MTA:** ⭐️⭐️ (Bintang 2). Kurang aman karena ini masalah fiqih/hukum agama yang sangat bergantung pada konteks (syarat/pengecualian).

## 2. Strategi "Hybrid Search" (Vektor + Teks)
Alih-alih murni mengandalkan Vektor Semantik (makna), kita menggabungkannya dengan pencarian teks tradisional (*Full Text Search / FTS*).
- **Kelebihan:** Sangat ampuh menanggulangi masalah *Typo* atau transliterasi (ejaan Arab-Latin). Vektor mencari maknanya, FTS mencari kecocokan kata persisnya.
- **Kelemahan:** Membutuhkan *query* *database* yang sedikit lebih kompleks di Supabase (harus menjalankan dua jenis pencarian sekaligus).
- **Kecocokan untuk MTA:** ⭐️⭐️⭐️⭐️ (Bintang 4). Sangat direkomendasikan sebagai pelengkap.

## 3. Strategi "Parent-Child Retrieval" (SOLUSI TERBAIK)
Ini adalah teknik RAG kelas atas yang dipakai oleh perusahaan besar.
Konsepnya: Kita membedakan antara **"Apa yang DICARI oleh Database"** vs **"Apa yang DIBACA oleh AI"**.

**Cara kerjanya:**
1. Satu brosur dibagi menjadi "Blok Besar" (Parent/Induk) misal per halaman penuh.
2. Blok Besar itu dipecah lagi menjadi "Kalimat/Paragraf Kecil" (Child/Anak).
3. Vektor hanya ditanamkan pada Paragraf Kecil (agar *database* bisa mencari dengan super cepat dan sangat tajam).
4. **KUNCI:** Saat *database* menemukan 1 Paragraf Kecil yang relevan, yang dikirimkan ke AI (OpenRouter) **BUKAN** paragraf kecil itu saja, melainkan **KESELURUHAN Blok Induknya!**

- **Kelebihan Utama:** Database mencari dengan presisi laser (sangat cepat, 0.1 detik), tetapi AI membaca dengan konteks seluas samudera (tidak akan pernah salah menafsirkan kata "tersebut" atau kehilangan syarat/pengecualian suatu dalil).
- **Kelemahan:** Butuh logika pembuatan tabel yang sedikit lebih kompleks di awal.
- **Kecocokan untuk MTA:** ⭐️⭐️⭐️⭐️⭐️ (Bintang 5). Sempurna untuk studi literatur agama.

---

## 4. Apakah Database Hadits (`/dashboard/hadist`) Bisa Menggantikan Kebutuhan Ini?
Anda mungkin bertanya: *"Jika kita sudah punya database khusus hadits di `/dashboard/hadist`, apakah kita masih butuh Parent-Child Retrieval pada data brosur?"*

**Jawabannya: Ya, Keduanya Saling Melengkapi (Tidak Bisa Saling Menggantikan).**

Berikut adalah alasannya:
- **Peran `/dashboard/hadist` (Sebagai Kamus/Validasi):** Database ini sangat sempurna untuk menyuplai *teks Arab mentah*, *sanad*, *perawi*, dan *derajat kesahihan* (Shahih/Dhaif). Namun, database hadits **tidak memiliki konteks fikih/fatwa**.
- **Peran Brosur (`/dashboard/data`) (Sebagai Fatwa/Penjelasan):** Sering kali, penulis brosur MTA memberikan *syarah* (penjelasan) spesifik. Contoh: *"Hadits ini memang shahih, **TETAPI** dalam madzhab kita hukum ini dikhususkan hanya untuk musafir."* 
- **Risiko Jika Hanya Mengandalkan Database Hadits:** Jika AI hanya menarik data dari `/dashboard/hadist`, AI hanya tahu haditsnya, tetapi AI **kehilangan pemahaman** tentang bagaimana hadits tersebut ditafsirkan atau digunakan sebagai dalil di dalam brosur terkait.

**Solusi Ideal (Cross-Referencing / Relasional):**
Seperti yang Anda pikirkan, jawaban terbaiknya adalah **Menghubungkan Keduanya**.
Alur kerjanya menjadi seperti ini:
1. AI pertama kali mencari ke tabel Brosur (`/dashboard/data`) untuk mendapatkan **Konteks & Fatwa** (misal: AI menemukan brosur yang membahas "Hukum Aqiqah" yang merujuk pada Hadits Riwayat Abu Dawud No. 2842).
2. Setelah AI tahu hadits mana yang dipakai brosur tersebut, AI (atau sistem di belakang layar) melakukan **Cross-Reference** (pencarian silang) ke tabel `/dashboard/hadist` khusus untuk ID/Nomor hadits tersebut.
3. Hasil akhirnya: AI bisa memberikan fatwa yang 100% sesuai dengan brosur MTA, sekaligus menampilkan Teks Arab Asli yang 100% akurat dan tanpa *typo* hasil tarikan dari Database Hadits!

**Kesimpulan Korelasi:** 
Database Hadits berfungsi sebagai **korektor dan penyedia teks murni**, sedangkan *Parent-Child Retrieval* di tabel Brosur berfungsi sebagai **pemandu arah (anchor) dan penjaga konteks fatwa**. Keduanya diikat melalui relasi nomor/referensi hadits.

---

## Kesimpulan & Rekomendasi Eksekusi
Untuk sistem **"Sahabat MTA"**, saya sangat merekomendasikan kita membangun perpaduan antara **Strategi 3 (Parent-Child)**.

Dengan cara ini:
1. Kita tetap hemat *token* (karena AI hanya membaca 1-2 halaman penuh yang benar-benar relevan, bukan 15 halaman keseluruhan brosur).
2. Akurasi 100% terjaga (karena AI tahu sub-judul dan paragraf sebelumnya).

Jika Anda setuju dengan analisa ini, tugas kita selanjutnya adalah merombak rancangan tabel `brosur_chunks` di Supabase untuk mendukung skema *Parent-Child*!
