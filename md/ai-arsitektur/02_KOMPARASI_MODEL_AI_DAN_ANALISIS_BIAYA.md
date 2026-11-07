# 02 - Komparasi Model AI & Analisis Biaya

Dokumen ini membandingkan berbagai model AI mutakhir (Large Language Models) yang kompatibel dengan OpenRouter dan API langsung, ditinjau dari kualitas bahasa Arab/Fiqih Islam, kecepatan respons, dan efisiensi biaya.

---

## 1. Tabel Komparasi Model Unggulan (2025/2026)

| Nama Model | Provider Utama | Harga Input (per 1M token) | Harga Output (per 1M token) | Context Window | Skor Bahasa Arab & Dalil | Latensi Rata-rata | Kesimpulan Rekomendasi |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Google Gemini 2.5 Flash** | Google Vertex / OpenRouter | **\$0.075** | **\$0.30** | 1.000.000 | ⭐⭐⭐⭐⭐ (Sangat Baik) | ⚡⚡⚡⚡⚡ (< 1.2s) | **Pilihan Utama (Default)**: Termurah, tercepat, konteks luas. |
| **DeepSeek-V3** | DeepSeek / OpenRouter | **\$0.14** | **\$0.28** | 64.000 | ⭐⭐⭐⭐⭐ (Sangat Teliti) | ⚡⚡⚡⚡ (~ 1.5s) | **Pilihan Kedua (Kualitas Tertinggi)**: Penalaran dalil sangat akurat & anti-halusinasi. |
| **Qwen 2.5 72B Instruct** | Alibaba Cloud / OpenRouter | **\$0.35** | **\$0.40** | 128.000 | ⭐⭐⭐⭐⭐ (Sangat Kuat) | ⚡⚡⚡ (~ 2.0s) | **Sangat Baik**: Sangat fasih tata bahasa Arab klasik/hadits. |
| **Hermes 3 (Llama 3.1 70B)** | Nous Research / OpenRouter | **\$0.40** | **\$0.40** | 128.000 | ⭐⭐⭐⭐ (Baik) | ⚡⚡⚡ (~ 2.2s) | **Alternatif Mandiri**: Penulisan kreatif dan kepatuhan instruksi ketat. |
| **GPT-4o-mini** | OpenAI / OpenRouter | **\$0.15** | **\$0.60** | 128.000 | ⭐⭐⭐⭐ (Baik) | ⚡⚡⚡⚡ (~ 1.6s) | **Standar Industri**: Andal, namun harga output 2x lipat dibanding Gemini Flash. |

---

## 2. Analisis Karakteristik untuk Kasus Pustaka MTA

### A. Google Gemini 2.5 Flash (Sangat Direkomendasikan untuk Produksi Skala Luas)
* **Keunggulan:**
  * Biaya input hanya **\$0.075 / 1M token** (~Rp 1.200 per 1 juta token!).
  * Jendela konteks mencapai **1 juta token**. Hal ini memungkinkan kita mengirimkan hingga 10-15 naskah brosur lengkap sekaligus ke dalam konteks tanpa khawatir kehabisan kuota token.
  * Memiliki fitur bawaan **Context Caching**: Jika system prompt "Sahabat MTA" dan aturan Fiqih berukuran besar, biaya input prompt berulang didiskon hingga **75%**!
* **Catatan:** Format teks Arab sangat rapi, pemisahan baris dan tanda baca terjaga dengan baik.

### B. DeepSeek-V3 (Pilihan Terbaik untuk Pertanyaan Fiqih Rumit)
* **Keunggulan:**
  * Memiliki arsitektur MoE (Mixture-of-Experts) 671B parameter aktif 37B.
  * Sangat patuh pada batasan *Anti-Inference* (tidak mudah melompat ke kesimpulan sendiri jika dalil tidak menyebutkan secara eksplisit).
  * Harga sangat terjangkau (\$0.14 input / \$0.28 output).

### C. Qwen 2.5 72B (Juara Pemahaman Sastra Arab & Hadits)
* **Keunggulan:**
  * Model open-weights terbaik asal Asia yang dilatih pada korpus multibahasa yang masif, termasuk ribuan literatur klasik Islam dan teks Arab gundul/berharakat.
  * Sangat cocok jika aplikasi ingin menambahkan fitur penjelas makna kosa kata Arab per kata (*I'rab* atau *Syarah Hadits*).

---

## 3. Simulasi Estimasi Biaya Bulanan

Berikut adalah estimasi biaya nyata dengan asumsi:
* Rata-rata ukuran input (System prompt + 3 potongan brosur + riwayat chat): **2.500 token** per interaksi.
* Rata-rata ukuran jawaban AI: **400 token** per interaksi.
* Kurs: \$1 USD = Rp 16.000,-.

### Skenario A: 10.000 Pertanyaan per Bulan (Tahap Awal / Guru Daerah)
| Model | Biaya Input | Biaya Output | Total Biaya USD | Total Biaya Rupiah |
| :--- | :--- | :--- | :--- | :--- |
| **Gemini 2.5 Flash** | \$0.075 $\times$ 25 = \$1.88 | \$0.30 $\times$ 4 = \$1.20 | **\$3.08 / bln** | **$\approx$ Rp 49.000 / bln** |
| **DeepSeek-V3** | \$0.14 $\times$ 25 = \$3.50 | \$0.28 $\times$ 4 = \$1.12 | **\$4.62 / bln** | **$\approx$ Rp 74.000 / bln** |
| **Qwen 2.5 72B** | \$0.35 $\times$ 25 = \$8.75 | \$0.40 $\times$ 4 = \$1.60 | **\$10.35 / bln** | **$\approx$ Rp 165.000 / bln** |
| **GPT-4o-mini** | \$0.15 $\times$ 25 = \$3.75 | \$0.60 $\times$ 4 = \$2.40 | **\$6.15 / bln** | **$\approx$ Rp 98.000 / bln** |

### Skenario B: 100.000 Pertanyaan per Bulan (Skala Nasional Jemaah Luas)
| Model | Biaya Total USD | Total Biaya Rupiah | Biaya per Jawaban |
| :--- | :--- | :--- | :--- |
| **Gemini 2.5 Flash** | **\$30.80 / bln** | **$\approx$ Rp 492.000 / bln** | **Rp 4,92 / interaksi** |
| **DeepSeek-V3** | **\$46.20 / bln** | **$\approx$ Rp 739.000 / bln** | **Rp 7,39 / interaksi** |
| **Qwen 2.5 72B** | **\$103.50 / bln** | **$\approx$ Rp 1.656.000 / bln** | **Rp 16,56 / interaksi** |
| **GPT-4o-mini** | **\$61.50 / bln** | **$\approx$ Rp 984.000 / bln** | **Rp 9,84 / interaksi** |

> [!NOTE]
> **Kesimpulan Biaya:** Dengan memilih **Google Gemini 2.5 Flash** atau **DeepSeek-V3**, biaya operasional bulanan untuk melayani **100.000 pertanyaan jemaah se-Indonesia hanya berkisar antara Rp 490.000 s/d Rp 740.000 per bulan** — sangat hemat dan sangat terjangkau untuk operasional dakwah.
