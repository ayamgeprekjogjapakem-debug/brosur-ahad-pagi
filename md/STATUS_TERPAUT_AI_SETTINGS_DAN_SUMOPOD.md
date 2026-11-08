# Status Keterpautan: `/dashboard/ai-settings` dengan AI Agent & SumoPod

Dokumen ini menjawab dan membedah status teknis: **Apakah halaman `http://localhost:3000/dashboard/ai-settings` sudah terpaut dengan AI Agent (di Web & Flutter) dan apakah sudah terpaut dengan SumoPod / SumoRouter / DeepSeek?**

---

## 1. Jawaban Langsung (Status Keterpautan)

### A. Keterpautan dengan AI Agent (Web Simulator & Flutter) $\to$ ✅ **SUDAH TERPAUT**
Semua AI Agent yang ada di ekosistem Anda:
1. **AI Playground Simulator** di web (`/dashboard/ai-simulator`)
2. **AI Chat Flutter Mobile** ([`lib/screens_v2/ai_chat_screen_v2.dart`](file:///Users/rifqiwariyanto/Documents/GitHub/FLUTTER/pustaka/lib/screens_v2/ai_chat_screen_v2.dart))

Keduanya **sudah 100% terpaut** ke halaman `http://localhost:3000/dashboard/ai-settings` melalui satu pintu gerbang yang sama: **`POST /api/ai/chat`** yang membaca tabel `app_settings` dan `ai_knowledge_rules` di Supabase.

---

### B. Keterpautan dengan SumoPod / SumoRouter / Direct DeepSeek $\to$ ⚠️ **BELUM TERPASANG DI FORM (Perlu Ditambahkan Field-nya)**
Saat ini, di halaman `/dashboard/ai-settings` Tab 1 (Kredensial & Model), pilihan yang tersedia baru:
* Input **Google AI Studio Key**
* Input **OpenRouter API Key**
* Pilihan Model: Gemini, DeepSeek (via OpenRouter), Qwen (via OpenRouter), dan GPT-4o-mini.

Belum ada kolom input untuk:
* **Custom Base URL / SumoRouter Endpoint** (misal: `https://sumorouter.sumopod.id/v1`)
* **Direct DeepSeek API Key** (`api.deepseek.com`)

---

## 2. Peta Arsitektur Keterpautan Saat Ini (Realita Kode)

```
┌────────────────────────────────────────────────────────┐
│        DASHBOARD ADMIN: `/dashboard/ai-settings`       │
│  Tab 1: Kredensial (Token OpenRouter, Google AI)       │
│  Tab 2: Aturan Fiqih (ai_knowledge_rules)              │
│  Tab 3: Persona Guardrails (Sahabat MTA)               │
└───────────────────────────┬────────────────────────────┘
                            │ Simpan ke Supabase (app_settings)
                            ▼
┌────────────────────────────────────────────────────────┐
│                   DATABASE SUPABASE                    │
│   Tabel: `app_settings` (id=1) & `ai_knowledge_rules`  │
└───────────────────────────▲────────────────────────────┘
                            │ Dibaca real-time
                            │
┌───────────────────────────┴────────────────────────────┐
│           BACKEND ORCHESTRATOR (`/api/ai/chat`)        │
│   Mengeksekusi RAG Brosur + Prompt + Panggil LLM       │
└───────────────────────▲────────────────────────▲───────┘
                        │                        │
       Dipanggil oleh   │                        │  Dipanggil oleh
                        │                        │
┌───────────────────────┴──────┐   ┌─────────────┴───────┐
│     AI AGENT WEB SIMULATOR   │   │   AI AGENT FLUTTER  │
│  `/dashboard/ai-simulator`   │   │ `ai_chat_screen_v2` │
└──────────────────────────────┘   └─────────────────────┘
```

### Bukti Kode Sumber Keterpautan:
1. **Di AI Simulator (`app/dashboard/ai-simulator/page.tsx` baris 466):**
   ```typescript
   const res = await fetch('/api/ai/chat', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ messages: newMessages, wordCount: 500 }),
   });
   ```
2. **Di AI Chat Flutter ([`ai_chat_screen_v2.dart`](file:///Users/rifqiwariyanto/Documents/GitHub/FLUTTER/pustaka/lib/screens_v2/ai_chat_screen_v2.dart) baris 180):**
   ```dart
   final response = await http.post(
     Uri.parse('$baseUrl/api/ai/chat'),
     headers: {'Content-Type': 'application/json'},
     body: jsonEncode({ 'messages': _messages, 'wordCount': _wordCount }),
   );
   ```
3. **Di Backend (`app/api/ai/chat/route.ts` baris 16-39):**
   ```typescript
   // 1. Membaca pengaturan yang diset di /dashboard/ai-settings
   const { data: settings } = await supabase.from('app_settings').select('*').eq('id', 1).single();

   // 2. Membaca aturan fiqih yang ditambah di Tab 2
   const { data: rawRules } = await supabase.from('ai_knowledge_rules').select('*').eq('is_active', true);
   ```

---

## 3. Apa yang Terjadi Jika Anda Mengubah Pengaturan di `/dashboard/ai-settings` Sekarang?

| Tindakan Anda di `/dashboard/ai-settings` | Efek ke Web Simulator (`/ai-simulator`) | Efek ke Flutter (`ai_chat_screen_v2`) |
| :--- | :--- | :--- |
| **Mematikan Saklar Utama AI (OFF)** | ✅ Seketika menolak chat dengan pesan *"Fitur AI dinonaktifkan"* | ✅ Seketika menolak chat dengan pesan error server |
| **Menambah Aturan Fiqih Baru di Tab 2** | ✅ Seketika dipatuhi oleh AI di percakapan berikutnya | ✅ Seketika dipatuhi oleh AI di aplikasi Flutter |
| **Mengganti Token OpenRouter** | ✅ Seketika digunakan untuk request baru | ✅ Seketika digunakan untuk request baru |
| **Mengganti Model ke Gemini Flash** | ✅ Web simulator memakai Gemini Flash | ⚠️ Tergantung kiriman Flutter (sebelumnya ter-override gpt-4o-mini) |

---

## 4. Cara Menautkan SumoPod / SumoRouter ke `/dashboard/ai-settings`

Jika Anda telah menyewa **SumoRouter (Rp 99.000/bln)** atau **Hermes (Rp 10.000/bln)** di SumoPod:

### Langkah A: Tambahkan Kolom `custom_ai_base_url` di Supabase
Di SQL Editor Supabase, jalankan:
```sql
ALTER TABLE app_settings 
ADD COLUMN IF NOT EXISTS custom_ai_base_url TEXT DEFAULT 'https://openrouter.ai/api/v1',
ADD COLUMN IF NOT EXISTS deepseek_token TEXT;
```

---

### Langkah B: Tambahkan Input Form di `/dashboard/ai-settings` (`page.tsx`)
Di Tab 1 (Kredensial & Model), tambahkan input untuk SumoRouter / Custom Endpoint:

```tsx
{/* Provider Gateway / Custom Router */}
<div>
  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-2">
    <Globe className="w-4 h-4 text-emerald-600" /> AI Gateway / Base URL (SumoRouter / OpenRouter)
  </label>
  <input 
    type="text" 
    value={customAiBaseUrl}
    onChange={(e) => setCustomAiBaseUrl(e.target.value)}
    placeholder="https://openrouter.ai/api/v1 (atau URL SumoRouter Anda)"
    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-800"
  />
  <p className="text-[11px] text-slate-500 mt-1">
    Gunakan default <code>https://openrouter.ai/api/v1</code>, atau masukkan URL SumoRouter Pod Anda (misal: <code>http://sumorouter.sumopod.id/v1</code>).
  </p>
</div>
```

---

### Langkah C: Hubungkan di Endpoint `/api/ai/chat/route.ts`
Ubah URL pemanggilan dari hardcode `https://openrouter.ai/api/v1/chat/completions` menjadi dinamis:

```typescript
const targetBaseUrl = settings.custom_ai_base_url || 'https://openrouter.ai/api/v1';

const response = await fetch(`${targetBaseUrl}/chat/completions`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${openRouterKey}`,
  },
  body: JSON.stringify({
    model: selectedModel,
    messages: openRouterMessages,
    temperature: 0.7,
  }),
});
```

Begitu 3 langkah ini diaktifkan, **seluruh kueri dari AI Simulator Web dan Flutter otomatis dialihkan melewati SumoRouter / SumoPod milik Anda sendiri!**

---

## 5. Kesimpulan

1. **AI Agent yang ada sekarang (di Web & Flutter) SUDAH TERPAUT** ke `http://localhost:3000/dashboard/ai-settings`. Semua saklar on/off, kunci API, dan aturan fatwa di Tab 2 sudah mengendalikan kedua AI Agent tersebut.
2. **Untuk SumoPod / SumoRouter**, jalurnya tinggal menambahkan input **Base URL** di Tab 1 halaman pengaturan tersebut agar endpoint-nya berpindah dari OpenRouter publik ke pod SumoPod privat Anda.
