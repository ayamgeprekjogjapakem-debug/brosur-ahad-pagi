# 🔥 Panduan Lengkap Setup Firebase Admin (FCM Push Notifikasi)

Dokumen ini menjelaskan langkah-demi-langkah cara membuat, mengunduh kredensial Service Account dari Firebase Console, serta mengonfigurasikannya ke dalam aplikasi **Next.js Admin & Super Admin** (`brosur-ahad-pagi`).

---

## 🧭 Ikhtisar Arsitektur

Next.js menggunakan **Google Firebase Cloud Messaging (FCM) HTTP v1 API** untuk mengirim notifikasi langsung ke smartphone jamaah (Android & iOS).

Untuk mengautentikasi server Next.js Anda ke Google Firebase, diperlukan 3 variabel kunci:
1. `FIREBASE_PROJECT_ID`
2. `FIREBASE_CLIENT_EMAIL`
3. `FIREBASE_PRIVATE_KEY`

---

## 🛠️ Langkah 1: Buat & Buka Project di Firebase Console

1. Buka browser dan login ke [Firebase Console](https://console.firebase.google.com/).
2. Jika belum memiliki project:
   * Klik **Add project** (Tambahkan project).
   * Masukkan nama project (contoh: `pustaka-ahad-pagi` atau `pustaka-mta`).
   * Google Analytics opsional (bisa diaktifkan atau dinonaktifkan).
   * Klik **Create project**.

---

## 🔑 Langkah 2: Unduh Service Account Private Key

1. Di Firebase Console, klik icon Gear ⚙️ di pojok kiri atas (sebelah *Project Overview*) → pilih **Project settings**.
2. Masuk ke tab **Service accounts**.
3. Pastikan bahasa yang terpilih adalah **Node.js**.
4. Klik tombol **Generate new private key** (Buat kunci privat baru).
5. Akan muncul pop-up konfirmasi, klik **Generate key**.
6. Browser akan otomatis mengunduh satu file dengan ekstensi `.json` (misalnya: `pustaka-ahad-pagi-firebase-adminsdk-xxxxx.json`).

> [!CAUTION]
> File `.json` ini berisi kunci rahasia tingkat administrator. **JANGAN PERNAH** mengunggah file ini ke repositori publik GitHub!

---

## 📄 Langkah 3: Ekstrak Data dari File `.json`

Buka file `.json` yang baru saja diunduh menggunakan text editor (VS Code, Notepad, dsb). Anda akan melihat struktur data seperti berikut:

```json
{
  "type": "service_account",
  "project_id": "pustaka-ahad-pagi",
  "private_key_id": "9a8b7c6d5e4f...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-abcde@pustaka-ahad-pagi.iam.gserviceaccount.com",
  "client_id": "123456789012345678901",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/..."
}
```

Ambil 3 baris penting:
1. Nilai dari `"project_id"`
2. Nilai dari `"client_email"`
3. Nilai dari `"private_key"` (lengkap dengan teks `-----BEGIN PRIVATE KEY-----` sampai `-----END PRIVATE KEY-----`)

---

## 💻 Langkah 4: Pasang di Lingkungan Lokal (`.env.local`)

Buka file [`.env.local`](file:///Users/rifqiwariyanto/Documents/GitHub/NEXTJS/brosur-ahad-pagi/.env.local) pada proyek Next.js Anda, lalu tambahkan baris berikut di bagian bawah:

```env
# ==============================================================
# FIREBASE CLOUD MESSAGING (FCM) SERVICE ACCOUNT
# ==============================================================
FIREBASE_PROJECT_ID="pustaka-ahad-pagi"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-abcde@pustaka-ahad-pagi.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
```

> [!IMPORTANT]
> **Tips Penulisan `FIREBASE_PRIVATE_KEY`:**
> Pastikan nilai private key dibungkus dengan tanda petik dua `"` dan karakter baris baru tetap ditulis sebagai `\n`. Sistem backend kami ([`utils/fcm.ts`](file:///Users/rifqiwariyanto/Documents/GitHub/NEXTJS/brosur-ahad-pagi/utils/fcm.ts)) sudah otomatis menangani penggantian `\n` menjadi karakter baris baru yang sah.

---

## ☁️ Langkah 5: Pasang di Cloudflare Pages (Production)

Jika aplikasi Next.js Anda dideploy ke Cloudflare Pages:

1. Masuk ke [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Di menu navigasi, pilih **Workers & Pages** → pilih project `brosur-ahad-pagi`.
3. Buka tab **Settings** → menu **Environment variables**.
4. Klik **Add variable** dan tambahkan 3 variabel:
   * Variable name: `FIREBASE_PROJECT_ID` | Value: *(project id Anda)*
   * Variable name: `FIREBASE_CLIENT_EMAIL` | Value: *(client email Anda)*
   * Variable name: `FIREBASE_PRIVATE_KEY` | Value: *(seluruh string private key)*
5. Klik **Save**.
6. Lakukan deploy ulang (*Redeploy*) agar variabel baru aktif.

---

## 🧪 Langkah 6: Cara Verifikasi Bahwa Setup Berhasil

1. Jalankan development server Next.js jika belum aktif:
   ```bash
   npm run dev
   ```
2. Buka halaman admin di browser:
   * **`http://localhost:3000/admin/pengumuman`** (Admin & Super Admin)
3. Di halaman ini, setiap pembuatan atau siaran pengumuman dapat langsung mengirimkan Push Notifikasi ke seluruh ponsel jamaah (topik `semua_pengguna`).
   * **Sebelum Diisi:** Berwarna kuning: `FCM Standby (Mode Uji Coba)`
   * **Setelah Diisi & Valid:** Berwarna hijau menyala dengan titik berkedip:
     ```text
     🟢 FCM Aktif (pust***)
     ```
4. Cobalah mengirim notifikasi uji coba:
   * Pilih template cepat **"Brosur Baru Terbit"** atau ketik judul & isi pesan sendiri.
   * Klik tombol **"Broadcast Notifikasi Sekarang"**.
   * Status akan langsung tercatat sebagai **Live (FCM)** di tabel riwayat di bawah form!

---

## 🚨 Troubleshooting (Penyelesaian Masalah Umum)

### 1. Pesan status: "Gagal autentikasi Google OAuth2: invalid_grant"
* **Penyebab:** Format string `FIREBASE_PRIVATE_KEY` rusak, terpotong, atau jam sistem komputer Anda tidak sinkron.
* **Solusi:** Salin ulang teks private key langsung dari file `.json` unduhan awal. Pastikan tidak ada spasi tambahan di awal/akhir string.

### 2. Pesan status: "FCM Standby (Mode Uji Coba)"
* **Penyebab:** Server belum membaca variabel di `.env.local` atau private key masih berisi string placeholder.
* **Solusi:** Matikan terminal Next.js (`Ctrl + C`), lalu jalankan kembali `npm run dev`.

### 3. Notifikasi tidak muncul di HP Android
* **Penyebab:** Aplikasi Flutter belum mengunduh `google-services.json` yang berasal dari project Firebase yang sama, atau belum *subscribe* ke topik `brosur_baru`.
* **Solusi:** Pastikan file `google-services.json` di folder Flutter `android/app/` berasal dari project Firebase yang sama dengan Service Account di atas.
