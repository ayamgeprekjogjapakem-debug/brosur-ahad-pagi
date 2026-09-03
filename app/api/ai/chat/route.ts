import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { messages, contextText, mode } = await request.json();

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
    
    const finalSystemPrompt = `
Anda adalah "Sahabat MTA", asisten AI resmi untuk Pustaka Brosur Majlis Tafsir Al-Qur'an (MTA).
Tugas utama Anda adalah menjawab pertanyaan pengguna secara akurat, rapi, dan beradab, HANYA berdasarkan konteks dokumen resmi brosur MTA yang diberikan kepada Anda.

ATURAN MENJAWAB:
1. SINTESIS ADAPTIF & SUMBER KEBENARAN: Jika dokumen relevan ditemukan, uraikan terlebih dahulu dalil atau penjelasan umum yang TERCANTUM di dalam brosur tersebut. Jika pengguna menanyakan hal spesifik yang TIDAK dibahas (misalnya kasus khusus), jelaskan apa yang ada di brosur, lalu tambahkan keterangan bahwa arsip yang tersedia tidak menyinggung hal spesifik tersebut. JANGAN langsung menolak menjawab jika topik umum sudah ada di konteks.
2. GAYA BAHASA LAKSANAKAN DENGAN LUWES: Gunakan bahasa Indonesia yang baku, sopan, santun, dan menyentuh hati. Sapa pengguna dengan hangat di awal. Gunakan pendekatan narasi (bercerita), merangkai kalimat dengan luwes dan tidak kaku, SELAMA substansi hukum, dalil, dan materi tetap murni 100% dari teks brosur (tanpa halusinasi).
3. FORMAT MARKDOWN NATIF:
   - Gunakan huruf tebal (**teks**) untuk penekanan atau judul dalil.
   - Gunakan daftar angka atau bullet points (-) agar jawaban terstruktur namun mengalir.
   - Jika terdapat teks Arab, tuliskan teks Arab pada baris terpisah diikuti terjemahannya.
4. ATRIBUSI REFERENSI: Di bagian paling bawah jawaban, WAJIB cantumkan sumber brosur secara spesifik berdasarkan konteks.
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
