# Analisis & Estimasi Implementasi SumoPod untuk Ekosistem Pustaka MTA

Dokumen ini menganalisis peluang, arsitektur, efisiensi biaya, serta kelayakan teknis penggunaan platform **SumoPod** (berdasarkan antarmuka layanan: *Hermes, n8n, QwenPaw, dan SumoRouter*) untuk mendukung ekosistem **Aplikasi Flutter (`pustaka`)** dan **Backend Web (`brosur-ahad-pagi`)**.

---

## 1. Bedah Layanan SumoPod yang Ditampilkan

Dari tangkapan layar antarmuka SumoPod (*Apps / Services*), terdapat 5 layanan utama dengan harga flat berbasis Rupiah:

| Nama Layanan di SumoPod | Deskripsi Layanan | Biaya Langganan | Potensi Pemanfaatan untuk Pustaka MTA |
| :--- | :--- | :--- | :--- |
| **Hermes** | *Hermes Agent from Nous Research* | Mulai **Rp 10.000 / bulan** | Agen AI mandiri untuk penalaran fiqih berbasis model open-weights Nous-Hermes. |
| **n8n** | *Automation using n8n* | Mulai **Rp 10.000 / bulan** | 🌟 **Sangat Direkomendasikan:** Otomatisasi notifikasi kajian, sinkronisasi brosur, dan broadcast warta jemaah. |
| **n8n (ffmpeg included)** | *n8n with ffmpeg installed* | Mulai **Rp 30.000 / bulan** | 🌟 **Inovasi Audio Dakwah:** Otomatisasi konversi rekaman audio MP3 kajian Ahad Pagi $\to$ transkripsi teks $\to$ naskah brosur. |
| **QwenPaw by Sumopod** | *Custom OpenClaw Alternative with GUI from Alibaba & Sumopod AI* | Mulai **Rp 20.000 / bulan** | Agen pencarian dan ekstraksi dokumen brosur PDF berbasis model cerdas Alibaba Qwen. |
| **SumoRouter** | *Self Hosted OpenRouter Alternative to Sell / Manage Your AI Token* | Mulai **Rp 99.000 / bulan** | 🌟 **Infrastruktur Kunci:** Gateway AI router mandiri milik MTA untuk membagi beban token, mengontrol kuota, dan memutus ketergantungan pihak ketiga. |

---

## 2. Analisis Kritis: Realitas Teknis & Ekspektasi Kinerja

Biaya yang ditawarkan SumoPod sangat terjangkau (**Rp 10.000 s/d Rp 99.000 per bulan**). Namun, tim teknis perlu memahami bagaimana layanan ini bekerja di balik layar:

### A. Layanan Model (Hermes & QwenPaw)
* **Realitas Hardware:** Model AI kelas 70B parameter (seperti Hermes 3 70B atau Qwen 2.5 72B) membutuhkan GPU VRAM minimal 40GB–80GB (biaya sewa GPU cloud umumnya Rp 5.000–Rp 15.000 per JAM).
* **Artinya:** Dengan biaya Rp 10.000–Rp 20.000 per BULAN di SumoPod, pod ini kemungkinan besar menjalankan:
  1. **Model Versi Kompak / Quantized (8B Parameter):** Sangat ringan dan cepat, cocok untuk tugas klasifikasi atau pencarian sederhana, namun daya nalar fiqih kompleksnya tidak sekuat model 70B.
  2. **Agent Interface (BYOK - Bring Your Own Key):** Pod bertindak sebagai *orchestrator / agent server* mandiri yang tetap membutuhkan API Key (DeepSeek / Gemini) untuk pemrosesan teks besarnya.

### B. Layanan Otomatisasi (n8n & n8n ffmpeg)
* **Kualitas & Kelayakan:** ⭐⭐⭐⭐⭐ (Bintang 5 - Sangat Layak!).
* n8n adalah aplikasi berbasis Node.js yang sangat hemat resource RAM/CPU. Menjalankannya di pod seharga Rp 10.000 s/d Rp 30.000/bulan adalah **efisiensi biaya yang luar biasa** dibandingkan menyewa VPS sendiri seharga \$5–\$10/bulan (Rp 80.000–Rp 160.000).

### C. Layanan Gateway (SumoRouter)
* **Kualitas & Kelayakan:** ⭐⭐⭐⭐⭐ (Bintang 5 - Nilai Strategis Tertinggi).
* SumoRouter bertindak sebagai proxy lokal milik MTA yang menggantikan OpenRouter publik.

---

## 3. Desain Arsitektur Rekomendasi: Ekosistem Mandiri Pustaka MTA

Jika Anda memutuskan menggunakan SumoPod, berikut adalah arsitektur kombinasi terbaik:

