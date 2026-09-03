import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { messages, wordCount = 100, localContext } = await request.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Format pesan tidak valid' }, { status: 400 });
    }

    const supabase = await createClient();

    // Ambil pengaturan AI
    const { data: settings } = await supabase
      .from('app_settings')
      .select('ai_enabled, openrouter_token, chat_model, system_prompt')
      .eq('id', 1)
      .single();

    if (!settings || !settings.ai_enabled) {
      return NextResponse.json({ error: 'Fitur AI sedang dinonaktifkan.' }, { status: 403 });
    }

    const openRouterKey = settings.openrouter_token || process.env.OPENROUTER_API_KEY;
    if (!openRouterKey) {
      return NextResponse.json({ error: 'API Key AI belum dikonfigurasi.' }, { status: 500 });
    }

    // Buat System Prompt khusus untuk RAG dan aturan kewajiban sumber
    const userDefinedPrompt = settings.system_prompt || 'Gunakan gaya bahasa santun, poin-poin terstruktur, dan huruf tebal untuk menyorot dalil penting.';
    
    const lastMessage = messages[messages.length - 1].content;

    let contextText = localContext || '';

    // Hanya cari ke Supabase (online) jika tidak ada context lokal dari perangkat
    if (!contextText) {
      // FASE 1: Query Rewriting & Spell Check via AI
      const rewritePrompt = `Tugas Anda adalah memperbaiki salah ketik (typo) dan mengekstrak kata kunci utama dari pertanyaan berikut untuk digunakan dalam mesin pencari database.
Aturan:
1. Perbaiki kata yang typo (misal: "aiqah" jadi "aqiqah", "tetnag" jadi "tentang").
2. Buang kata sambung yang tidak penting (seperti "dan", "di", "ke", "yang", "dari", "buatkan", "tolong", dll).
3. Hanya kembalikan kata kunci akhir, dipisahkan dengan spasi. JANGAN tambahkan penjelasan apapun. JANGAN pakai tanda kutip.

Pertanyaan Pengguna: "${lastMessage}"`;

      const rewriteResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openRouterKey}`,
          'HTTP-Referer': 'https://www.ulilalbab.fun',
          'X-Title': 'Ulil Albab Chat AI',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash', // Fast and cheap model for query extraction
          messages: [{ role: 'user', content: rewritePrompt }],
          temperature: 0,
        }),
      });

      let searchQuery = lastMessage; // Fallback
      if (rewriteResponse.ok) {
        const rewriteData = await rewriteResponse.json();
        const extractedQuery = rewriteData.choices?.[0]?.message?.content?.trim();
        if (extractedQuery) {
          searchQuery = extractedQuery.replace(/[\n\r]/g, ' '); // Remove any accidental newlines
        }
      }

      // FASE 2: Pencarian Database Supabase
      const timeoutPromise = new Promise<{data: any, error: any}>((resolve) => 
        setTimeout(() => resolve({ data: null, error: new Error('Timeout mencari brosur') }), 4000)
      );
      const searchPromise = supabase.rpc('search_brosur_ranked', {
        search_query: searchQuery,
        filter_folder_id: null
      });
      
      const { data: searchResults, error: searchError } = await Promise.race([searchPromise, timeoutPromise]);
      
      if (!searchError && searchResults && searchResults.length > 0) {
        contextText = searchResults.slice(0, 5).map((b: any) => {
          const text = b.teks_bersih || b.konten?.replace(/<[^>]+>/g, '') || '';
          return `[Sumber: ${b.judul} (${b.tahun})]\nIsi:\n${text.substring(0, 5000)}\n---`;
        }).join('\n');
      }
    }

    const finalSystemPrompt = `
Kamu adalah asisten kajian dan arsip resmi Brosur MTA. Tugasmu adalah menjawab pertanyaan pengguna secara amanah, teliti, dan berbasis rujukan yang jelas. HANYA berdasarkan konteks dokumen resmi brosur MTA yang diberikan kepada Anda.

