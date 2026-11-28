# Checklist Verifikasi & Rilis (Web Next.js & Flutter)

Gunakan daftar periksa ini untuk memastikan seluruh fitur **Web (`brosur-ahad-pagi`)** dan **Mobile (`pustaka` Flutter)** berjalan normal sebelum dan sesudah deploy ke production (`ulilalbab.fun`).

---

## 1. Verifikasi Build & Kode (Terminal Lokal)

### A. Next.js (`brosur-ahad-pagi`)
- [x] `npx tsc --noEmit` lulus tanpa error (0 error, termasuk `.next/types`).
- [x] Perbaikan 6 export App Router invalid (`NINE_BOOKS`, `getPasaran`, `APP_VERSIONS`, `MIGRATION_SQL`) selesai.
- [ ] Jalankan build production di terminal lokal (butuh akses internet untuk `next/font/google`):
  ```bash
  npm run build
  ```
- [ ] *(Opsional)* Jalankan `npm run lint` jika ingin merapikan warning/lint lama (`any`, unescaped quotes).

### B. Flutter (`/Users/rifqiwariyanto/Documents/GitHub/FLUTTER/pustaka`)
- [ ] Jalankan static analyzer di terminal lokal:
  ```bash
  cd /Users/rifqiwariyanto/Documents/GitHub/FLUTTER/pustaka
  flutter analyze
  ```
- [ ] Uji jalan di emulator / perangkat nyata:
  ```bash
  flutter run
  ```

---

## 2. Checklist Pengujian Web (`http://localhost:3000`)

### A. Hak Akses Role (`superadmin` vs `admin`)
- [ ] Buka `/dashboard` tanpa login → otomatis redirect ke `/login`.
- [ ] Login dengan akun role **`superadmin`** → otomatis masuk ke `/dashboard`.
- [ ] Akun **`superadmin`** mencoba buka `/admin` → otomatis diarahkan ke `/dashboard`.
- [ ] Login dengan akun role **`admin`** → otomatis masuk ke `/admin`.
- [ ] Akun **`admin`** mencoba buka `/dashboard` → otomatis diarahkan ke `/admin`.
- [ ] Login dengan akun role **`user`** / nonaktif → ditolak masuk `/dashboard` maupun `/admin`.

### B. Pencarian Publik (`/`)
- [ ] Buka `http://localhost:3000/?q=Adalah%20beliau%20sehari%20berpuasa` → **tidak muncul popup otomatis** `"Brosur Terkait"`.
- [ ] Hasil pencarian **100% berasal dari `hadist_brosur`** (`/dashboard/hadist`), tidak bercampur potongan teks mentah tabel `brosur`.
- [ ] Kata/frasa yang dicari mendapat highlight stabilo kuning di teks Arab & terjemahan.
- [ ] Klik **"Menuju Brosur"** → membuka `/bap/{tahun}/{slug}` dengan highlight & auto-scroll.
- [ ] Klik **"Lihat Detail"** → modal detail menampilkan takhrij, asal brosur, dan penjelasan lengkap.

### C. Generator Ekstraksi Dalil (`/dashboard/hadist/generate`)
- [ ] Data brosur yang sudah tersimpan tidak terpotong di 1.000 baris (`summary_only=1` & list hasil DB).
- [ ] Tampilan **tabular** menampilkan kolom status (`Sinkron`, `Isi Berubah`, `Belum`) dan jumlah dalil per brosur.
- [ ] Ekstrak 1 brosur dengan **DeepSeek AI (Block-Pointer)** → berhasil tanpa error JSON, teks Arab & terjemahan persis brosur asal, dan data lama aman jika insert gagal (*insert-then-delete*).
- [ ] Centang beberapa brosur → klik **Ekstrak Terpilih** → berjalan paralel (3 worker) dan bisa dihentikan dengan tombol **Hentikan**.
- [ ] Klik tab **2. Hasil Ekstraksi & Review** → bisa edit inline, tarik referensi API Gading, atau hapus item.

### D. Rijalul Hadits (`/dashboard/hadist/rijal`)
- [ ] Klik **Tarik dari Hadits** → menarik nama perawi dari `rawi_teratas` di `hadist_brosur` tanpa duplikasi.
- [ ] Klik **Isi Biografi AI** / **Lengkapi Biografi AI** → mengisi nama Arab, thabaqat, kredibilitas, dan biografi otomatis.
- [ ] Klik **Tambah Perawi** → tombol **Isi Otomatis via DeepSeek AI** berfungsi sebelum simpan.
- [ ] Klik ikon **Mata (`Eye`)** / badge jumlah hadits → menampilkan profil + daftar hadits terkait, dan tombol **Edit** / **Hapus** berjalan normal.

