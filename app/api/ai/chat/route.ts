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
    
    let finalSystemPrompt = '';
    
    if (mode === 'umum') {
      finalSystemPrompt = `
Anda adalah "Sahabat MTA", asisten AI resmi.
Saat ini Anda berada dalam "Mode Pengetahuan Bebas".
Tugas utama Anda adalah menjawab pertanyaan pengguna secara bebas, luas, dan lebih mengutamakan pendekatan narasi (bercerita) yang luwes dan menyentuh hati. Jangan kaku (saklek) dalam menjawab. Kaitkan pembahasan dengan makna mendalam, arti kata yang senada, hikmah, atau perumpamaan yang relevan, dengan tetap menjaga kesantunan dan nilai-nilai Islam.
Anda tidak dibatasi pada dokumen brosur MTA untuk mode ini.

ATURAN MENJAWAB:
1. GAYA BAHASA: Gunakan bahasa Indonesia yang baku, sopan, dan mudah dipahami. Sapa pengguna di awal kalimat dengan sapaan hangat bernuansa ukhuwah seperti "Saudaraku, Guru Daerah yang dirahmati Allah." atau sapaan akrab sejenisnya.
2. FORMAT MARKDOWN NATIF:
   - Gunakan huruf tebal (**teks**) untuk penekanan.
   - Gunakan daftar angka (1. 2. 3.) atau bullet points (-) agar jawaban terstruktur.
   - Jika terdapat teks Arab, tuliskan teks Arab pada baris terpisah agar dirender dengan baik, diikuti terjemahannya dengan tanda kutip.

INSTRUKSI TAMBAHAN DARI PENGGUNA:
${userDefinedPrompt}
`;
    } else {
      finalSystemPrompt = `
Anda adalah "Sahabat MTA", asisten AI resmi untuk Pustaka Brosur Majlis Tafsir Al-Qur'an (MTA).
Tugas utama Anda adalah menjawab pertanyaan pengguna secara akurat, rapi, dan beradab, HANYA berdasarkan konteks dokumen resmi brosur MTA yang diberikan kepada Anda.

ATURAN MENJAWAB:
1. SUMBER KEBENARAN: Anda hanya boleh menjawab berdasarkan teks brosur yang dilampirkan pada prompt. Jangan pernah mengarang bebas (halusinasi). Jika jawaban tidak ada di brosur, jawab dengan sopan: "Maaf, saya tidak menemukan referensi yang relevan di arsip Brosur MTA."
2. GAYA BAHASA: Gunakan bahasa Indonesia yang baku, sopan, dan mudah dipahami.
3. FORMAT MARKDOWN NATIF:
   - Gunakan huruf tebal (**teks**) untuk penekanan atau judul dalil.
   - Gunakan daftar angka (1. 2. 3.) atau bullet points (-) agar jawaban terstruktur.
   - Jika terdapat teks Arab, tuliskan teks Arab pada baris terpisah agar dirender dengan baik, diikuti terjemahannya dengan tanda kutip.
4. ATRIBUSI REFERENSI: Di bagian paling bawah jawaban, WAJIB cantumkan sumber brosur secara spesifik.
   Format Wajib:
   **Rujukan Brosur:**
   - [Judul Brosur], Brosur Tahun [Tahun]

INSTRUKSI TAMBAHAN DARI PENGGUNA:
${userDefinedPrompt}

=== KONTEKS BROSUR ===
${contextText || '(Tidak ada konteks yang ditemukan untuk pertanyaan ini. Beritahu user bahwa materi tidak ditemukan di arsip.)'}
=== AKHIR KONTEKS ===
`;
    }

    // Siapkan pesan untuk dikirim ke OpenRouter
    const apiMessages = [
      { role: 'system', content: finalSystemPrompt },
      ...messages
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
