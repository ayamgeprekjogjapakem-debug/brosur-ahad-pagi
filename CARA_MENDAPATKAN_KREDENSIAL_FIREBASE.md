# 🔍 Panduan Lengkap: Cara Mendapatkan Kredensial Firebase Service Account

Panduan ini menjelaskan langkah demi langkah secara visual dan terperinci untuk mendapatkan nilai **`FIREBASE_PROJECT_ID`**, **`FIREBASE_CLIENT_EMAIL`**, dan **`FIREBASE_PRIVATE_KEY`** dari **Firebase Console**.

---

## 📌 Ringkasan 3 Langkah Utama

```text
[Buka Firebase Console] 
       ↓ 
[Project Settings ⚙️ ➔ Tab "Service accounts"] 
       ↓ 
[Klik "Generate new private key" ➔ Download File .json] 
       ↓ 
[Buka file .json ➔ Salin 3 nilai ke .env.local]
```

---

## 🧭 Langkah Demi Langkah (Step-by-Step)

### Langkah 1: Buka Firebase Console
1. Buka browser Anda dan kunjungi: **[https://console.firebase.google.com/](https://console.firebase.google.com/)**
2. Login menggunakan akun Google Anda.
3. Klik pada **nama project** Anda (misalnya: `pustaka-ahad-pagi` atau project yang digunakan untuk aplikasi mobile Anda).
   *(Jika belum punya project, klik **"Add project"** dan ikuti panduan pembuatan project).*

---

### Langkah 2: Masuk ke Menu "Project Settings"
1. Perhatikan menu bilah sisi kiri (*sidebar*), di bagian paling atas samping logo Firebase.
2. Klik ikon **Roda Gigi / Gear (⚙️)** di sebelah tulisan **Project Overview**.
3. Pilih menu **Project settings**.

---

### Langkah 3: Masuk ke Tab "Service Accounts"
1. Di halaman Project settings, Anda akan melihat beberapa tab:
   * *General*
   * *Cloud Messaging*
   * **Service accounts** 👈 *(Klik tab ini)*
   * *Data privacy*
   * *Users and permissions*
2. Pastikan pilihan bahasa SDK yang terpilih adalah **Node.js**.

---

### Langkah 4: Generate & Download Kunci Privat (.json)
1. Di bawah kode contoh Node.js, Anda akan menemukan tombol berwarna biru / putih:  
   👉 **[ Generate new private key ]** *(atau "Buat kunci privat baru")*
2. Klik tombol tersebut.
3. Akan muncul kotak dialog peringatan (*pop-up*) keamanan yang mengingatkan agar menjaga kerahasiaan kunci ini.
4. Klik tombol konfirmasi: **Generate key**.
5. Browser Anda akan langsung mengunduh satu file dengan ekstensi `.json`, contoh namanya:
   ```text
   pustaka-ahad-pagi-firebase-adminsdk-abcde-1234567890.json
   ```

---

## 📄 Langkah 5: Buka File `.json` & Salin Kredensialnya

Buka file `.json` yang baru saja didownload menggunakan **VS Code**, **TextEdit**, atau **Notepad**.

Isi file tersebut akan terlihat persis seperti ini:

```json
{
  "type": "service_account",
  "project_id": "pustaka-ahad-pagi-12345",
  "private_key_id": "8f3b2a1c9e7d6f5a4b3c2d1e0f",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC7V...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-abcde@pustaka-ahad-pagi-12345.iam.gserviceaccount.com",
  "client_id": "109876543210987654321",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-abcde%40..."
}
```

---

## 🎯 Pemetaan (Mapping) ke File `.env.local`

Salin nilai dari file `.json` ke dalam file [`.env.local`](file:///Users/rifqiwariyanto/Documents/GitHub/NEXTJS/brosur-ahad-pagi/.env.local) Anda:

| Variabel di `.env.local` | Diambil Dari Properti File `.json` | Contoh Nilai |
| :--- | :--- | :--- |
| `FIREBASE_PROJECT_ID` | `"project_id"` | `"pustaka-ahad-pagi-12345"` |
| `FIREBASE_CLIENT_EMAIL` | `"client_email"` | `"firebase-adminsdk-abcde@pustaka-ahad-pagi-12345.iam.gserviceaccount.com"` |
| `FIREBASE_PRIVATE_KEY` | `"private_key"` | `"-----BEGIN PRIVATE KEY-----\nMIIEvgIBA...\n-----END PRIVATE KEY-----\n"` |

### Contoh Hasil Akhir di File `.env.local`:

```env
# --- FIREBASE CLOUD MESSAGING (FCM) SERVICE ACCOUNT ---
FIREBASE_PROJECT_ID="pustaka-ahad-pagi-12345"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-abcde@pustaka-ahad-pagi-12345.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC7V...\n-----END PRIVATE KEY-----\n"
```

---

## ⚠️ Hal Penting yang Wajib Diperhatikan:

1. **Format Private Key:**
   * Jangan hapus teks `\n` di dalam private key.
   * Pastikan seluruh string private key dibungkus dengan tanda petik dua (`"`).
   * Jangan menghapus bagian `-----BEGIN PRIVATE KEY-----\n` dan `\n-----END PRIVATE KEY-----\n`.
2. **Keamanan:**
   * Jangan bagikan atau kirim file `.json` ini ke orang lain.
   * File `.json` ini jangan pernah di-commit ke Git / repositori publik.
3. **Aktivasi Otomatis:**
   * Begitu file [`.env.local`](file:///Users/rifqiwariyanto/Documents/GitHub/NEXTJS/brosur-ahad-pagi/.env.local) disimpan, buka halaman **`http://localhost:3000/admin/notifikasi`**.
   * Status di pojok kanan atas akan langsung otomatis berubah menjadi:  
     🟢 **`FCM Aktif (pust***)`**
