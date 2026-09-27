import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as cheerio from 'cheerio';

// Supabase Setup
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);


// Fungsi pemotong teks cerdas (Chunking dengan Overlap)
function chunkText(text: string, maxWords: number = 300, overlapWords: number = 50): string[] {
  const words = text.split(/\s+/);
  const chunks = [];
  
  if (words.length === 0) return [];
  
  for (let i = 0; i < words.length; i += (maxWords - overlapWords)) {
    const chunkWords = words.slice(i, i + maxWords);
    chunks.push(chunkWords.join(' '));
  }
  return chunks;
}

export async function POST(req: Request) {
  try {
    // === 1. LOAD SETTINGS ===
    const { data: settings } = await supabase.from('app_settings').select('*').eq('id', 1).single();
    const chatModel = settings?.chat_model || 'google/gemini-2.5-flash';
    const isGoogleNative = chatModel.endsWith('-native');
    const googleToken = settings?.google_ai_token || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
    const openrouterToken = settings?.openrouter_token || '';

    // Dynamic function to get embedding based on settings
    const getEmbedding = async (text: string): Promise<number[]> => {
       if (isGoogleNative) {
           if (!googleToken) throw new Error("Google AI Token tidak ditemukan di pengaturan.");
           const genAI = new GoogleGenerativeAI(googleToken);
           const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
           const result = await model.embedContent(text);
           return result.embedding.values;
       } else {
           if (!openrouterToken) throw new Error("OpenRouter Token tidak ditemukan di pengaturan.");
           // Menggunakan OpenRouter dengan model OpenAI (karena mendukung parameter dimensions: 768)
           const res = await fetch('https://openrouter.ai/api/v1/embeddings', {
              method: 'POST',
              headers: {
                 'Authorization': `Bearer ${openrouterToken}`,
                 'Content-Type': 'application/json',
                 'HTTP-Referer': 'http://localhost:3000',
                 'X-Title': 'Pustaka MTA'
              },
              body: JSON.stringify({
                 model: 'openai/text-embedding-3-small',
                 input: text,
                 dimensions: 768
              })
           });
           if (!res.ok) {
              const err = await res.json().catch(() => ({}));
              throw new Error(`OpenRouter Embedding Error: ${err.error?.message || res.statusText}`);
           }
           const data = await res.json();
           return data.data[0].embedding;
       }
    };

    const { brosurId } = await req.json().catch(() => ({ brosurId: null })); // opsional
    
    // 1. Ambil ID brosur yang SUDAH di-sinkronisasi (agar tidak diproses ulang)
    const { data: existingChunks } = await supabase.from('brosur_chunks').select('brosur_id');
    const syncedIds = Array.from(new Set(existingChunks?.map(c => c.brosur_id) || []));
    
    // 2. Ambil data brosur yang BELUM di-sinkronisasi dan memiliki konten
    let query = supabase.from('brosur').select('*')
      .not('konten', 'is', null)
      .neq('konten', '');
      
    if (brosurId) {
       query = query.eq('id', brosurId);
    } else {
       if (syncedIds.length > 0) {
           query = query.not('id', 'in', `(${syncedIds.join(',')})`);
       }
       // Ambil beberapa saja agar tidak timeout saat uji coba (batching 5 sekaligus)
       query = query.limit(5).order('created_at', { ascending: false });
    }
    
    const { data: brosurs, error: fetchError } = await query;
    if (fetchError) throw fetchError;
    if (!brosurs || brosurs.length === 0) {
        return NextResponse.json({ success: true, message: "Tidak ada brosur untuk diproses." });
    }
    
    const processedBrosurs = [];
    const insertErrors: any[] = [];
    let totalChunksInserted = 0;

    // 2. Looping setiap brosur
    for (const b of brosurs) {
       // Bersihkan chunk lama agar tidak dobel
       await supabase.from('brosur_chunks').delete().eq('brosur_id', b.id);
       
       // Bersihkan HTML menjadi Teks Murni menggunakan Cheerio
       const $ = cheerio.load(b.konten || '');
       const plainText = $.text().replace(/\n+/g, '\n').trim();
       
       if (!plainText) continue;

       // Potong teks (Chunking) dengan overlap agar tidak hilang konteks
       const chunks = chunkText(plainText, 300, 50); // ~300 kata, 50 kata bertumpuk
       
       // 3. Proses Vektor via Gemini
       for (let i = 0; i < chunks.length; i++) {
          const chunkContent = chunks[i];
          
          try {
              // Panggil API Embedding dinamis (Google atau OpenRouter)
              let embedding: number[];
              try {
                  embedding = await getEmbedding(chunkContent);
              } catch (e) {
                  console.error("Error generating embedding:", e);
                  throw e; // Lemparkan error agar ditangkap oleh catch block di luar
              }
              
              // Simpan ke Supabase (tabel brosur_chunks)
              const { data: insertedData, error: insertError } = await supabase.from('brosur_chunks').insert({
                 brosur_id: b.id,
                 judul_brosur: b.judul,
                 tahun: b.tahun,
                 nomor: b.nomor,
                 tanggal: b.tanggal,
                 content: chunkContent,
                 metadata: { chunk_index: i, total_chunks: chunks.length },
                 embedding: embedding
              }).select();

              if (insertError || !insertedData || insertedData.length === 0) {
                 const errStr = insertError ? insertError.message : "Silent fail (mungkin RLS memblokir SELECT/INSERT atau dimensi vektor tidak cocok)";
                 console.error(`Gagal menyimpan chunk ${i} untuk brosur ${b.id}:`, errStr);
                 insertErrors.push({ chunk: i, brosur_id: b.id, error: errStr });
              }
          } catch (embedError: any) {
              console.error(`Gagal membuat embedding chunk ${i}:`, embedError);
              insertErrors.push({ type: 'embed', chunk: i, brosur_id: b.id, error: embedError.message || embedError });
          }
       }
       
       totalChunksInserted += chunks.length;
       processedBrosurs.push(b.id);
    }

    return NextResponse.json({ 
       success: true, 
       message: `Berhasil memproses ${processedBrosurs.length} brosur menjadi potongan Vektor.`,
       brosur_ids: processedBrosurs,
       total_chunks: totalChunksInserted,
       errors: insertErrors
    });
    
  } catch (error: any) {
    console.error('Vector Gen Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
