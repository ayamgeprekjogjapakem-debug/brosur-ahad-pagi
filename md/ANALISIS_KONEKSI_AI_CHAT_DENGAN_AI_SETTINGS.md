# Analisis Konektivitas: `ai_chat_screen_v2.dart` (Flutter) $\leftrightarrow$ `/dashboard/ai-settings` (Next.js)

Dokumen ini menganalisis secara detail apakah layar chat AI di aplikasi mobile Flutter ([`lib/screens_v2/ai_chat_screen_v2.dart`](file:///Users/rifqiwariyanto/Documents/GitHub/FLUTTER/pustaka/lib/screens_v2/ai_chat_screen_v2.dart)) sudah terkoneksi dengan halaman pengaturan admin web di Next.js (`http://localhost:3000/dashboard/ai-settings` atau `https://www.ulilalbab.fun/dashboard/ai-settings`), bagaimana alur datanya bekerja, apa yang sudah sinkron, serta apa yang masih menjadi celah (*discrepancy*).

---

## 1. Ringkasan Jawaban Singkat (TL;DR)

> **Apakah keduanya terkoneksi?**  
> **YA, secara arsitektur database keduanya TERKONEKSI melalui Supabase.**  
> Namun, ditemukan **3 celah teknis (bug override & bypass)** yang menyebabkan sebagian perubahan di halaman `/dashboard/ai-settings` (seperti pilihan Model dan System Prompt Kustom) belum berpengaruh penuh pada obrolan di aplikasi Flutter.

---

## 2. Diagram Alur Konektivitas

```
┌────────────────────────────────────────┐
│     WEB DASHBOARD ADMIN (Next.js)      │
│  http://localhost:3000/dashboard/      │
│            ai-settings                 │
└───────────────────┬────────────────────┘
                    │ Admin klik "Simpan Pengaturan"
                    ▼
┌────────────────────────────────────────────────────────┐
│                  DATABASE SUPABASE                     │
│  ├── Tabel `app_settings` (id=1):                      │
│  │     - ai_enabled (boolean)                          │
│  │     - openrouter_token (text)                       │
│  │     - chat_model (text: gemini / deepseek / qwen)   │
│  │     - system_prompt (text kustom persona)           │
│  └── Tabel `ai_knowledge_rules`:                       │
│        - Aturan fatwa hukum & kata kunci filter        │
└───────────────────▲────────────────────────────────────┘
                    │
                    │ Dibaca secara real-time saat ada pesan masuk
                    ▼
┌────────────────────────────────────────────────────────┐
│             BACKEND API ROUTE (Next.js)                │
│             `app/api/ai/chat/route.ts`                 │
│             (Host: www.ulilalbab.fun)                  │
└───────────────────▲────────────────────────────────────┘
                    │
                    │ HTTP POST /api/ai/chat
                    │ Payload: { messages, wordCount, model }
                    │
┌───────────────────┴────────────────────────────────────┐
│              APLIKASI MOBILE (Flutter)                 │
│      `lib/screens_v2/ai_chat_screen_v2.dart`           │
└────────────────────────────────────────────────────────┘
```

---

## 3. Matriks Status Komponen: Apa yang Terhubung vs Belum Terhubung

| Komponen di `/dashboard/ai-settings` | Tersimpan di Database | Dibaca oleh API Chat | Berefek ke Flutter Chat | Status Konektivitas |
| :--- | :--- | :--- | :--- | :--- |
| **Saklar Utama AI (On / Off)** | `app_settings.ai_enabled` | `app/api/ai/chat/route.ts` baris 22 | ✅ Langsung memblokir chat jika OFF | 🟢 **100% Terhubung** |
| **API Key OpenRouter** | `app_settings.openrouter_token` | `app/api/ai/chat/route.ts` baris 26 | ✅ Digunakan untuk inferensi LLM | 🟢 **100% Terhubung** |
| **Aturan Pengetahuan (AI Rules)** | `ai_knowledge_rules` | `app/api/ai/chat/route.ts` baris 35 | ✅ Disuntikkan otomatis ke prompt | 🟢 **100% Terhubung** |
| **Pilihan Model (Gemini / DeepSeek)** | `app_settings.chat_model` | `app/api/ai/chat/route.ts` baris 32 | ❌ Tertimpa oleh hardcode Flutter | 🔴 **Belum Sinkron (Bug Override)** |
| **Persona / System Prompt Kustom** | `app_settings.system_prompt`| `app/api/ai/chat/route.ts` | ❌ Diabaikan oleh Next.js (Hardcoded) | 🔴 **Belum Sinkron (Bug Bypass)** |
| **Target URL Server (Localhost vs Prod)**| Local vs Cloud | Tergantung domain panggilan | ⚠️ Flutter memanggil ulilalbab.fun | 🟡 **Perlu Perhatian Domain** |

---

## 4. Bedah 3 Celah Teknis & Penyebabnya

### ⚠️ Celah 1: Pilihan Model di Web Tertimpa oleh Kiriman Flutter
* **Fakta di Web Dashboard:** Admin memilih `chatModel`: misal `'google/gemini-2.5-flash'` atau `'deepseek/deepseek-chat'` di `/dashboard/ai-settings`. Nilai ini tersimpan di `app_settings.chat_model`.
* **Fakta di Flutter:** Di [`lib/screens_v2/ai_chat_screen_v2.dart`](file:///Users/rifqiwariyanto/Documents/GitHub/FLUTTER/pustaka/lib/screens_v2/ai_chat_screen_v2.dart) baris 187, aplikasi mengirim:
  ```dart
  'model': CacheHelper.getChatModel(), // Mengembalikan 'openai/gpt-4o-mini' secara hardcoded!
  ```
* **Fakta di Next.js Backend:** Di `app/api/ai/chat/route.ts` baris 32:
  ```typescript
  const selectedModel = model || settings.chat_model || 'google/gemini-2.5-flash';
  ```
  Karena parameter `model` dari Flutter selalu ada dan berisi `'openai/gpt-4o-mini'`, Next.js **selalu memakai GPT-4o-mini** dan **mengabaikan model yang dipilih admin di dashboard web!**

### ⚠️ Celah 2: Tab Persona (System Prompt) di Web Tidak Pernah Dipakai
* **Fakta di Web Dashboard:** Di tab ke-3 (`?tab=persona`), admin dapat merumuskan instruksi khusus di kolom *System Prompt*. Nilai ini tersimpan di `app_settings.system_prompt`.
* **Fakta di Next.js Backend:** Di `app/api/ai/chat/route.ts` baris 137, server membuat konstanta:
  ```typescript
  const finalSystemPrompt = `Anda adalah "Sahabat MTA", asisten AI yang membantu Guru Daerah...`;
  ```
  Server **tidak pernah menggabungkan atau membaca `settings.system_prompt`** ke dalam `finalSystemPrompt`. Akibatnya, instruksi tambahan yang diketik admin di web dashboard tidak pernah sampai ke AI.

### ⚠️ Celah 3: Lingkungan Domain (`localhost:3000` vs `www.ulilalbab.fun`)
* Di Flutter [`ai_chat_screen_v2.dart`](file:///Users/rifqiwariyanto/Documents/GitHub/FLUTTER/pustaka/lib/screens_v2/ai_chat_screen_v2.dart) baris 179:
  ```dart
  final String baseUrl = 'https://www.ulilalbab.fun';
  ```
* Jika Anda mengedit pengaturan di `http://localhost:3000/dashboard/ai-settings`:
  * **Kasus A (Satu Database):** Jika file `.env.local` di Next.js lokal Anda mengarah ke URL Supabase produksi yang sama dengan `ulilalbab.fun`, maka perubahan saklar AI dan token di localhost **akan langsung terasa** di aplikasi Flutter.
  * **Kasus B (Database Berbeda):** Jika localhost Anda menggunakan project Supabase lokal/terpisah, maka perubahan di localhost **tidak akan berpengaruh** ke Flutter sampai Anda mengubahnya di dashboard production (`https://www.ulilalbab.fun/dashboard/ai-settings`).

---

## 5. Langkah Perbaikan Konkret (Solusi Sempurna)

Agar aplikasi Flutter dan `/dashboard/ai-settings` tersinkronisasi 100%, berikut 2 langkah perbaikan sederhana:

### Solusi 1: Perbaiki Next.js (`app/api/ai/chat/route.ts`)
Ubah baris 32 agar memprioritaskan pengaturan server database, dan gabungkan `system_prompt` kustom dari admin:

```typescript
// 1. Prioritaskan model dari settings Supabase dashboard (bukan kiriman kaku dari HP)
const selectedModel = settings.chat_model || model || 'google/gemini-2.5-flash';

// 2. Suntikkan instruksi persona tambahan dari admin jika ada
const customPersona = settings.system_prompt ? `\n\nINSTRUKSI KHUSUS PENGELOLA:\n${settings.system_prompt}` : '';

const finalSystemPrompt = `Anda adalah "Sahabat MTA"...
...
${customPersona}
...
`;
```

### Solusi 2: Perbaiki Flutter (`lib/utils/cache_helper.dart`)
Ubah `getChatModel()` agar mengembalikan `null` atau `auto` secara default, sehingga aplikasi menyerahkan keputusan model kepada server:

```dart
static String? getChatModel() {
  return null; // Mengikuti konfigurasi dinamis di dashboard admin Next.js
}
```

---

## 6. Kesimpulan

1. **Apakah sudah terhubung?**  
   **Ya, urat nadinya (Database Supabase) sudah terhubung.** Saklar AI on/off, kunci API, dan aturan fatwa di tabel `ai_knowledge_rules` langsung mengalir ke Flutter.
2. **Apa yang perlu dirapikan?**  
   Lepas penimpaan model di Flutter dan integrasikan `system_prompt` di Next.js agar admin memiliki **kendali penuh 100% dari web dashboard tanpa perlu menyentuh kode Flutter lagi**.
