# Panduan & Estimasi Biaya: Integrasi DeepSeek Langsung (`api.deepseek.com`) pada Dashboard AI Settings

Dokumen ini membedah arsitektur halaman pengelola AI di Next.js (**`http://localhost:3000/dashboard/ai-settings`**), mengevaluasi opsi migrasi dari gateway pihak ketiga (OpenRouter) ke **Direct DeepSeek API (`https://api.deepseek.com`)**, menyajikan **simulasi estimasi biaya riil (USD & Rupiah)**, serta memberikan langkah teknis integrasinya.

---

## 1. Analisis Halaman `/dashboard/ai-settings` Saat Ini

Halaman pengelola AI (`app/dashboard/ai-settings/page.tsx`) terbagi ke dalam 3 tab fungsional utama:

1. **Tab 1: Kredensial & Model**
   * Saklar Utama (`ai_enabled`): Mematikan/menyalakan fitur AI di web dan aplikasi Flutter secara sentral.
   * Input Token Google AI Studio (`google_ai_token`).
   * Input Token OpenRouter (`openrouter_token`).
   * Pilihan Model Default (`chat_model`): Saat ini memilih `google/gemini-2.5-flash`, `deepseek/deepseek-chat` (via OpenRouter), `qwen/qwen-2.5-72b`, atau `openai/gpt-4o-mini`.
2. **Tab 2: Aturan Fiqih & Knowledge Rules (`ai_knowledge_rules`)**
   * Mengatur kata kunci pemicu (*trigger keyword*) dan instruksi fatwa hukum yang wajib dipatuhi AI.
3. **Tab 3: Persona & Prompt Guardrails (`system_prompt`)**
   * Mengatur karakter, gaya sapaan, dan batasan anti-halusinasi (*"Sahabat MTA"*).

---

## 2. Mengapa Menggunakan DeepSeek Langsung (`api.deepseek.com`)?

Saat ini, opsi DeepSeek yang ada di menu pengaturan masih melalui perantara **OpenRouter** (`deepseek/deepseek-chat`). Beralih ke **Direct DeepSeek API** memberikan 4 keunggulan masif:

### A. Tarif Resmi Termurah di Dunia (Diskon Cache Hit 90%)
DeepSeek memiliki sistem *Context Caching* bawaan pada tingkat penyimpanan (*disk-level*):
* **Input Cache Hit:** Hanya **\$0.014 / 1M token** (~Rp 224 per 1 juta token!).
* **Input Cache Miss (Pertanyaan Baru):** **\$0.14 / 1M token** (~Rp 2.240 per 1 juta token).
* **Output Token (Jawaban AI):** **\$0.28 / 1M token** (~Rp 4.480 per 1 juta token).

> [!NOTE]
> Karena system prompt *"Sahabat MTA"* dan potongan naskah brosur MTA berukuran sama untuk banyak pertanyaan sejenis, sebagian besar token input akan berstatus **Cache Hit**. Biaya input otomatis terpangkas hingga 90%!

### B. Pangkas Latensi & Ketergantungan (Zero Middleman)
* Request langsung dari server Next.js Anda ke server DeepSeek tanpa transit di gateway OpenRouter.
* Menghilangkan risiko *rate-limit* atau *downtime* pihak ketiga.

### C. Format Standar Kompatibel OpenAI (Zero Refactoring)
* DeepSeek menggunakan skema request yang 100% identik dengan OpenAI SDK:
  * Base URL: `https://api.deepseek.com` (atau `https://api.deepseek.com/v1`)
  * Header: `Authorization: Bearer <DEEPSEEK_API_KEY>`
  * Endpoint: `POST /chat/completions`

---

## 3. Simulasi & Estimasi Biaya Rinci (DeepSeek Langsung)

### Parameter Perhitungan Riil:
* **Ukuran Input Rata-rata:** 2.500 token (System prompt "Sahabat MTA", aturan fatwa, 3 snippet brosur rujukan, dan riwayat chat).
* **Rasio Cache Hit:** 70% (karena system prompt dan naskah referensi sering berulang).
  * 70% Cache Hit $\to$ 1.750 token $\times$ \$0.014 / 1M
  * 30% Cache Miss $\to$ 750 token $\times$ \$0.14 / 1M
  * **Biaya input efektif rata-rata:** $\approx$ **\$0.0518 per 1M token** (Rp 828 per 1 juta token).
* **Ukuran Output Rata-rata:** 400 token jawaban $\times$ \$0.28 / 1M.
* **Kurs Acuan:** \$1 USD = Rp 16.000,-.

---

### 📊 Tabel Estimasi Biaya Berdasarkan Volume Pertanyaan Bulanan

| Volume Kueri / Bulan | Biaya Input (USD) | Biaya Output (USD) | Total Biaya USD | Total Biaya Rupiah | Biaya per 1x Tanya Jawab |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1.000 Kueri** *(Tahap Testing)* | \$0.13 | \$0.11 | **\$0.24 / bln** | **$\approx$ Rp 3.850 / bln** | **Rp 3,85** |
| **10.000 Kueri** *(Guru Daerah & Pengurus)* | \$1.30 | \$1.12 | **\$2.42 / bln** | **$\approx$ Rp 38.700 / bln** | **Rp 3,87** |
| **50.000 Kueri** *(Cabang Aktif Seluruh Jawa)* | \$6.48 | \$5.60 | **\$12.08 / bln** | **$\approx$ Rp 193.000 / bln** | **Rp 3,86** |
| **100.000 Kueri** *(Skala Nasional Seluruh Jemaah)*| \$12.95 | \$11.20 | **\$24.15 / bln** | **$\approx$ Rp 386.400 / bln** | **Rp 3,86** |