### E. Koleksi Kitab (`/dashboard/hadist/kitab`)
- [ ] Menampilkan **seluruh kitab** (9 Kutubut Tis'ah + kitab tambahan dari katalog & database `hadist_brosur`).
- [ ] Pagination (`10 / 15 / 25 / 50` per halaman) dan filter (`Semua`, `Yang Ada Haditsnya`, `Kutubut Tis'ah`, `Kitab Tambahan`) berjalan normal.
- [ ] Klik **Lihat** pada kitab mana pun (termasuk non-Kutubut Tis'ah seperti `Al-Baihaqi` / `Thabrani`) → membuka detail urutan `Juz → Halaman → Nomor Hadist`.

### F. Kelompok / Tema Dalil (`/dashboard/hadist/kelompok`)
- [ ] Klik **Seed Tema Standar** → menambahkan 12 tema Islami default tanpa duplikasi.
- [ ] Klik **Kelompokkan Otomatis** → mengisi `kelompok_id` untuk dalil yang belum bertema.
- [ ] Klik **Buat Tema Baru** / **Edit** / **Hapus** → CRUD tema + pilih warna badge berfungsi normal.
- [ ] Klik jumlah dalil / ikon **Mata (`Eye`)** → menampilkan daftar dalil dalam tema tersebut.

---

## 3. Checklist Pengujian Flutter (`pustaka`)

### A. Deploy Backend Dulu (Wajib untuk Uji Online)
- [ ] Deploy perubahan terbaru `brosur-ahad-pagi` (khususnya `app/api/hadist/items/route.ts`) ke server production **`https://www.ulilalbab.fun`**, agar:
  - Endpoint `GET /api/hadist/items?limit=1` merespons cepat dengan field `total` & `count`.
  - Filter `brosur_id` bertanda kurung (mis. `20260405_THAHARAH_(ke-1)`) terbaca aman.

### B. Uji Pencarian di Aplikasi Flutter
- [ ] **Mode Online (walau database offline belum diunduh):**
  - Ketik `Adalah beliau sehari berpuasa` di Home → langsung masuk ke layar hasil pencarian (tidak diblokir dialog *"Unduh Brosur Dahulu"*).
  - Hasil sesuai dengan Web `http://localhost:3000/?q=Adalah%20beliau%20sehari%20berpuasa`.
- [ ] **Kartu Hasil (`HaditsCard`):**
  - Badge tampil benar (`HADIST` hijau atau `AL-QUR'AN` biru/indigo).
  - Nama kitab/perawi tampil benar (`Bukhari`, `Muslim`, dll — bukan selalu `"Al-Qur'an"`).
  - Footer menampilkan `Dari: <Judul Brosur>` (bukan raw ID brosur).
  - Kata kunci ter-highlight kuning, tombol **Salin** dan **Simpan (Bookmark)** berfungsi.
- [ ] **Layar Detail & Buka Brosur:**
  - Tap kartu → membuka `DetailHaditsScreenV2` lengkap dengan `perawi_sumber`, `rawi_teratas`, `juz`, `halaman`, `no_hadist`, `catatan`.
  - Tap **Brosur** / **Buka Brosur** → membuka `DetailBrosurScreenV2` tanpa error not found.
- [ ] **Filter & Mode Offline:**
  - Tap filter chip **Semua / Hadist / Al-Qur'an** memfilter hasil dengan benar.
  - Matikan internet → pencarian fallback ke tabel `hadits` lokal tanpa mencampur potongan teks mentah brosur.

---

## 4. Ringkasan Status Akhir

| Area | Status | Keterangan |
| :--- | :---: | :--- |
| TypeScript Next.js (`tsc --noEmit`) | **Lulus (0 error)** | Semua route & halaman terverifikasi |
| Build Next.js (`npm run build`) | **Perlu run lokal** | Sandbox memblokir download `next/font/google` |
| Static Analysis Flutter (`flutter analyze`) | **Perlu run lokal** | Sandbox memblokir `xcode-select` |
| Sinkronisasi API Production (`ulilalbab.fun`) | **Perlu deploy** | Deploy Next.js agar Flutter langsung memakai API terbaru |
