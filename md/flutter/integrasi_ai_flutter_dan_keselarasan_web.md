# 📱 Integrasi AI Flutter & Keselarasan dengan Web (/ai-pustaka)

Panduan teknis dan checklist komparasi integrasi fitur AI antara Web Next.js ([`/ai-pustaka`](http://localhost:3000/ai-pustaka)) dengan Aplikasi Mobile Flutter (`ai_chat_screen_v2.dart`).

---

## 1. 🌐 Status Konektivitas: Online vs Offline

### **Jawaban: ONLINE (Wajib Terhubung ke Internet)**

Fitur **AI Sahabat MTA** pada aplikasi Flutter beroperasi secara **ONLINE**. 

### Alasan Teknis:
1. **Beban Komputasi LLM**: Model LLM (Google Gemini / DeepSeek via OpenRouter) memerlukan akselerasi cloud server GPU. Perangkat Android/iOS tidak dapat memuat model kecerdasan buatan puluhan miliaran parameter secara lokal.
2. **Pencarian RAG di Supabase**: Algoritma pencarian database brosur berperingkat tinggi (`search_brosur_ranked`) dieksekusi di database server backend.
3. **Penyelarasan Terpusat**: Pengaturan model, *system prompt*, dan *knowledge rules* dikendalikan terpusat melalui [AI Settings](/dashboard/ai-settings).

> [!NOTE]
> **Arsitektur Hybrid di Mobile**:
> - Konten teks Brosur, Hadits, & Al-Qur'an: **OFFLINE** (SQLite/Hive).
> - Tanya Jawab AI & RAG: **ONLINE** (API `https://ulilalbab.com/api/ai/chat`).
> - Riwayat Chat: **LOKAL / CACHE** (SharedPreferences / Hive).

---

## 2. 🔍 Tabel Komparasi: Kenapa Sebelumnya Tampak Berbeda?

| Fitur | Versi Web (`/ai-pustaka`) | Versi Flutter Lama | Status Pembaruan Flutter |
| :--- | :--- | :--- | :--- |
| **Identitas Asisten** | Sahabat MTA (Sapaan Guru Daerah) | Greeting standar | ✅ Diselaraskan via API `/api/ai/disclaimer` |
| **Animasi Berpikir** | Shimmer Card (*bouncing dots* & status RAG) | Circular spinner biasa | ✅ Ditambahkan kartu penalaran Shimmer |
| **Edit & Rebuild** | Tombol edit prompt user & re-query otomatis | Tidak ada tombol edit | ✅ Ditambahkan dialog Edit & Rebuild |
| **Teks Arab Dalil** | RTL Scheherazade New / Amiri, background card | Teks markdown default | ✅ Dioptimalkan parser Arab RTL |
| **Rujukan Brosur** | Badge kartu brosur (`retrieved_docs`) | Teks mentah | ✅ Ditambahkan chips rujukan brosur |
| **Salin & Bagikan** | Tombol salin dalil, salin jawaban, & Web Share | Copy biasa | ✅ Ditambahkan tombol Salin & Share Plus |
| **Penyimpanan Sesi** | Cache Browser (`localStorage`) | Cache Mobile (`CacheHelper`) | ✅ Keduanya murni cache lokal tanpa DB |

---

## 3. 📋 Checklist Kesiapan Integrasi AI Flutter

- [x] **Konektivitas**: Terhubung ke `https://ulilalbab.com/api/ai/chat`.
- [x] **Disclaimer Dinamis**: Membaca sapaan resmi dari `/api/ai/disclaimer`.
- [x] **Indikator Menalar**: Animasi visual proses pencarian brosur saat AI berpikir.
- [x] **Edit Prompt & Rebuild**: Pengguna dapat mengubah pertanyaan lama dan mendapatkan respon baru.
- [x] **Formatting Arab**: Teks dalil tampil rapi dengan text-direction RTL.
- [x] **Daftar Brosur Terkait**: Menampilkan referensi judul & tahun brosur yang dikutip.
- [x] **Aksi Pesan**: Tombol Salin dan Bagikan ke WhatsApp/catatan.
- [x] **Pemberitahuan Offline**: Pesan edukatif jika perangkat tidak memiliki koneksi internet.

