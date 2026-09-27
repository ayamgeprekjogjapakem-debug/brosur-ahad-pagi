# Alur Kerja Sistem AI "Sahabat MTA" (RAG)

Diagram berikut menjelaskan bagaimana arsitektur AI Anda bekerja dari sisi penginputan data (Admin) hingga menghasilkan jawaban akurat untuk pengguna (User).

```mermaid
sequenceDiagram
    autonumber
    
    box rgb(236, 253, 245) Sisi Administrator (Dashboard Data)
    participant Admin
    participant NextJS as Next.js Server
    participant DB as Supabase Database
    end
    
    box rgb(255, 247, 237) Sisi Pengguna (Chat AI)
    participant User
    participant ChatAPI as API Route (/api/ai/chat)
    participant LLM as OpenRouter / Gemini
    end

    %% Fase Ingesti Data (Admin)
    note over Admin, DB: Fase 1: Pemrosesan Data (Oleh Admin di Dashboard)
    Admin->>NextJS: Upload / Edit / Klik "Sinkronisasi AI"
    NextJS->>NextJS: Bersihkan HTML & Pecah Teks jadi Potongan Kecil (Chunks)
    NextJS->>LLM: Ubah setiap Potongan menjadi Vektor (Embedding)
    LLM-->>NextJS: Kembalikan Angka Vektor [0.12, 0.45, ...]
    NextJS->>DB: Simpan Potongan + Metadata + Vektor ke tabel "brosur_chunks"
    
    %% Fase Tanya Jawab (User)
    note over User, LLM: Fase 2: Tanya Jawab (Oleh User di Simulator / Web)
    User->>ChatAPI: Bertanya: "Bagaimana hadits tentang aqiqah?"
    
    ChatAPI->>LLM: Minta Vektor Embedding untuk Pertanyaan
    LLM-->>ChatAPI: Kembalikan Vektor Pertanyaan
    
    ChatAPI->>DB: Cari kemiripan makna semantik (Semantic Search)
    DB-->>ChatAPI: Kembalikan maksimal 3 Potongan Brosur Paling Relevan
    
    note over ChatAPI, LLM: Fase 3: Injeksi Prompt "Sahabat MTA"
    ChatAPI->>LLM: Kirim 3 Potongan Brosur Tadi + Aturan Ketat "Sahabat MTA"
    LLM-->>ChatAPI: Menyusun Jawaban, Menyalin Dalil & Menyebut Sumber (Sesuai Aturan)
    
    ChatAPI-->>User: Tampilkan Jawaban Sempurna ke Layar!
```

### 📋 Ringkasan Penjelasan Alur:

**1. Pemecahan Data (Di Belakang Layar Dashboard Data)**
Ketika Anda menyimpan brosur, sistem tidak lagi menyimpannya sebagai satu teks raksasa berukuran 15.000 karakter. Sistem memecahnya per paragraf (*chunking*). Paragraf yang membahas *Qurban* dipisah dengan paragraf yang membahas *Aqiqah*. Ini membuat *database* Supabase Anda jauh lebih cerdas.

**2. Pencarian Makna (Saat User Bertanya)**
Ketika *user* bertanya *"Hukum anak laki-laki potong domba"*, sistem tidak sekadar mencari kecocokan kata dasar (`indexOf` atau `ilike`), tetapi mencari **makna**. Supabase akan merogoh jutaan paragraf di tabel `brosur_chunks` dan hanya menarik **3 paragraf (maksimal)** yang maknanya paling menjawab pertanyaan itu.

**3. Eksekusi Jawaban Anti-Halusinasi (System Prompt)**
Di sinilah dokumen `sahabat-mta-prompt.md` mengambil alih kontrol secara absolut. AI (Gemini/OpenRouter) **"dikurung"** dan **dipaksa** untuk hanya melihat pada ke-3 paragraf tersebut.
- AI diwajibkan mengawali balasan dengan *"Saudaraku, Guru Daerah..."*
- AI dilarang keras mencomot dalil dari internet.
- AI wajib menyertakan Tahun dan Judul brosur di akhir jawaban.
- **Paling krusial:** Jika 3 paragraf yang ditarik dari *database* ternyata melenceng atau kosong, aturan *System Prompt* akan memaksa AI untuk jujur menjawab, *"Mohon maaf, tidak ada informasi tentang itu di database kami."*
