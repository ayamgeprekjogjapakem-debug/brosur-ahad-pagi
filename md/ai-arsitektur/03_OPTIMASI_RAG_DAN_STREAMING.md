# 03 - Optimasi RAG & Streaming (Next.js & Flutter)

Dokumen ini menjelaskan strategi teknis untuk meningkatkan kecepatan (latency), akurasi pencarian potongan teks brosur, dan pengalaman pengguna interaktif menggunakan **Streaming Server-Sent Events (SSE)**.

---

## 1. Peningkatan Kualitas Pencarian RAG (Retrieval-Augmented Generation)

Saat ini, Next.js menggunakan PostgreSQL Stored Procedure `search_brosur_ranked` yang berbasis Full-Text Search (`tsvector`). Untuk hasil yang lebih presisi, kita dapat menerapkan pendekatan **Hybrid Search**.

```
                           [ Pertanyaan Pengguna ]
                                     │
                 ┌───────────────────┴───────────────────┐
                 ▼                                       ▼
        [ Keyword Extraction ]                   [ Vector Embedding ]
    ("hukum potong kuku haid")              (text-embedding-3-small / BGE)
                 │                                       │
                 ▼                                       ▼
        [ Full-Text Search ]                    [ Semantic Vector Search ]
        (Kecocokan Kata Baku)                   (Pencarian Makna Serupa)
                 │                                       │
                 └───────────────────┬───────────────────┘
                                     ▼
                    [ Reciprocal Rank Fusion (RRF) ]
                       Kombinasi Skor Relevansi
                                     ▼
                     [ Top 3 Snippet Brosur Terpilih ]
```

### Mengapa Hybrid Search Lebih Unggul?
1. **Keyword Search (FTS):** Sangat unggul ketika pengguna mencari nomor hadits, nama kitab perawi (*"Al-Hakim"*, *"Thabrani"*), atau istilah spesifik (*"wudhu"*, *"tayamum"*).
2. **Vector Search (Embeddings):** Sangat unggul saat pengguna bertanya dengan bahasa percakapan sehari-hari yang kata-katanya tidak muncul di teks brosur (misal: *"kalo istri ditalak waktu lagi emosi sah gak ya?"* $\to$ relevan dengan brosur bertema *"Thalaq dalam Keadaan Marah"*).

---

## 2. Upgrade ke Streaming Response (Server-Sent Events - SSE)

Saat ini, komunikasi antara Flutter dan Next.js bersifat **blocking**:
1. Pengguna mengetik pertanyaan.
2. Flutter menampilkan loader berputar selama 3-8 detik.
3. Seluruh teks jawaban diterima sekaligus dalam satu paket JSON besar.

### Keuntungan Beralih ke Streaming SSE:
* **Time-to-First-Token (TTFT) di bawah 800 ms:** Pengguna melihat teks mulai diketik secara instan di layar HP, menghilangkan kesan "aplikasi sedang macet".
* **Interaktivitas Alami:** Pengalaman mirip ChatGPT / Gemini / Claude resmi.

### A. Implementasi di Next.js (`app/api/ai/chat/route.ts`)
Gunakan Web API `ReadableStream`:

```typescript
// Contoh implementasi streaming di Next.js App Router
export async function POST(request: Request) {
  // ... validasi, RAG retrieval, dan perakitan prompt ...

  const streamResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openRouterKey}`,
    },
    body: JSON.stringify({
      model: selectedModel,
      messages: openRouterMessages,
      stream: true, // AKTIFKAN MODE STREAMING
      temperature: 0.7,
    }),
  });

  return new Response(streamResponse.body, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
```

### B. Implementasi di Flutter (`lib/screens_v2/ai_chat_screen_v2.dart`)
Gunakan package `http` dengan `request.send()` untuk membaca chunk stream:

```dart
Future<void> _sendMessageStreaming() async {
  final request = http.Request('POST', Uri.parse('$baseUrl/api/ai/chat'));
  request.headers['Content-Type'] = 'application/json';
  request.body = jsonEncode({
    'messages': _messages,
    'model': CacheHelper.getChatModel(),
  });

  final streamedResponse = await request.send();

  // Tambahkan gelembung kosong untuk asisten
  setState(() {
    _messages.add({
      'role': 'assistant',
      'content': '',
      'id': DateTime.now().millisecondsSinceEpoch.toString(),
    });
  });

  final assistantIndex = _messages.length - 1;

  // Baca pecahan data secara real-time
  streamedResponse.stream
      .transform(utf8.decoder)
      .transform(const LineSplitter())
      .listen((line) {
    if (line.startsWith('data: ') && !line.contains('[DONE]')) {
      final jsonStr = line.replaceFirst('data: ', '').trim();
      try {
        final parsed = jsonDecode(jsonStr);
        final token = parsed['choices']?[0]?['delta']?['content'] ?? '';
        if (token.isNotEmpty && mounted) {
          setState(() {
            _messages[assistantIndex]['content'] += token;
          });
          _scrollToBottom();
        }
      } catch (_) {}
    }
  });
}
```

---

## 3. Pemanfaatan Context Caching (Google Gemini)

Jika menggunakan model **Gemini 2.5 Flash**, kita dapat memanfaatkan fitur **Context Caching**:
1. Naskah aturan fiqih MTA (`ai_knowledge_rules`) dan metadata direktori brosur (~15.000 token) di-cache di server Google.
2. Setiap kali ada pertanyaan baru, server hanya menagih token pertanyaan pengguna yang baru, sedangkan 15.000 token aturan lama dikenakan diskon **75%**.
3. Latensi berkurang drastis karena Google tidak perlu memproses ulang aturan dasar sistem dari awal.