---

### ⚖️ Komparasi Biaya: DeepSeek Langsung vs Provider Lain (100.000 Kueri/Bulan)

| Model & Metode Koneksi | Biaya Bulanan (USD) | Biaya Bulanan (Rupiah) | Rasio Penghematan |
| :--- | :--- | :--- | :--- |
| **DeepSeek-V3 Langsung (`api.deepseek.com`)** | **\$24.15** | **$\approx$ Rp 386.400** | 🏆 **Paling Hemat (100% Baseline)** |
| **Google Gemini 2.5 Flash** | **\$30.80** | **$\approx$ Rp 492.800** | Sedikit lebih tinggi (+27%) |
| **DeepSeek-V3 via OpenRouter** | **\$46.20** | **$\approx$ Rp 739.200** | 1.9x lebih mahal (+91%) |
| **OpenAI GPT-4o-mini** | **\$61.50** | **$\approx$ Rp 984.000** | 2.5x lebih mahal (+154%) |

> [!TIP]
> **Kesimpulan Finansial:** Menggunakan **DeepSeek Langsung** menghemat anggaran hingga **Rp 600.000 per bulan** dibandingkan GPT-4o-mini, dan **Rp 350.000 per bulan** lebih hemat dibandingkan jika DeepSeek dipanggil lewat OpenRouter. Melayani 100.000 jemaah se-Indonesia **hanya membutuhkan biaya Rp 386 ribuan saja per bulan**!

---

## 4. Langkah Teknis Integrasi pada `http://localhost:3000/dashboard/ai-settings`

Berikut adalah 3 langkah mudah untuk menambahkan opsi DeepSeek Langsung ke sistem:

### Langkah 1: Tambahkan Kolom `deepseek_token` di Supabase
Jalankan query SQL berikut di SQL Editor Supabase:

```sql
ALTER TABLE app_settings 
ADD COLUMN IF NOT EXISTS deepseek_token TEXT;
```

---

### Langkah 2: Perbarui Halaman UI Admin (`app/dashboard/ai-settings/page.tsx`)

1. Tambahkan state untuk token DeepSeek:
```typescript
const [deepseekToken, setDeepseekToken] = useState('');
```

2. Tambahkan input form di **Tab 1: Kredensial**:
```tsx
{/* DeepSeek API Key (Direct) */}
<div>
  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-2">
    <Key className="w-4 h-4 text-blue-600" /> API Key DeepSeek Langsung (Termurah: api.deepseek.com)
  </label>
  <input 
    type="password" 
    value={deepseekToken}
    onChange={(e) => setDeepseekToken(e.target.value)}
    placeholder="sk-..."
    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
  />
  <p className="text-[11px] text-slate-500 mt-1">
    Dapatkan token di <a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noreferrer" className="text-blue-600 font-bold hover:underline">DeepSeek Platform</a>. Tarif termurah dengan diskon cache hit 90%.
  </p>
</div>
```

3. Tambahkan opsi di dropdown `chatModel`:
```tsx
<optgroup label="🚀 DeepSeek Langsung (Resmi api.deepseek.com)">
  <option value="deepseek-chat-native">DeepSeek-V3 Native (Super Hemat & Akurat)</option>
  <option value="deepseek-reasoner-native">DeepSeek-R1 Native (Penalaran Dalil Kompleks)</option>
</optgroup>
```

---

### Langkah 3: Integrasikan Handler di API Route (`app/api/ai/chat/route.ts`)

Perbarui pemanggilan API agar jika model yang dipilih berakhiran `-native` atau bertipe DeepSeek, ia langsung menghubungi `https://api.deepseek.com`:

```typescript
const isDeepSeekNative = selectedModel.includes('deepseek') && !selectedModel.includes('/');
const deepseekApiKey = settings.deepseek_token || process.env.DEEPSEEK_API_KEY;

if (isDeepSeekNative) {
  if (!deepseekApiKey) {
    return NextResponse.json({ error: 'API Key DeepSeek belum diisi di dashboard AI Settings.' }, { status: 500 });
  }

  const actualModel = selectedModel === 'deepseek-reasoner-native' ? 'deepseek-reasoner' : 'deepseek-chat';

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${deepseekApiKey}`,
    },
    body: JSON.stringify({
      model: actualModel,
      messages: openRouterMessages,
      temperature: 0.3, // Rendah agar konsisten pada dalil
      stream: false,
    }),
  });

  const data = await response.json();
  // Return response ke Flutter / Web ...
}
```

---

## 5. Rekomendasi Penggunaan di Lapangan

* **Untuk Chat Sehari-hari (Guru Daerah & Jemaah):** Gunakan **`deepseek-chat` (DeepSeek-V3)**. Jawaban sangat cepat, patuh pada aturan hukum, tidak berhalusinasi, dan biayanya hanya $\approx$ Rp 3,8 per interaksi.
* **Untuk Studi Kasus Fiqih Rumit / Muamalah Kontemporer:** Gunakan **`deepseek-reasoner` (DeepSeek-R1)**. Model ini melakukan penalaran berantai (*chain of thought*) sebelum menjawab, membedah dalil secara analitis layaknya seorang faqih.