```
                          [ JEMAAH & GURU DAERAH ]
                           (Aplikasi Mobile Flutter)
                                      │
                                      ▼
                        [ BACKEND WEB: NEXT.JS ]
                        (https://www.ulilalbab.fun)
                                      │
                 ┌────────────────────┴────────────────────┐
                 │                                         │
                 ▼                                         ▼
     ┌───────────────────────┐                 ┌───────────────────────┐
     │  SUMOPOD: SumoRouter  │                 │     SUMOPOD: n8n      │
     │   (Rp 99.000/bulan)   │                 │   (Rp 10.000/bulan)   │
     │                       │                 │                       │
     │ • Routing Kueri AI    │                 │ • Auto Sync Brosur    │
     │ • Batasi Kuota Token  │                 │ • Push Notifikasi FCM │
     │ • Multi-Provider Key  │                 │ • Pengingat Kajian    │
     └───────────┬───────────┘                 └───────────┬───────────┘
                 │                                         │
        ┌────────┴────────┐                                │
        ▼                 ▼                                ▼
┌──────────────┐   ┌──────────────┐                 ┌──────────────┐
│   DEEPSEEK   │   │GOOGLE GEMINI │                 │   FIREBASE   │
│ Direct (V3)  │   │  2.5 Flash   │                 │   MESSAGING  │
└──────────────┘   └──────────────┘                 └──────────────┘
```

### 1. Peran SumoRouter (Rp 99.000 / bulan):
* Alih-alih Next.js menghubungi `https://openrouter.ai`, Next.js menghubungi endpoint internal SumoRouter Anda (`http://sumorouter.sumopod.internal` atau domain privat).
* **Fungsi Utama:**
  * Membagi beban kueri (*load-balancing*): Pertanyaan santai diarahkan ke Gemini Flash (gratis/sangat murah), pertanyaan fiqih rumit diarahkan ke DeepSeek.
  * Memproteksi API Key: Pengurus MTA dapat mengatur batas pagu anggaran bulanan (*hard budget limit*) langsung dari router.

### 2. Peran n8n + ffmpeg (Rp 30.000 / bulan):
* **Jadwal Pengajian Otomatis:** Setiap Jumat sore, n8n otomatis memeriksa jadwal kajian Ahad Pagi dan mengirim notifikasi *Push Notification* ke ribuan pengguna Flutter.
* **Transkripsi Kajian Ahad Pagi:** Rekaman suara MP3 dari Radio/TV MTA dimasukkan ke folder, n8n memprosesnya dengan Whisper AI, dan menghasilkan draft naskah kajian otomatis untuk dimasukkan ke database Pustaka.

---

## 4. Simulasi Estimasi Total Biaya Bulanan (Full Setup)

| Komponen Infrastruktur | Provider | Biaya Bulanan | Keterangan |
| :--- | :--- | :--- | :--- |
| **SumoRouter (AI Gateway Mandiri)** | SumoPod | Rp 99.000 | Kontrol router token & multi-provider |
| **n8n with ffmpeg (Otomasi Dakwah)** | SumoPod | Rp 30.000 | Auto sync brosur, push notifikasi & audio |
| **Token AI DeepSeek-V3 (10.000 kueri)**| DeepSeek Direct | $\approx$ Rp 38.700 | Tanya jawab cerdas anti-halusinasi |
| **Database Supabase (Free/Pro)** | Supabase | Rp 0 / Rp 400.000 | Penyimpanan naskah brosur & SQLite sync |
| **Hosting Web Next.js** | Vercel / Cloudflare | Rp 0 (Free Tier) | Server API & dashboard admin web |
| **TOTAL BIAYA INFRASTRUKTUR** | — | **$\approx$ Rp 167.700 / bulan** | **Sangat Murah untuk Skala Lembaga!** |

---

## 5. Kelebihan & Catatan Pertimbangan

### ✅ Keuntungan Utama:
1. **Biaya Flat dalam Rupiah:** Tidak dipusingkan oleh fluktuasi kurs Dollar USD atau tagihan kartu kredit yang melonjak tanpa terkontrol.
2. **Otomatisasi Tanpa Batas dengan n8n:** Menghubungkan database brosur, Google Calendar kajian, push notifikasi FCM, dan Telegram bot pengurus secara otomatis tanpa perlu coding server baru.
3. **Kepemilikan Penuh (Sovereignty):** Data kueri jemaah dan pembagian kuota dikelola di pod sendiri melalui SumoRouter.

### ⚠️ Catatan yang Perlu Diperhatikan:
* **Uptime Pod:** Pastikan memilih pod SumoPod yang memiliki fitur *auto-restart* agar jika pod mengalami *out of memory (OOM)*, sistem dapat hidup kembali secara otomatis.
* **Backup Berkala:** Untuk n8n, pastikan workflow JSON diekspor dan dicadangkan secara berkala ke GitHub agar tidak hilang jika container di-redeploy.

---

## 6. Rekomendasi Langkah Eksekusi

1. **Deploy n8n (Rp 10.000 - Rp 30.000):** Langkah paling cepat dan bernilai tinggi. Gunakan untuk mengotomatiskan broadcast jadwal kajian dan pengingat pertemuan Ahad Pagi ke aplikasi Flutter.
2. **Deploy SumoRouter (Rp 99.000):** Jika Anda ingin memutus ketergantungan pada OpenRouter dan mengelola saldo token AI secara privat di lingkungan sendiri.
3. **Uji Coba Hermes (Rp 10.000):** Uji coba performa Hermes di pod untuk melihat apakah pod tersebut mampu menangani kueri fiqih atau apakah performanya cocok sebagai agen riset internal pengurus.