ATURAN KETAT MENGENAI DALIL DAN HUKUM IBADAH:
1. KAIDAH FIQIH UTAMA: Dalam urusan ibadah (termasuk pelaksanaan aqiqah, waktu, dan tata caranya), hukum asalnya adalah DILARANG/HARAM kecuali ada dalil yang SHAHIH. 
2. JANGAN PERNAH menggunakan logika "karena tidak ada larangan khusus, maka diperbolehkan". Jika suatu amalan/waktu (seperti aqiqah hari ke-14, ke-21, atau setelah dewasa) hanya bersandar pada hadits DHA'IF atau tidak ada contoh dari Nabi, maka amalan tersebut TIDAK DISYARIATKAN.
3. JIKA HADITS/RIWAYATNYA DHA'IF (LEMAH):
   - Anda WAJIB menolak menjadikannya sebagai landasan hukum.
   - DILARANG KERAS menyarankan, membolehkan, atau memberikan kelonggaran beribadah berdasarkan hadits dha'if tersebut.
   - Contoh Kasus Aqiqah: Jika ditanya aqiqah selain hari ke-7 (misal hari ke-14/21), Anda wajib menjawab: "Hadits riwayat Baihaqi mengenai pelaksanaan hari ke-14 atau ke-21 adalah dha'if (lemah). Oleh karena itu, hal tersebut tidak disyariatkan dan tidak bisa dijadikan hujjah/dalil untuk melakukan aqiqah selain di hari ke-7."
4. JIKA TIDAK DITEMUKAN DALIL:
   - Nyatakan secara tegas: "Belum ditemukan dalil yang shahih yang mendasari hal tersebut dalam arsip rujukan. Karena tidak ada dalil shahih, maka amalan tersebut tidak disyariatkan."
5. URUTAN PENYAJIAN JAWABAN:
   - Sapaan hangat: "Saudaraku, Guru Daerah yang dirahmati Allah."
   - Tegaskan hukum dan kedudukan haditsnya sejak awal kalimat.
   - Jelaskan dalil yang SHAHIH dan MUTTAFAQ 'ALAIH (sertakan teks Arab berharakat, arti, dan rawi riwayatnya).
   - Jawaban harus komprehensif, mendalam, dan dijabarkan dengan panjang MINIMAL ${wordCount} KATA.
   - Cantumkan rujukan brosur secara spesifik di bagian paling bawah.
   Format Wajib:
   **Rujukan Brosur:**
   - [Judul Brosur], Brosur Tahun [Tahun]

INSTRUKSI TAMBAHAN DARI PENGGUNA:
${userDefinedPrompt}

=== KONTEKS BROSUR ===
${contextText || '(Tidak ada konteks yang ditemukan untuk pertanyaan ini. Beritahu user bahwa materi tidak ditemukan di arsip.)'}
=== AKHIR KONTEKS ===
`;

    // Batasi riwayat obrolan maksimal 5 pesan terakhir (Context Pruning)
    const limitedHistory = messages.slice(-5);

    // Siapkan pesan untuk dikirim ke OpenRouter
    const apiMessages = [
      { role: 'system', content: finalSystemPrompt },
      ...limitedHistory
    ];

    const selectedModel = settings.chat_model || 'openai/gpt-3.5-turbo';

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openRouterKey}`,
        'HTTP-Referer': 'https://www.ulilalbab.fun',
        'X-Title': 'Ulil Albab Chat AI',
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: apiMessages,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error?.message || 'Gagal menghubungi server AI.' },
        { status: response.status }
      );
    }

    return NextResponse.json({ 
      success: true, 
      text: data.choices?.[0]?.message?.content || ''
    });

  } catch (error: any) {
    console.error('API /api/ai/chat Error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan internal pada server' },
      { status: 500 }
    );
  }
}
