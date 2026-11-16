# Panduan Lengkap Instalasi & Menghubungkan Supabase Self-Hosted

Dokumen ini berisi panduan langkah demi langkah untuk menginstal **Supabase Self-Hosted** pada VPS (Virtual Private Server) dan menghubungkannya dengan aplikasi **Next.js** (`brosur-ahad-pagi`) serta aplikasi mobile **Flutter** (`pustaka`).

---

## Daftar Isi
1. [Mengapa Memilih Self-Hosted?](#1-mengapa-memilih-self-hosted)
2. [Spesifikasi Minimum VPS](#2-spesifikasi-minimum-vps)
3. [Langkah Instalasi Supabase di VPS](#3-langkah-instalasi-supabase-di-vps)
4. [Konfigurasi Domain & SSL (Nginx / Reverse Proxy)](#4-konfigurasi-domain--ssl)
5. [Migrasi Skema & Data Database](#5-migrasi-skema--data-database)
6. [Menghubungkan Aplikasi Next.js](#6-menghubungkan-aplikasi-nextjs)
7. [Menghubungkan Aplikasi Flutter](#7-menghubungkan-aplikasi-flutter)
8. [Tips Keamanan & Backup Otomatis Rutin](#8-tips-keamanan--backup-otomatis-rutin)

---

## 1. Mengapa Memilih Self-Hosted?

| Aspek | Supabase Cloud (Free Tier) | Supabase Self-Hosted |
| :--- | :--- | :--- |
| **Batas Egress / Bandwidth** | Maksimal **5 GB / bulan** (rentan terblokir saat unduhan brosur/PDF banyak) | **Unlimited** (sesuai kuota VPS, biasanya 1 TB – Unlimited) |
| **Kapasitas Database** | 500 MB | Tergantung ukuran SSD VPS (40 GB – 100+ GB) |
| **Biaya** | Gratis hingga batas kuota, lalu \$25+/bulan | Flat harga sewa VPS (misal: \$4 – \$6 / bulan) |
| **Dukungan AI & pgvector** | Terbatas | Penuh 100% tanpa batas row embedding |
| **Kontrol Akses** | Dikelola Supabase Cloud | Akses root server penuh di tangan Anda |

---

## 2. Spesifikasi Minimum VPS

Penyedia VPS yang direkomendasikan: **Hetzner**, **DigitalOcean**, **Contabo**, **IDCloudHost**, atau **Linode/Akamai**.

- **Sistem Operasi**: Ubuntu 22.04 LTS atau Ubuntu 24.04 LTS
- **CPU**: 2 Core (Rekomendasi)
- **RAM**: Minimal 4 GB (Atau 2 GB dengan Swap File 2 GB)
- **Penyimpanan**: Minimal 40 GB SSD / NVMe
- **Port Terbuka**:
  - `80` (HTTP)
  - `443` (HTTPS)
  - `22` (SSH)

---

## 3. Langkah Instalasi Supabase di VPS

### A. Persiapan Server & Docker
Login ke VPS via terminal SSH:
```bash
ssh root@IP_SERVER_ANDA
```

Perbarui paket dan pasang Docker & Docker Compose:
```bash
# Update sistem
sudo apt update && sudo apt upgrade -y

# Pasang Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Pasang Git & Curl jika belum ada
sudo apt install -y git curl ufw
```

### B. Clone Repositori Resmi Supabase Docker
```bash
# Masuk ke direktori home/root
cd ~

# Unduh repositori resmi Supabase
git clone --depth 1 https://github.com/supabase/supabase

# Masuk ke direktori docker
cd supabase/docker

# Salin template environment
cp .env.example .env
```

### C. Menghasilkan Kunci Keamanan (JWT Secret & API Keys)
Supabase memerlukan `JWT_SECRET`, `ANON_KEY`, dan `SERVICE_ROLE_KEY`.

Jalankan perintah ini di VPS Anda untuk menghasilkan secret acak yang kuat:
```bash
# 1. Hasilkan JWT Secret baru
openssl rand -base64 32
```
*Catat hasil string di atas sebagai `JWT_SECRET` Anda.*

Untuk menghasilkan `ANON_KEY` dan `SERVICE_ROLE_KEY` berbasis JWT Secret tersebut:
1. Kunjungi generator token online aman: **https://jwt.io**
2. Atau gunakan skrip Node.js cepat di server:
```bash
node -e "
const jwt = require('jsonwebtoken');
const secret = 'PASTE_JWT_SECRET_ANDA_DISINI';
console.log('ANON_KEY:\n', jwt.sign({ role: 'anon', iss: 'supabase', iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + (10 * 365 * 24 * 3600) }, secret));
console.log('\nSERVICE_ROLE_KEY:\n', jwt.sign({ role: 'service_role', iss: 'supabase', iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + (10 * 365 * 24 * 3600) }, secret));
"
```

### D. Konfigurasi File `.env`
Buka file konfigurasi:
```bash
nano .env
```

Perbarui baris-baris kunci berikut:
```env
############
# Secrets
############
POSTGRES_PASSWORD=GantiDenganPasswordDatabaseYangKuat123!
JWT_SECRET=GantiDenganJwtSecretYangDihasilkanTadi
ANON_KEY=GantiDenganAnonKeyYangDihasilkanTadi
SERVICE_ROLE_KEY=GantiDenganServiceRoleKeyYangDihasilkanTadi

############
# Dashboard / Studio Credentials
############
DASHBOARD_USERNAME=admin
DASHBOARD_PASSWORD=GantiPasswordLoginStudio123!

############
# API & URLs
############
# Jika memakai domain sendiri dengan SSL (contoh: https://db.domainanda.com):
API_EXTERNAL_URL=https://db.domainanda.com
SITE_URL=https://brosur-ahad-pagi.com
ADDITIONAL_REDIRECT_URLS=http://localhost:3000,https://brosur-ahad-pagi.com
```
*Simpan perubahan dengan menekan `Ctrl + O`, lalu `Enter`, kemudian keluar dengan `Ctrl + X`.*

### E. Menjalankan Supabase
```bash
# Unduh image container
docker compose pull

# Jalankan semua container di background
docker compose up -d
```

Periksa status container:
```bash
docker compose ps
```
Semua container (`supabase-db`, `supabase-kong`, `supabase-studio`, `supabase-auth`, `supabase-rest`, `supabase-storage`) harus berstatus **Up / Healthy**.

---

## 4. Konfigurasi Domain & SSL

Untuk keamanan Flutter dan Next.js, endpoint Supabase harus menggunakan protokol **HTTPS**.

### Menggunakan Nginx & Certbot (Let's Encrypt)

1. Pasang Nginx dan Certbot:
```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

2. Buat konfigurasi virtual host:
```bash
sudo nano /etc/nginx/sites-available/supabase
```

Isi dengan konfigurasi berikut (ganti `db.domainanda.com` dengan subdomain Anda):
```nginx
server {
    server_name db.domainanda.com;

    # Supabase Kong API Gateway (Port 8000)
    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Upload brosur & file besar
        client_max_body_size 100M;
    }
}
```

3. Aktifkan konfigurasi dan minta sertifikat SSL:
```bash
sudo ln -s /etc/nginx/sites-available/supabase /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Buat sertifikat SSL gratis otomatis
sudo certbot --nginx -d db.domainanda.com
```

Sekarang Supabase Anda dapat diakses di:
- **API Endpoint**: `https://db.domainanda.com`
- **Dashboard Studio**: `https://db.domainanda.com/dashboard` (gunakan username & password `DASHBOARD_USERNAME` yang diatur di `.env`).

---

## 5. Migrasi Skema & Data Database

### A. Ekspor Data Lama dari Supabase Cloud (Jika Ada)
Di komputer lokal Anda, ekspor data dari Supabase Cloud:
```bash
# Menggunakan pg_dump dari Cloud (lihat connection string di Supabase Settings > Database)
pg_dump "postgres://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres" \
  --schema=public \
  --clean --if-exists \
  --file=backup_supabase_cloud.sql
```

### B. Impor Skema ke Supabase Self-Hosted (3 Pilihan Cara)

Kami telah menyiapkan struktur resmi **`supabase/migrations/`** dan 1 file master **`supabase/init.sql`** yang menggabungkan seluruh skema (Brosur, Folders, Quran, Hadist, Admin, Access Codes dengan kuota AI, pgvector, dan Hybrid Search).

#### Opsi 1 (Paling Cepat): Salin Master Init ke Supabase SQL Editor
1. Buka file master: [supabase/init.sql](file:///Users/rifqiwariyanto/Documents/GitHub/NEXTJS/brosur-ahad-pagi/supabase/init.sql).
2. Salin seluruh isinya.
3. Buka **Supabase Studio** di browser Anda: `https://db.domainanda.com/dashboard` (atau `http://IP_VPS:8000`), masuk ke menu **SQL Editor**.
4. Tempel (Paste) lalu klik **Run**. Seluruh tabel, fungsi RPC, dan trigger akan langsung terbentuk sempurna!

#### Opsi 2 (Otomatis Saat Docker Pertama Booting):
Sebelum menjalankan `docker compose up -d` di VPS, salin file [supabase/init.sql](file:///Users/rifqiwariyanto/Documents/GitHub/NEXTJS/brosur-ahad-pagi/supabase/init.sql) ke direktori init Docker:
```bash
cp init.sql ~/supabase/docker/volumes/db/init/01_master_init.sql
```
Saat container database pertama kali booting, PostgreSQL akan otomatis mengeksekusi file tersebut tanpa perlu input manual.

#### Opsi 3: Menggunakan Supabase CLI Migrations
Jika menggunakan Supabase CLI di komputer lokal, struktur migrasi resmi sudah tersedia di folder [supabase/migrations/](file:///Users/rifqiwariyanto/Documents/GitHub/NEXTJS/brosur-ahad-pagi/supabase/migrations/):
1. `20261101000001_core_schema.sql` (Brosur, Folders, FTS, Materi Kajian, Masukan)
2. `20261102000002_quran_and_hadist.sql` (Quran Kemenag, Hadist Brosur, Takhrij & Rawi)
3. `20261103000003_admin_and_access_codes.sql` (App Settings, Access Codes, Kuota Harian AI)
4. `20261104000004_ai_and_vector.sql` (pgvector, Brosur Chunks, Hybrid Search AI)

Jalankan perintah berikut untuk migrasi:
```bash
npx supabase db push --db-url "postgresql://postgres:PASSWORD_DATABASE_ANDA@db.domainanda.com:5432/postgres"
```


---

## 6. Menghubungkan Aplikasi Next.js

Buka file konfigurasi environment proyek Next.js:
File: [.env.local](file:///Users/rifqiwariyanto/Documents/GitHub/NEXTJS/brosur-ahad-pagi/.env.local)

Ganti nilai environment Supabase lama dengan server self-hosted Anda:

```env
# ==============================================================================
# KONFIGURASI SUPABASE SELF-HOSTED
# ==============================================================================
NEXT_PUBLIC_SUPABASE_URL=https://db.domainanda.com
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI... (Isi dari ANON_KEY VPS)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI... (Isi dari SERVICE_ROLE_KEY VPS)
```

Setelah mengubah `.env.local`:
```bash
# Restart server development Next.js
npm run dev
```
Semua modul Next.js:
- [utils/supabase/client.ts](file:///Users/rifqiwariyanto/Documents/GitHub/NEXTJS/brosur-ahad-pagi/utils/supabase/client.ts)
- [utils/supabase/server.ts](file:///Users/rifqiwariyanto/Documents/GitHub/NEXTJS/brosur-ahad-pagi/utils/supabase/server.ts)
- Halaman admin & API routes

akan langsung terhubung secara otomatis ke database VPS baru Anda tanpa perlu mengubah baris kode apa pun!

---

## 7. Menghubungkan Aplikasi Flutter

Buka proyek Flutter `pustaka`:

### 1. Perbarui Inisialisasi di `lib/main.dart`
Buka file [lib/main.dart](file:///Users/rifqiwariyanto/Documents/GitHub/FLUTTER/pustaka/lib/main.dart):

```dart
  // Inisialisasi Supabase Self-Hosted
  try {
    await Supabase.initialize(
      url: 'https://db.domainanda.com', // URL Domain VPS Anda
      anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI...', // ANON_KEY dari VPS Anda
      publishableKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI...',
      headers: {'User-Agent': customUserAgent},
    );
  } catch (e) {
    debugPrint('Supabase initialize note: $e');
  }
```

### 2. Perbarui juga di Fallback Service
Buka file [lib/services/pengumuman_service.dart](file:///Users/rifqiwariyanto/Documents/GitHub/FLUTTER/pustaka/lib/services/pengumuman_service.dart) pada fungsi `_getClient()`:

```dart
  static Future<SupabaseClient?> _getClient() async {
    try {
      return Supabase.instance.client;
    } catch (_) {
      try {
        await Supabase.initialize(
          url: 'https://db.domainanda.com',
          anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI...',
          publishableKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI...',
        );
        return Supabase.instance.client;
      } catch (e) {
        debugPrint('Supabase init fallback error: $e');
        return null;
      }
    }
  }
```

> [!TIP]
> **Rekomendasi Praktis**: Simpan `url` dan `anonKey` dalam satu file konfigurasi khusus seperti `lib/config/supabase_config.dart` agar ketika ada perubahan endpoint di masa depan, Anda cukup mengubahnya di satu tempat saja.

---

## 8. Tips Keamanan & Backup Otomatis Rutin

Agar data tidak hilang dan server tetap aman:

### A. Konfigurasi Firewall VPS (UFW)
Hanya izinkan port yang diperlukan:
```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP Nginx
sudo ufw allow 443/tcp   # HTTPS Nginx
sudo ufw enable
```
*(Port internal PostgreSQL `5432` dan Kong `8000` tetap aman di dalam server dan hanya diakses melalui Nginx proxy).*

### B. Skrip Backup Database Otomatis Harian
Buat direktori backup di VPS:
```bash
mkdir -p /root/backups
nano /root/backup_supabase.sh
```

Isi dengan skrip shell berikut:
```bash
#!/bin/bash
BACKUP_DIR="/root/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="$BACKUP_DIR/db_backup_$TIMESTAMP.sql.gz"

# Dump database dari container docker dan kompres
docker exec supabase-db pg_dump -U postgres postgres | gzip > "$FILENAME"

# Hapus backup yang lebih lama dari 14 hari
find $BACKUP_DIR -type f -name "*.sql.gz" -mtime +14 -delete

echo "Backup selesai: $FILENAME"
```

Beri izin eksekusi:
```bash
chmod +x /root/backup_supabase.sh
```

Tambahkan ke cron job agar berjalan otomatis setiap pukul 02:00 malam:
```bash
crontab -e
```
Tambahkan baris berikut di paling bawah:
```cron
0 2 * * * /root/backup_supabase.sh > /dev/null 2>&1
```

---

## Ringkasan Verifikasi

Setelah seluruh langkah di atas selesai:
1. Akses `https://db.domainanda.com/dashboard` di browser untuk memastikan Studio aktif.
2. Jalankan `npm run dev` di Next.js dan coba buat brosur atau generate kode akses.
3. Jalankan aplikasi Flutter dan pastikan daftar brosur serta pengumuman termuat sempurna.
4. Anda sekarang memiliki infrastruktur Supabase mandiri dengan **Unlimited Egress** tanpa khawatir kuota habis!
